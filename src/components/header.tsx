import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button-variants";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Header = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href={ROUTES.HOME} className="text-lg font-bold">
            {APP_NAME}
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={ROUTES.DASHBOARD}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                My debates
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
