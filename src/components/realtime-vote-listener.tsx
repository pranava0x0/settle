"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RealtimeVoteListenerProps = {
  squabbleId: string;
};

export const RealtimeVoteListener = ({
  squabbleId,
}: RealtimeVoteListenerProps) => {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`votes:${squabbleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `dispute_id=eq.${squabbleId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [squabbleId, router]);

  // Renders nothing — purely a side-effect component
  return null;
};
