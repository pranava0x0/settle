"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RealtimeVoteListenerProps = {
  disputeId: string;
};

export const RealtimeVoteListener = ({
  disputeId,
}: RealtimeVoteListenerProps) => {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`votes:${disputeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `dispute_id=eq.${disputeId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [disputeId, router]);

  // Renders nothing — purely a side-effect component
  return null;
};
