import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  countUnreadableProfiles,
  resolveVoterLabels,
  type RawVoter,
} from "@/lib/voter-identity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const supabase = await createClient();

  const { data: squabble } = await supabase
    .from("disputes")
    .select("id, question, side_a, side_b, status, winner_side")
    .eq("slug", slug)
    .single();

  if (!squabble) {
    return new Response("Not found", { status: 404 });
  }

  const { count: voteCountA } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabble.id)
    .eq("side", "a");

  const { count: voteCountB } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabble.id)
    .eq("side", "b");

  // Voter names resolve through the same chain as the page — display_name ->
  // masked phone -> stable "Anonymous #N". Rendering a bare "Anonymous" here
  // would reintroduce the exact bug lib/voter-identity.ts exists to prevent,
  // in the one artefact that gets screenshotted into a group chat.
  // Phone is revoked from anon/authenticated (migration 00005), so the masked
  // fallback needs the admin client; masking stays server-side.
  let voterClient = supabase;
  let canReadPhone = true;
  try {
    voterClient = createAdminClient();
  } catch (adminError) {
    canReadPhone = false;
    console.error(
      "Result image: admin client unavailable, falling back to names only.",
      adminError,
    );
  }

  const { data: voteRows, error: votersError } = await voterClient
    .from("votes")
    .select(
      canReadPhone
        ? "side, created_at, users(display_name, phone)"
        : "side, created_at, users(display_name)",
    )
    .eq("dispute_id", squabble.id)
    .order("created_at", { ascending: true });

  if (votersError) {
    console.error(
      `Result image voter query failed for ${slug}:`,
      votersError.message,
    );
  }

  const rawVoters: RawVoter[] = (voteRows ?? []).map((v) => {
    const userRecord = v.users as unknown as {
      display_name: string | null;
      phone?: string | null;
    } | null;
    return {
      side: v.side as "a" | "b",
      display_name: userRecord?.display_name ?? null,
      phone: userRecord?.phone ?? null,
      voted_at: v.created_at,
      // A null embed is a refused read, not a nameless voter.
      profile_readable: userRecord !== null,
    };
  });

  const unreadable = countUnreadableProfiles(rawVoters);
  if (unreadable > 0) {
    console.error(
      `Result image for ${slug}: ${unreadable}/${rawVoters.length} profile rows ` +
        "were unreadable, so those voters fall back to \"Anonymous #N\" " +
        "regardless of whether they have a name. This is a permissions " +
        "failure, not anonymity. Check migration 00002 and " +
        "SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const labeled = resolveVoterLabels(rawVoters);
  const sideAVoters = labeled.filter((v) => v.side === "a").map((v) => v.label);
  const sideBVoters = labeled.filter((v) => v.side === "b").map((v) => v.label);

  const a = voteCountA ?? 0;
  const b = voteCountB ?? 0;
  const total = a + b;
  const percentA = total > 0 ? Math.round((a / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((b / total) * 100) : 0;

  const isStory = format === "story";
  const width = isStory ? 1080 : 1200;
  const height = isStory ? 1920 : 630;

  const winnerName =
    squabble.winner_side === "a"
      ? squabble.side_a
      : squabble.winner_side === "b"
        ? squabble.side_b
        : null;

  const formatNames = (names: string[]) => {
    const shown = names.slice(0, 5).join(", ");
    return names.length > 5 ? `${shown} +${names.length - 5} more` : shown;
  };

  // Satori throws on any <div> with more than one child that lacks an explicit
  // display. Every text line below is precomputed into a SINGLE string child
  // rather than interpolated inline — adding `display: flex` instead would make
  // each text node its own flex item and drop the spaces between them.
  const winnerLine = winnerName
    ? `${winnerName} wins — ${Math.max(a, b)} to ${Math.min(a, b)}`
    : null;
  const totalLine = `${total} ${total === 1 ? "person voted" : "people voted"}`;
  const tallyA = `${a} (${percentA}%)`;
  const tallyB = `${b} (${percentB}%)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: isStory ? "120px 60px" : "40px 60px",
        }}
      >
        {/* Watermark */}
        <div
          style={{
            fontSize: isStory ? 28 : 16,
            opacity: 0.6,
            marginBottom: isStory ? 60 : 20,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
          }}
        >
          SQUABBLE
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: isStory ? 56 : 36,
            fontWeight: 700,
            textAlign: "center" as const,
            marginBottom: isStory ? 80 : 30,
            maxWidth: "90%",
          }}
        >
          {squabble.question}
        </div>

        {/* Winner callout */}
        {winnerLine && (
          <div
            style={{
              fontSize: isStory ? 40 : 24,
              fontWeight: 600,
              marginBottom: isStory ? 60 : 20,
              background: "rgba(255,255,255,0.15)",
              padding: isStory ? "20px 40px" : "10px 24px",
              borderRadius: 12,
            }}
          >
            {winnerLine}
          </div>
        )}

        {/* Vote bars */}
        <div
          style={{
            width: "80%",
            display: "flex",
            flexDirection: "column",
            gap: isStory ? 30 : 16,
          }}
        >
          {/* Side A */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: isStory ? 28 : 18,
              }}
            >
              <span>{squabble.side_a}</span>
              <span>{tallyA}</span>
            </div>
            <div
              style={{
                width: "100%",
                height: isStory ? 24 : 16,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${percentA}%`,
                  height: "100%",
                  background: "#3b82f6",
                  borderRadius: 12,
                }}
              />
            </div>
            {isStory && sideAVoters.length > 0 && (
              <div style={{ fontSize: 22, opacity: 0.7 }}>
                {formatNames(sideAVoters)}
              </div>
            )}
          </div>

          {/* Side B */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: isStory ? 28 : 18,
              }}
            >
              <span>{squabble.side_b}</span>
              <span>{tallyB}</span>
            </div>
            <div
              style={{
                width: "100%",
                height: isStory ? 24 : 16,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${percentB}%`,
                  height: "100%",
                  background: "#f59e0b",
                  borderRadius: 12,
                }}
              />
            </div>
            {isStory && sideBVoters.length > 0 && (
              <div style={{ fontSize: 22, opacity: 0.7 }}>
                {formatNames(sideBVoters)}
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        <div
          style={{
            fontSize: isStory ? 24 : 14,
            opacity: 0.5,
            marginTop: isStory ? 60 : 20,
          }}
        >
          {totalLine}
        </div>
      </div>
    ),
    { width, height },
  );
}
