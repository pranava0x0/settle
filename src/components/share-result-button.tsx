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
      } catch (err) {
        // A user cancelling the share sheet is normal; anything else is a real
        // failure and must be logged. Swallowing everything here is what hid
        // the 500 from /api/og/result for as long as it did — the button just
        // quietly copied a link instead.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Native share failed, falling back to copy link:", err);
        }
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "squabble-result.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke so the browser can start the download
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open image in new tab so user can long-press/right-click save
      window.open(storyUrl, "_blank");
    }
    setDownloading(false);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={handleShare}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" /> Link copied
          </>
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share the result
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={
          downloading ? "Downloading result image" : "Download result image"
        }
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};
