"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSquabbleSchema } from "@/lib/validations";
import { generateSlug, getExpiresAt, isExpired } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import type { CreateSquabbleInput } from "@/lib/validations";

export async function createSquabble(input: CreateSquabbleInput) {
  const parsed = createSquabbleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to start a squabble." };
  }

  const slug = generateSlug();
  const expiresAt = getExpiresAt(parsed.data.duration_minutes);

  const { error } = await supabase.from("disputes").insert({
    slug,
    creator_id: user.id,
    question: parsed.data.question,
    side_a: parsed.data.side_a,
    side_b: parsed.data.side_b,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("createSquabble error:", error.message);
    return { error: "Failed to create squabble. Please try again." };
  }

  redirect(ROUTES.SQUABBLE(slug));
}

export type CloseSquabbleResult = {
  status: "open" | "closed" | "expired";
  winner_side: "a" | "b" | null;
};

/**
 * Lazy close: write the outcome for an expired squabble.
 *
 * Returns the resulting status so callers can apply it to the row they already
 * hold. They must NOT re-`select()` the same row to see the change: within one
 * render pass Next.js memoizes identical GET fetches, so the second read can
 * hand back the pre-update payload. That is how a closed squabble ended up
 * rendering under "Live now" wearing a "Closed" badge.
 *
 * Returns null when nothing was written (not expired, already closed, or the
 * write was refused).
 */
export async function closeSquabble(
  squabbleId: string,
): Promise<CloseSquabbleResult | null> {
  // Use admin client to bypass RLS — lazy close can be triggered by any visitor,
  // not just the creator, so the anon client's "creator can update" policy blocks it.
  // Fall back to regular client if service role key isn't configured (e.g. local dev).
  let db;
  try {
    db = createAdminClient();
  } catch {
    db = await createClient();
  }

  // Get the squabble
  const { data: squabble, error: fetchError } = await db
    .from("disputes")
    .select("*")
    .eq("id", squabbleId)
    .single();

  if (fetchError || !squabble) {
    console.error("closeSquabble fetch error:", fetchError?.message);
    return null;
  }

  if (squabble.status !== "open" || !isExpired(squabble.expires_at)) {
    return null;
  }

  // Count votes for each side
  const { count: countA } = await db
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabbleId)
    .eq("side", "a");

  const { count: countB } = await db
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabbleId)
    .eq("side", "b");

  const votesA = countA ?? 0;
  const votesB = countB ?? 0;

  let status: "closed" | "expired";
  let winnerSide: "a" | "b" | null = null;

  if (votesA === 0 && votesB === 0) {
    // No votes — expired
    status = "expired";
  } else if (votesA === votesB) {
    // Tie — no winner
    status = "expired";
  } else {
    // Majority wins
    status = "closed";
    winnerSide = votesA > votesB ? "a" : "b";
  }

  // `select()` so the write reports rows-affected. An RLS policy that refuses
  // this UPDATE returns 0 rows and NO error — without this check the caller
  // would carry on believing the squabble was closed (ISSUE-021).
  const { data: updated, error: updateError } = await db
    .from("disputes")
    .update({
      status,
      winner_side: winnerSide,
      closed_at: new Date().toISOString(),
    })
    .eq("id", squabbleId)
    .select("id, status, winner_side");

  if (updateError) {
    console.error("closeSquabble update error:", updateError.message);
    return null;
  }

  if (!updated || updated.length === 0) {
    console.error(
      `closeSquabble: UPDATE affected 0 rows for ${squabbleId}. The squabble is ` +
        "still marked open. Most likely an RLS policy refused the write and the " +
        "service role key is unavailable — check SUPABASE_SERVICE_ROLE_KEY.",
    );
    return null;
  }

  return { status, winner_side: winnerSide };
}

export async function createRematch(originalSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to start a rematch." };
  }

  const { data: original, error: fetchError } = await supabase
    .from("disputes")
    .select("question, side_a, side_b, expires_at, created_at, creator_id")
    .eq("slug", originalSlug)
    .single();

  if (fetchError || !original) {
    return { error: "Original squabble not found." };
  }

  if (original.creator_id !== user.id) {
    return { error: "Only the creator can start a rematch." };
  }

  // Infer original duration from timestamps
  const originalDuration = Math.round(
    (new Date(original.expires_at).getTime() - new Date(original.created_at).getTime()) / (60 * 1000),
  );
  const durationMinutes = Math.max(1, Math.min(10080, originalDuration));

  const slug = generateSlug();
  const expiresAt = getExpiresAt(durationMinutes);

  const { error } = await supabase.from("disputes").insert({
    slug,
    creator_id: user.id,
    question: original.question,
    side_a: original.side_b, // Swapped
    side_b: original.side_a, // Swapped
    expires_at: expiresAt,
  });

  if (error) {
    console.error("createRematch error:", error.message);
    return { error: "Failed to create rematch. Please try again." };
  }

  redirect(ROUTES.SQUABBLE(slug));
}
