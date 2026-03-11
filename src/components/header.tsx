import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export const Header = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href={ROUTES.HOME} className="text-lg font-bold">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={ROUTES.DASHBOARD}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href={ROUTES.LOGIN}
              className={buttonVariants({ size: "sm" })}
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
