"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { phoneSchema, otpSchema, displayNameSchema } from "@/lib/validations";

export async function sendOtp(phone: string) {
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data,
  });

  if (error) {
    console.error("sendOtp error:", error.message, error.status);
    // Twilio trial accounts can only send to verified numbers
    if (
      error.message?.includes("unverified") ||
      error.message?.includes("verify") ||
      error.status === 500
    ) {
      return {
        error:
          "Unable to send SMS to this number. The service may be temporarily unavailable — please try again later.",
      };
    }
    return { error: "Failed to send verification code. Please try again." };
  }

  return { success: true };
}

export async function verifyOtp(phone: string, token: string) {
  const phoneParsed = phoneSchema.safeParse(phone);
  if (!phoneParsed.success) {
    return { error: phoneParsed.error.issues[0].message };
  }

  const tokenParsed = otpSchema.safeParse(token);
  if (!tokenParsed.success) {
    return { error: tokenParsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneParsed.data,
    token: tokenParsed.data,
    type: "sms",
  });

  if (error) {
    console.error("verifyOtp error:", error.message);
    return { error: "Invalid code. Please try again." };
  }

  return { success: true };
}

export async function updateDisplayName(name: string) {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("users")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) {
    console.error("updateDisplayName error:", error.message);
    return { error: "Failed to update name. Please try again." };
  }

  return { success: true };
}

/**
 * Upgrade an anonymous user by verifying a phone number via OTP.
 *
 * Two cases:
 * 1. Phone is new → link phone to the anonymous account, update display name.
 * 2. Phone already has an account → merge: reassign votes from anonymous user
 *    to the existing account, update display name, delete anonymous user,
 *    sign in as the existing user.
 */
export async function upgradeAnonymousUser(
  phone: string,
  token: string,
  displayName?: string,
) {
  const phoneParsed = phoneSchema.safeParse(phone);
  if (!phoneParsed.success) {
    return { error: phoneParsed.error.issues[0].message };
  }

  const tokenParsed = otpSchema.safeParse(token);
  if (!tokenParsed.success) {
    return { error: tokenParsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Get the current anonymous user ID before OTP verification changes the session
  const {
    data: { user: anonUser },
  } = await supabase.auth.getUser();

  if (!anonUser) {
    return { error: "Not authenticated." };
  }

  if (!anonUser.is_anonymous) {
    return { error: "Account is already verified." };
  }

  const anonUserId = anonUser.id;

  // 2. Verify OTP — this signs in as the phone user (existing or newly created)
  const { error: otpError } = await supabase.auth.verifyOtp({
    phone: phoneParsed.data,
    token: tokenParsed.data,
    type: "sms",
  });

  if (otpError) {
    console.error("upgradeAnonymousUser OTP error:", otpError.message);
    return { error: "Invalid code. Please try again." };
  }

  // 3. Get the now-authenticated phone user
  const {
    data: { user: phoneUser },
  } = await supabase.auth.getUser();

  if (!phoneUser) {
    return { error: "Verification failed. Please try again." };
  }

  const phoneUserId = phoneUser.id;
  const admin = createAdminClient();

  // 4. Merge votes from anonymous user to phone user
  if (anonUserId !== phoneUserId) {
    // Phone user already existed — need to merge

    // Check for vote conflicts (same dispute voted on by both anonymous + phone user)
    // In that case, keep the phone user's vote and discard the anonymous one
    const { data: anonVotes } = await admin
      .from("votes")
      .select("id, dispute_id")
      .eq("user_id", anonUserId);

    if (anonVotes && anonVotes.length > 0) {
      const { data: phoneVotes } = await admin
        .from("votes")
        .select("dispute_id")
        .eq("user_id", phoneUserId);

      const phoneDisputeIds = new Set(
        (phoneVotes ?? []).map((v) => v.dispute_id),
      );

      // Separate: votes to move vs. votes to discard (conflicts)
      const votesToMove = anonVotes.filter(
        (v) => !phoneDisputeIds.has(v.dispute_id),
      );
      const votesToDiscard = anonVotes.filter((v) =>
        phoneDisputeIds.has(v.dispute_id),
      );

      // Move non-conflicting votes
      if (votesToMove.length > 0) {
        const { error: moveError } = await admin
          .from("votes")
          .update({ user_id: phoneUserId })
          .in(
            "id",
            votesToMove.map((v) => v.id),
          );

        if (moveError) {
          console.error("upgradeAnonymousUser vote move error:", moveError.message);
        }
      }

      // Delete conflicting votes (phone user's vote takes precedence)
      if (votesToDiscard.length > 0) {
        await admin
          .from("votes")
          .delete()
          .in(
            "id",
            votesToDiscard.map((v) => v.id),
          );
      }
    }

    // Delete anonymous user profile
    await admin.from("users").delete().eq("id", anonUserId);

    // Delete anonymous auth user
    await admin.auth.admin.deleteUser(anonUserId);
  } else {
    // Same user ID — phone was linked to the anonymous account
    // Update the users table with the phone
    await admin
      .from("users")
      .update({ phone: phoneParsed.data })
      .eq("id", phoneUserId);
  }

  // 5. Update display name on the phone user if provided
  if (displayName?.trim()) {
    const nameParsed = displayNameSchema.safeParse(displayName);
    if (nameParsed.success) {
      await admin
        .from("users")
        .update({ display_name: nameParsed.data })
        .eq("id", phoneUserId);
    }
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
