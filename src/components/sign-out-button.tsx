"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export const SignOutButton = () => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut()}
    >
      Log out
    </Button>
  );
};
