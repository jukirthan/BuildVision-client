"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import Reveal from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    quote:
      "BuildVision replaced three disconnected tools in our early design phase. The live cost estimate alone saves us hours on every project.",
    name: "Amara Fernando",
    role: "Principal Architect",
    company: "Studio Nine",
    rating: 5,
  },
  {
    quote:
      "The camera measurement feature is genuinely useful on site — quick sanity checks against the drawings without any extra hardware.",
    name: "Devon Wickrama",
    role: "Site Engineer",
    company: "Colombo Builders",
    rating: 5,
  },
  {
    quote:
      "We put every feasibility study through the AI grid generator first. It finds layouts we would have argued about for a week.",
    name: "Ishara Perera",
    role: "Director",
    company: "Habitat Group",
    rating: 4,
  },
  {
    quote:
      "Our students model, break, and fix structures in the same afternoon. Nothing else makes structural behaviour this tangible.",
    name: "Dr. Nuwan Silva",
    role: "Senior Lecturer",
    company: "Institute of Built Environment",
    rating: 5,
  },
];

const AUTOPLAY_MS = 6000;

export default function Testimonials() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir: 1 | -1) =>
      setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length),
    []
  );

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduce, paused, go]);

  const t = TESTIMONIALS[index];

  return (
    <section className="border-b border-border bg-canvas py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">Customer stories</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            Built for real projects, not demos.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl">
          <div
            className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-10"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.figure
                key={index}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-1" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className={
                        i < t.rating ? "fill-warning text-warning" : "fill-border text-border"
                      }
                    />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-xl font-medium leading-relaxed tracking-tight text-text-primary sm:text-2xl">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                    {t.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">{t.name}</span>
                    <span className="block text-xs text-text-tertiary">
                      {t.role} · {t.company}
                    </span>
                  </span>
                  <span className="ml-auto hidden font-display text-sm font-semibold tracking-tight text-text-tertiary/60 sm:block">
                    {t.company}
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              aria-label="Previous testimonial"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Testimonials">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.name}
                  role="tab"
                  aria-selected={index === i}
                  aria-label={`Testimonial from ${item.name}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === i ? "w-6 bg-accent" : "w-1.5 bg-border-strong hover:bg-text-tertiary"
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              aria-label="Next testimonial"
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
