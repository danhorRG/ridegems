"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the real, measured viewport height in pixels. `100dvh` alone
 * should handle mobile browser chrome correctly, but this gives the app
 * shell an explicit pixel height as a second line of defense — and lets
 * us force the map to re-measure its size whenever it changes.
 */
export function useViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return height;
}
