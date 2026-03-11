"use server";

import { createClient } from "@/lib/supabase/server";
import { castVoteSchema } from "@/lib/validations";
import { isExpired } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { CastVoteInput } from "@/lib/validations";

export async function castVote(input: CastVoteInput) {
  const parsed = castVoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to vote." };
  }

  // Fetch the squabble to validate it's still open
  const { data: squabble, error: fetchError } = await supabase
    .from("disputes")
    .select("id, slug, status, expires_at")
    .eq("id", parsed.data.squabble_id)
    .single();

  if (fetchError || !squabble) {
    return { error: "Squabble not found." };
  }

  if (squabble.status !== "open") {
    return { error: "This squabble is no longer accepting votes." };
  }

  if (isExpired(squabble.expires_at)) {
    return { error: "Voting time has expired." };
  }

  // Insert vote (unique constraint prevents duplicate votes)
  const { error: voteError } = await supabase.from("votes").insert({
    dispute_id: parsed.data.squabble_id,
    user_id: user.id,
    side: parsed.data.side,
  });

  if (voteError) {
    if (voteError.code === "23505") {
      return { error: "You've already voted on this squabble." };
    }
    console.error("castVote error:", voteError.message);
    return { error: "Failed to cast vote. Please try again." };
  }

  revalidatePath(`/s/${squabble.slug}`);
  return { success: true };
}
