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
            Create a Dispute
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
          <h3 className="mb-1 font-semibold">1. Create your question</h3>
          <p className="text-muted-foreground text-sm">
            What&apos;s the debate? Add two sides and set a timer.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">2. Share with friends</h3>
          <p className="text-muted-foreground text-sm">
            Text the link to your group. Anyone can vote.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">3. Settle it</h3>
          <p className="text-muted-foreground text-sm">
            When the timer runs out, majority wins. Debate settled.
          </p>
        </div>
      </div>
    </div>
  );
}
