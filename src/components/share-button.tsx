"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareButtonProps = {
  slug: string;
  question?: string;
};

/**
 * Build the pre-filled SMS body for sharing a squabble link.
 * Uses `sms:?&body=` which works on iOS (iMessage) and Android.
 */
export function buildSmsHref(question: string | undefined, url: string): string {
  const body = question
    ? `New squabble: ${question} — vote here: ${url}`
    : `Weigh in on this — vote here: ${url}`;
  return `sms:?&body=${encodeURIComponent(body)}`;
}

export const ShareButton = ({ slug, question }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${slug}`
      : `/s/${slug}`;

  const handleTextIt = () => {
    // On mobile: open SMS app with pre-filled message
    const smsHref = buildSmsHref(question, url);
    window.open(smsHref, "_self");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" className="flex-1" onClick={handleTextIt}>
        Text it to the group
      </Button>
      <Button variant="outline" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
};
