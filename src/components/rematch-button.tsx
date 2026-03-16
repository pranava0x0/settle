"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { createRematch } from "@/lib/actions/squabbles";

type RematchButtonProps = {
  slug: string;
};

export const RematchButton = ({ slug }: RematchButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRematch = async () => {
    setError("");
    setLoading(true);
    const result = await createRematch(slug);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    }
    // If successful, createRematch redirects
  };

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleRematch}
        disabled={loading}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {loading ? "Setting up rematch..." : "Rematch"}
      </Button>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
};
