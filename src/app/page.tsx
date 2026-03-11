import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button-variants";
import { APP_NAME, APP_DESCRIPTION, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-3 text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="text-muted-foreground mb-8 text-lg">{APP_DESCRIPTION}</p>

      <div className="mb-12 space-y-3">
        {user ? (
          <Link
            href={ROUTES.CREATE}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full max-w-xs",
            )}
          >
            Start a new one
          </Link>
        ) : (
          <Link
            href={ROUTES.LOGIN}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full max-w-xs",
            )}
          >
            Get Started
          </Link>
        )}
      </div>

      <div className="space-y-6 text-left">
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">1. Drop your hot take</h3>
          <p className="text-muted-foreground text-sm">
            What&apos;s the debate? Pick two sides and set a timer.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">2. Text it to the group</h3>
          <p className="text-muted-foreground text-sm">
            Send the link. Everyone gets a vote.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">3. Let the votes do the talking</h3>
          <p className="text-muted-foreground text-sm">
            When time&apos;s up, the majority wins. Settled.
          </p>
        </div>
      </div>
    </div>
  );
}
