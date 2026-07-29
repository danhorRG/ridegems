import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="h-full overflow-y-auto bg-forest">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <Link
          href="/"
          className="font-stats text-xs uppercase tracking-wide text-parchment/60 transition-colors hover:text-parchment"
        >
          &larr; Back to map
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide text-parchment sm:text-3xl">
          About RideGems
        </h1>

        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-parchment/80 sm:text-base">
          <p>
            Anyone who&apos;s cycled somewhere new with a local knows the difference it makes —
            the route that avoids the busy road, the climb that&apos;s actually worth the effort,
            the café at just the right distance. RideGems exists to collect that kind of knowledge
            in one place: routes recommended by people who&apos;ve actually ridden them, not GPS
            tracks dumped without context.
          </p>
          <p>Every route here comes from someone who rode it, thought it was worth sharing, and said why.</p>
        </div>
      </div>
    </div>
  );
}
