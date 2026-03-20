import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SquabbleNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Squabble not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            This link doesn&apos;t go anywhere. It might be a typo, or the
            squabble may have been removed.
          </p>
          <Link href={ROUTES.HOME} className={buttonVariants({ size: "lg" })}>
            Back to {APP_NAME}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
