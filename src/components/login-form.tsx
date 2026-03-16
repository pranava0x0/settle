"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendOtp, verifyOtp, updateDisplayName } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/constants";

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const isVoteRedirect = redirectTo.startsWith("/s/");

  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitting = useRef(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await sendOtp(phone);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep("otp");
  };

  const handleVerifyOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (loading || autoSubmitting.current) return;
      autoSubmitting.current = true;
      setError("");
      setLoading(true);

      const result = await verifyOtp(phone, otp);
      setLoading(false);
      autoSubmitting.current = false;

      if (result.error) {
        setError(result.error);
        return;
      }

      if (isVoteRedirect) {
        setStep("name");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    },
    [phone, otp, loading, redirectTo, router, isVoteRedirect],
  );

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await updateDisplayName(displayName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleSkipName = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleOtpChange = (value: string) => {
    // Strip non-numeric characters
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);

    // Auto-submit when 6 digits are entered
    if (digits.length === 6 && !autoSubmitting.current) {
      // Use setTimeout to let React update state before submitting
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 0);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{APP_NAME}</CardTitle>
          <CardDescription>
            {step === "phone"
              ? isVoteRedirect
                ? "Enter your number to cast your vote"
                : "Drop your number to jump in"
              : step === "otp"
                ? "Enter the 6-digit code we just texted you"
                : "So people know who voted (optional)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send me a code"}
              </Button>
            </form>
          ) : step === "otp" ? (
            <form ref={formRef} onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Your code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="text-center text-2xl tracking-[0.3em] font-mono"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking..." : "Let me in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
              >
                Use a different number
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">What should we call you?</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your first name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !displayName.trim()}
              >
                {loading ? "Saving..." : "Save & vote"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSkipName}
              >
                Skip
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
