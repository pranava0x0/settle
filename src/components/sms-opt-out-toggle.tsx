"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSmsOptOut } from "@/lib/actions/notifications";

type SmsOptOutToggleProps = {
  optedOut: boolean;
};

/**
 * Lets a verified voter turn off result texts.
 *
 * Rendered only for accounts with a phone on file — an anonymous voter has no
 * number and would be toggling something that can never apply to them.
 */
export const SmsOptOutToggle = ({ optedOut }: SmsOptOutToggleProps) => {
  const [enabled, setEnabled] = useState(!optedOut);
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextEnabled: boolean) => {
    const previous = enabled;
    // Optimistic, but reverted on failure — silently leaving the switch in the
    // position the user chose while the server disagrees is how someone ends up
    // getting texts they believe they turned off.
    setEnabled(nextEnabled);

    startTransition(async () => {
      const result = await setSmsOptOut(!nextEnabled);
      if (result?.error) {
        setEnabled(previous);
        toast.error(result.error);
      }
    });
  };

  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
      <span>
        Text me results
        <span className="text-muted-foreground block text-xs">
          One message when a squabble you joined is settled.
        </span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        className="size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </label>
  );
};
