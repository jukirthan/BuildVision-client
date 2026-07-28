"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Phones */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

/** Phones + small tablets in portrait */
export function useIsCompact() {
  return useMediaQuery("(max-width: 1023px)");
}
