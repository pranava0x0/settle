"use client";

import { useState } from "react";
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
import { createDispute } from "@/lib/actions/disputes";
import { TIMER_PRESETS } from "@/lib/constants";

const CreateDisputePage = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(
    TIMER_PRESETS[1].value,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createDispute({
      question: formData.get("question") as string,
      side_a: formData.get("side_a") as string,
      side_b: formData.get("side_b") as string,
      duration_minutes: selectedDuration,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    }
    // If successful, createDispute redirects to the dispute page
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">What&apos;s the squabble?</CardTitle>
          <CardDescription>
            Drop the question, pick the sides, and let the people decide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="question">The question</Label>
              <Input
                id="question"
                name="question"
                placeholder="Is a hot dog a sandwich?"
                maxLength={280}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="side_a">This side says...</Label>
                <Input
                  id="side_a"
                  name="side_a"
                  placeholder="Yes, obviously"
                  maxLength={140}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="side_b">The other side says...</Label>
                <Input
                  id="side_b"
                  name="side_b"
                  placeholder="No way"
                  maxLength={140}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>How long do they have?</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIMER_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={
                      selectedDuration === preset.value ? "default" : "outline"
                    }
                    onClick={() => setSelectedDuration(preset.value)}
                    className="w-full"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Firing it up..." : "Let\u0027s squabble"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDisputePage;
