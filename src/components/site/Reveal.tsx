"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Direction = "up" | "blur" | "scale" | "left" | "right" | "fade";

function variantFor(direction: Direction, distance: number): Variants {
  switch (direction) {
    case "blur":
      return {
        hidden: { opacity: 0, y: distance, filter: "blur(8px)" },
        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
      };
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.94 },
        visible: { opacity: 1, scale: 1 },
      };
    case "left":
      return {
        hidden: { opacity: 0, x: -distance * 2 },
        visible: { opacity: 1, x: 0 },
      };
    case "right":
      return {
        hidden: { opacity: 0, x: distance * 2 },
        visible: { opacity: 1, x: 0 },
      };
    case "fade":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    default:
      return {
        hidden: { opacity: 0, y: distance },
        visible: { opacity: 1, y: 0 },
      };
  }
}

/** Scroll-triggered entrance. Renders children statically for reduced motion. */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
  direction = "up",
  duration = 0.55,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  direction?: Direction;
  duration?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={variantFor(direction, y)}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct children as they scroll into view. */
export function Stagger({
  children,
  className,
  gap = 0.07,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ staggerChildren: gap, delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

/** Child of <Stagger>. */
export function StaggerItem({
  children,
  className,
  direction = "up",
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={variantFor(direction, y)}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Word-by-word headline reveal. */
export function RevealText({
  text,
  className,
  delay = 0,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden>
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "110%", opacity: 0 }}
            whileInView={{ y: "0%", opacity: 1 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 0.7,
              delay: delay + i * 0.055,
              ease: EASE,
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
