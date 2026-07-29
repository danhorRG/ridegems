"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleRecommendAction } from "@/app/route/[slug]/actions";

function ThumbIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 8.5v8h-2a1 1 0 01-1-1v-6a1 1 0 011-1h2zm0 0l3.5-6a1.5 1.5 0 013 .8l-.7 4.2h4a1.6 1.6 0 011.55 1.96l-1.3 5.5A1.6 1.6 0 0115.1 16.5H9a2.5 2.5 0 01-2.5-2.5v-5.5z"
      />
    </svg>
  );
}

const buttonClass = (recommended: boolean) =>
  `flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
    recommended
      ? "border-amber bg-amber text-forest"
      : "border-parchment/30 text-parchment/80 hover:border-amber hover:text-amber"
  }`;

export default function RecommendButton({
  slug,
  initialCount,
  initialRecommended,
  isSignedIn,
}: {
  slug: string;
  initialCount: number;
  initialRecommended: boolean;
  isSignedIn: boolean;
}) {
  const [recommended, setRecommended] = useState(initialRecommended);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  if (!isSignedIn) {
    return (
      <Link href={`/login?next=/route/${slug}`} className={buttonClass(false)}>
        <ThumbIcon filled={false} />
        Recommend
        <span className="font-stats font-medium opacity-80">{count}</span>
      </Link>
    );
  }

  function handleClick() {
    const next = !recommended;
    setRecommended(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));

    startTransition(async () => {
      const result = await toggleRecommendAction(slug, next);
      if (!result.ok) {
        // Revert the optimistic update if the write failed.
        setRecommended(!next);
        setCount((c) => (next ? Math.max(0, c - 1) : c + 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={recommended}
      className={`${buttonClass(recommended)} disabled:opacity-60`}
    >
      <ThumbIcon filled={recommended} />
      Recommend
      <span className="font-stats font-medium opacity-80">{count}</span>
    </button>
  );
}
