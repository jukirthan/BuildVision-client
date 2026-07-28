"use client";

import { useReducedMotion } from "framer-motion";

/** Original, fictional firm wordmarks — set in type, no logo assets needed. */
const FIRMS = [
  "Meridian Studio",
  "NorthArc",
  "Vertex Engineering",
  "Habitat Group",
  "StructaBuild",
  "Atelier Kōji",
  "GridWorks",
  "Palladian Trust",
  "Ironline Civil",
  "Cascade Urban",
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {FIRMS.map((name) => (
        <li
          key={name}
          aria-hidden={hidden || undefined}
          className="whitespace-nowrap font-display text-sm font-semibold tracking-tight text-text-tertiary/70"
        >
          {name}
        </li>
      ))}
    </>
  );
}

export default function TrustStrip() {
  const reduce = useReducedMotion();

  return (
    <section className="border-b border-border bg-canvas" aria-label="Trusted by design and construction teams">
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Trusted by architecture, engineering and construction teams
        </p>

        {reduce ? (
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <Row />
          </ul>
        ) : (
          <div
            className="relative mt-6 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            }}
          >
            <ul className="flex w-max animate-marquee items-center gap-14 pr-14 hover:[animation-play-state:paused]">
              <Row />
              <Row hidden />
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
