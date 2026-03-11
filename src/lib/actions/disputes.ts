"use server";

import { createClient } from "@/lib/supabase/server";
import { createDisputeSchema } from "@/lib/validations";
import { generateSlug, getExpiresAt, isExpired } from "@/lib/utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import type { CreateDisputeInput } from "@/lib/validations";

export async function createDispute(input: CreateDisputeInput) {
  const parsed = createDisputeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to create a dispute." };
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
    console.error("createDispute error:", error.message);
    return { error: "Failed to create dispute. Please try again." };
  }

  redirect(ROUTES.DISPUTE(slug));
}

export async function closeDispute(disputeId: string) {
  const supabase = await createClient();

  // Get the dispute
  const { data: dispute, error: fetchError } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (fetchError || !dispute) {
    console.error("closeDispute fetch error:", fetchError?.message);
    return;
  }

  if (dispute.status !== "open" || !isExpired(dispute.expires_at)) {
    return;
  }

  // Count votes for each side
  const { count: countA } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
    .eq("side", "a");

  const { count: countB } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
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
    .eq("id", disputeId);

  if (updateError) {
    console.error("closeDispute update error:", updateError.message);
  }

  revalidatePath(`/s/${dispute.slug}`);
}
