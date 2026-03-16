"use client";

import { useState } from "react";
import { Check } from "lucide-react";
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
import { createSquabble } from "@/lib/actions/squabbles";
import { TIMER_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CreateSquabblePage = () => {
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
    const result = await createSquabble({
      question: formData.get("question") as string,
      side_a: formData.get("side_a") as string,
      side_b: formData.get("side_b") as string,
      duration_minutes: selectedDuration,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    }
    // If successful, createSquabble redirects to the squabble page
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
              <div className="flex gap-2">
                {TIMER_PRESETS.map((preset) => {
                  const isSelected = selectedDuration === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedDuration(preset.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-all",
                        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-semibold ring-2 ring-primary/20"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {preset.label}
                    </button>
                  );
                })}
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

export default CreateSquabblePage;
