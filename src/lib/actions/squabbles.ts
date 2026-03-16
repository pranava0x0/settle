"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function closeSquabble(squabbleId: string) {
  const supabase = await createClient();

  // Get the squabble
  const { data: squabble, error: fetchError } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", squabbleId)
    .single();

  if (fetchError || !squabble) {
    console.error("closeSquabble fetch error:", fetchError?.message);
    return;
  }

  if (squabble.status !== "open" || !isExpired(squabble.expires_at)) {
    return;
  }

  // Count votes for each side
  const { count: countA } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabbleId)
    .eq("side", "a");

  const { count: countB } = await supabase
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

  const { error: updateError } = await supabase
    .from("disputes")
    .update({
      status,
      winner_side: winnerSide,
      closed_at: new Date().toISOString(),
    })
    .eq("id", squabbleId);

  if (updateError) {
    console.error("closeSquabble update error:", updateError.message);
  }
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
    .select("question, side_a, side_b, expires_at, created_at")
    .eq("slug", originalSlug)
    .single();

  if (fetchError || !original) {
    return { error: "Original squabble not found." };
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
