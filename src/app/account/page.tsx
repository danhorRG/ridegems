import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getRoutesByUser } from "@/lib/routes";
import AccountClient from "./AccountClient";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/account");
  }

  const routes = await getRoutesByUser(supabase, user.id);
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <div className="h-full overflow-y-auto bg-forest">
      <div className="mx-auto max-w-lg px-5 py-8 sm:py-12">
        <Link
          href="/"
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to map
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
          Your account
        </h1>
        <p className="mt-1 text-sm text-parchment/60">{user.email}</p>

        <AccountClient fullName={fullName} email={user.email ?? ""} />

        <section className="mt-10">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-parchment/70">
            Your routes
          </h2>
          {routes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-parchment/20 px-4 py-4 text-sm text-parchment/50">
              You haven&apos;t submitted any routes yet.{" "}
              <Link href="/submit" className="text-amber hover:underline">
                Submit one
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {routes.map((route) => (
                <li key={route.slug}>
                  <Link
                    href={`/route/${route.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-parchment/15 bg-forest-soft px-4 py-3 text-sm text-parchment transition-colors hover:border-amber/50"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{route.name}</span>
                      <span className="font-stats text-xs text-parchment/50">
                        {DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty} &middot;{" "}
                        {route.distanceKm.toFixed(1)} km
                      </span>
                    </span>
                    {route.status === "pending" && (
                      <span className="shrink-0 rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber">
                        Pending review
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
