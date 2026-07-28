"use client";

import { useState } from "react";

export default function RecommendButton({ initialCount }: { initialCount: number }) {
  const [recommended, setRecommended] = useState(false);

  const count = recommended ? initialCount + 1 : initialCount;

  return (
    <button
      type="button"
      onClick={() => setRecommended((prev) => !prev)}
      aria-pressed={recommended}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
        recommended
          ? "border-amber bg-amber text-forest"
          : "border-parchment/30 text-parchment/80 hover:border-amber hover:text-amber"
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill={recommended ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.5 8.5v8h-2a1 1 0 01-1-1v-6a1 1 0 011-1h2zm0 0l3.5-6a1.5 1.5 0 013 .8l-.7 4.2h4a1.6 1.6 0 011.55 1.96l-1.3 5.5A1.6 1.6 0 0115.1 16.5H9a2.5 2.5 0 01-2.5-2.5v-5.5z"
        />
      </svg>
      Recommend
      <span className="font-stats font-medium opacity-80">{count}</span>
    </button>
  );
}
