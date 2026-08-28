"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDisplayName, sendOtp, upgradeAnonymousUser } from "@/lib/actions/auth";

type PostVotePromptProps = {
  onDone: () => void;
};

export const PostVotePrompt = ({ onDone }: PostVotePromptProps) => {
  const [displayName, setDisplayName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitting = useRef(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setNameError("");
    setNameLoading(true);

    const result = await updateDisplayName(displayName.trim());
    setNameLoading(false);

    if (result.error) {
      setNameError(result.error);
      return;
    }

    setNameSaved(true);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    setPhoneLoading(true);

    const result = await sendOtp(phone);
    setPhoneLoading(false);

    if (result.error) {
      setPhoneError(result.error);
      return;
    }

    setPhoneStep("otp");
  };

  const handleVerifyOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (phoneLoading || autoSubmitting.current) return;
      autoSubmitting.current = true;
      setPhoneError("");
      setPhoneLoading(true);

      const result = await upgradeAnonymousUser(
        phone,
        otp,
        nameSaved ? displayName.trim() : undefined,
      );
      setPhoneLoading(false);
      autoSubmitting.current = false;

      if (result.error) {
        setPhoneError(result.error);
        return;
      }

      setPhoneVerified(true);
    },
    [phone, otp, phoneLoading, nameSaved, displayName],
  );

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);

    if (digits.length === 6 && !autoSubmitting.current) {
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 0);
    }
  };

  if (phoneVerified) {
    return (
      <div className="rounded-lg border p-4 text-center">
        <p className="text-sm font-medium">Phone verified! You&apos;re all set.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {/* Name input */}
      {!nameSaved ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Add your name (optional)</p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Your first name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={nameLoading || !displayName.trim()}
            >
              {nameLoading ? "..." : "Save"}
            </Button>
          </div>
          {nameError && <p className="text-xs text-red-500">{nameError}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Voting as <span className="font-semibold">{displayName}</span>
        </p>
      )}

      {/* Phone verify (collapsible) */}
      {!showPhoneVerify ? (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowPhoneVerify(true)}
          >
            Verify with phone (optional)
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onDone}>
            Done
          </Button>
        </div>
      ) : phoneStep === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-2">
          <p className="text-sm font-medium">Verify your phone</p>
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={phoneLoading}>
              {phoneLoading ? "..." : "Send code"}
            </Button>
          </div>
          {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={onDone}
          >
            Skip
          </Button>
        </form>
      ) : (
        <form ref={formRef} onSubmit={handleVerifyOtp} className="space-y-2">
          <p className="text-sm font-medium">Enter the code we texted you</p>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={(e) => handleOtpChange(e.target.value)}
            className="text-center text-xl tracking-[0.3em] font-mono"
            required
            autoFocus
          />
          {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={phoneLoading}>
              {phoneLoading ? "Checking..." : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhoneStep("phone");
                setOtp("");
                setPhoneError("");
              }}
            >
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
