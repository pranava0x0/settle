"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";

/**
 * Turn result texts on or off for the signed-in user.
 *
 * `sms_opt_out` is the only notification column the browser may write; the
 * feature flag and the outbox are service-role only (migration 00008).
 */
export async function setSmsOptOut(optOut: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to change this." };
  }

  // `select()` so the write reports rows-affected: an RLS refusal returns zero
  // rows and no error, and silently telling someone their opt-out saved when it
  // did not is the worst possible failure for this particular switch.
  const { data, error } = await supabase
    .from("users")
    .update({ sms_opt_out: optOut })
    .eq("id", user.id)
    .select("id");

  if (error) {
    console.error("setSmsOptOut error:", error.message);
    return { error: "Couldn't save that. Please try again." };
  }

  if (!data || data.length === 0) {
    console.error(
      `setSmsOptOut: UPDATE affected 0 rows for ${user.id}. The preference was NOT saved.`,
    );
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath(ROUTES.DASHBOARD);
  return { success: true };
}
