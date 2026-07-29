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
            Finding good routes in a new area shouldn&apos;t mean digging through hundreds of
            random GPS logs.
          </p>
          <p>
            Anyone who&apos;s ridden with a local knows the difference: knowing which side of the
            climb to take, which descent to enjoy, or where a quick detour pays off with a great
            view or a proper coffee. RideGems is a community-driven collection of those exact
            routes. No noise, no random commutes — just proven rides shared by cyclists who know
            the area best.
          </p>
          <p>
            If you have a favorite local loop that deserves to be on the map, share it. And if
            you&apos;ve ridden one of the routes here, leave a quick update — fresh condition
            reports, road closures, or new spots make the collection even more valuable.
          </p>
          <p>Together, we can build a truly useful guide for everyone.</p>
        </div>
      </div>
    </div>
  );
}
