"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { phoneSchema, otpSchema } from "@/lib/validations";

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
    console.error("sendOtp error:", error.message);
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
