"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareButtonProps = {
  slug: string;
  question?: string;
};

export const ShareButton = ({ slug, question }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/s/${slug}`
    : `/s/${slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Settle this!",
          text: question ? `${question} — vote now:` : "Help settle this debate:",
          url,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleShare}
    >
      {copied ? "Link copied!" : "Text it to the group"}
    </Button>
  );
};
