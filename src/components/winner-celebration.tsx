"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type WinnerCelebrationProps = {
  userWon: boolean;
  winnerSide: "a" | "b";
  sideA: string;
  sideB: string;
};

export const WinnerCelebration = ({
  userWon,
  winnerSide,
  sideA,
  sideB,
}: WinnerCelebrationProps) => {
  const fired = useRef(false);

  useEffect(() => {
    if (userWon && !fired.current) {
      fired.current = true;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [userWon]);

  const winnerName = winnerSide === "a" ? sideA : sideB;

  return (
    <p className="text-center text-sm font-medium">
      {userWon ? (
        <>You were right. <span className="font-bold">{winnerName}</span> wins.</>
      ) : (
        <>You were outvoted. <span className="font-bold">{winnerName}</span> wins.</>
      )}
    </p>
  );
};
