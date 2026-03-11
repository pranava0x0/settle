import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "Settle — vote now";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, question, side_a, side_b, status")
    .eq("slug", slug)
    .single();

  if (!dispute) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Settle
        </div>
      ),
      { ...size },
    );
  }

  const [{ count: voteCountA }, { count: voteCountB }] = await Promise.all([
    supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", dispute.id)
      .eq("side", "a"),
    supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", dispute.id)
      .eq("side", "b"),
  ]);

  const totalVotes = (voteCountA ?? 0) + (voteCountB ?? 0);
  const isSettled = dispute.status !== "open";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          color: "#fafafa",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Settle
          </div>
          <div
            style={{
              fontSize: 16,
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: isSettled ? "#27272a" : "#22c55e",
              color: isSettled ? "#a1a1aa" : "#000",
              fontWeight: 600,
            }}
          >
            {isSettled ? "Settled" : "Live"}
          </div>
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "auto",
            maxWidth: "900px",
          }}
        >
          {dispute.question}
        </div>

        {/* Sides + votes */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ fontSize: 18, color: "#a1a1aa" }}>
              {dispute.side_a}
            </div>
            <div style={{ fontSize: 40, fontWeight: 700 }}>
              {voteCountA ?? 0}
            </div>
          </div>

          <div
            style={{
              fontSize: 28,
              color: "#52525b",
              fontWeight: 600,
              paddingBottom: "8px",
            }}
          >
            vs
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ fontSize: 18, color: "#a1a1aa" }}>
              {dispute.side_b}
            </div>
            <div style={{ fontSize: 40, fontWeight: 700 }}>
              {voteCountB ?? 0}
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              fontSize: 18,
              color: "#71717a",
            }}
          >
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
