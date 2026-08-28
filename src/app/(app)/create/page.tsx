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
import { DURATION_LIMITS, TIMER_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CreateSquabblePage = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    TIMER_PRESETS[1].value,
  );
  const [customMinutes, setCustomMinutes] = useState("");

  // The custom box is the selection whenever it holds anything. Deriving this
  // rather than tracking an `isCustom` flag keeps the two inputs from both
  // claiming to be selected.
  //
  // Number(), not parseInt(): <input type="number"> accepts scientific notation,
  // and parseInt("1e2") is 1 — so typing 100 minutes would quietly create a
  // one-minute squabble. Number() reads the whole value, and Number.isInteger
  // then rejects the fractional results it also allows.
  const customValue = Number(customMinutes);
  const isCustomValid =
    customMinutes.trim() !== "" &&
    Number.isInteger(customValue) &&
    customValue >= DURATION_LIMITS.MIN_MINUTES &&
    customValue <= DURATION_LIMITS.MAX_MINUTES;
  const usingCustom = customMinutes.trim() !== "";
  const selectedDuration = usingCustom ? customValue : selectedPreset;
  const durationIsValid = usingCustom ? isCustomValid : selectedPreset !== null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createSquabble({
      question: formData.get("question") as string,
      side_a: formData.get("side_a") as string,
      side_b: formData.get("side_b") as string,
      duration_minutes: selectedDuration as number,
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
              <Label id="duration-label">How long do they have?</Label>
              <div
                role="group"
                aria-labelledby="duration-label"
                className="flex flex-wrap gap-2"
              >
                {TIMER_PRESETS.map((preset) => {
                  const isSelected = !usingCustom && selectedPreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedPreset(preset.value);
                        setCustomMinutes("");
                      }}
                      className={cn(
                        "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full px-3 text-sm font-medium transition-all",
                        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-semibold ring-2 ring-primary/20"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom duration is a plain fill-in box, not a mode you have to
                  unlock first. Typing in it takes over the selection; clearing
                  it hands the selection back to the presets. */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  id="custom_minutes"
                  type="number"
                  inputMode="numeric"
                  placeholder="Or type minutes"
                  aria-label="Custom duration in minutes"
                  aria-invalid={usingCustom && !isCustomValid}
                  min={DURATION_LIMITS.MIN_MINUTES}
                  max={DURATION_LIMITS.MAX_MINUTES}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className={cn(
                    "min-h-11 w-40",
                    usingCustom &&
                      isCustomValid &&
                      "border-primary ring-2 ring-primary/20",
                  )}
                />
                <span className="text-muted-foreground text-sm">
                  minutes (max 7 days)
                </span>
              </div>
              {usingCustom && !isCustomValid && (
                <p className="text-sm text-red-500">
                  Enter a whole number between {DURATION_LIMITS.MIN_MINUTES} and{" "}
                  {DURATION_LIMITS.MAX_MINUTES} minutes.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !durationIsValid}
            >
              {loading ? "Firing it up..." : "Let\u0027s squabble"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSquabblePage;
