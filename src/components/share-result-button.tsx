"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, Check } from "lucide-react";

type ShareResultButtonProps = {
  slug: string;
};

export const ShareResultButton = ({ slug }: ShareResultButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const storyUrl = `/api/og/result/${slug}?format=story`;

  const handleShare = async () => {
    // Try native share API first (mobile — can share image files)
    if (navigator.share) {
      try {
        const response = await fetch(storyUrl);
        const blob = await response.blob();
        const file = new File([blob], "squabble-result.png", {
          type: "image/png",
        });

        await navigator.share({
          title: "Squabble Result",
          files: [file],
        });
        return;
      } catch {
        // User cancelled or sharing failed — fall through to copy
      }
    }

    // Fallback: copy link
    await navigator.clipboard.writeText(
      `${window.location.origin}/s/${slug}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(storyUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "squabble-result.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={handleShare}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" /> Link copied
          </>
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" /> Share the result
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
