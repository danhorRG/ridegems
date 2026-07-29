"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addCommentAction, type CommentFormState } from "@/app/route/[slug]/actions";

const initialState: CommentFormState = { status: "idle" };

export default function CommentForm({ slug, isSignedIn }: { slug: string; isSignedIn: boolean }) {
  const [state, formAction, pending] = useActionState(addCommentAction, initialState);
  const [bodyLength, setBodyLength] = useState(0);

  if (!isSignedIn) {
    return (
      <Link
        href={`/login?next=/route/${slug}`}
        className="mb-3 block rounded-lg border border-dashed border-parchment/25 px-3.5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-parchment/60 hover:border-amber hover:text-parchment"
      >
        Sign in to leave a trip report
      </Link>
    );
  }

  return (
    <form action={formAction} className="mb-4 flex flex-col gap-2">
      <input type="hidden" name="slug" value={slug} />
      <textarea
        name="body"
        required
        maxLength={280}
        rows={3}
        onChange={(e) => setBodyLength(e.target.value.length)}
        placeholder="Did you ride it? What was good, what wasn't, or anything current worth flagging (closures, detours, hazards)."
        className="w-full rounded-lg border border-parchment/20 bg-forest-soft px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus:border-amber focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-stats text-[0.65rem] text-parchment/40">{bodyLength}/280</span>
        {state.status === "error" && state.message && (
          <span className="text-xs text-rust">{state.message}</span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-full bg-amber px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-forest transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post trip report"}
        </button>
      </div>
    </form>
  );
}
