"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Bot,
  ChevronDown,
  CircleDollarSign,
  Play,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import MagneticButton from "@/components/site/MagneticButton";
import Reveal, { RevealText } from "@/components/site/Reveal";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const STATS = [
  { value: "12k+", label: "Buildings modelled" },
  { value: "38%", label: "Faster early design" },
  { value: "±2cm", label: "Camera measurement" },
  { value: "60 fps", label: "In-browser 3D" },
];

/** One floating glass card, parallaxed against the pointer. */
function FloatCard({
  mx,
  my,
  depth,
  className,
  floatDelay = 0,
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  className?: string;
  floatDelay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth * 0.7);

  return (
    <motion.div
      style={reduce ? undefined : { x, y }}
      className={`pointer-events-none absolute z-[5] hidden xl:block ${className ?? ""}`}
      aria-hidden
    >
      <div
        className="glass-ink animate-float rounded-2xl p-4 shadow-xl"
        style={{ animationDelay: `${floatDelay}s`, animationDuration: `${7 + depth / 14}s` }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink"
      aria-label="BuildVision — intelligent building design platform"
    >
      {/* Scenery layers */}
      <div className="aurora absolute inset-0" aria-hidden />
      <div
        className="blueprint-grid animate-grid-pan absolute inset-0 opacity-70 [animation-duration:14s]"
        aria-hidden
      />
      <HeroCanvas eventSource={sectionRef} />
      <div className="hero-vignette pointer-events-none absolute inset-0" aria-hidden />

      {/* Floating feature cards */}
      <FloatCard mx={mx} my={my} depth={-22} className="left-[6%] top-[24%]" floatDelay={0.4}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai/25 text-[#c4b5fd]">
            <Bot size={15} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">AI Building Assistant</p>
            <p className="mt-0.5 text-[11px] text-white/55">“Add a 6×4 column grid…”</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4]" />
        </div>
      </FloatCard>

      <FloatCard mx={mx} my={my} depth={16} className="left-[9%] top-[58%]" floatDelay={1.6}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/25 text-[#67e8f9]">
            <Ruler size={15} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Smart Beam Detection</p>
            <p className="mt-0.5 text-[11px] text-white/55">Span 5.8 m · load OK</p>
          </div>
          <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Valid
          </span>
        </div>
      </FloatCard>

      <FloatCard mx={mx} my={my} depth={20} className="right-[7%] top-[28%]" floatDelay={1}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/30 text-[#93c5fd]">
            <CircleDollarSign size={15} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Cost Estimation</p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-white">
              $184,300 <span className="text-[10px] font-medium text-emerald-300">live</span>
            </p>
          </div>
        </div>
      </FloatCard>

      <FloatCard mx={mx} my={my} depth={-14} className="right-[10%] top-[60%]" floatDelay={2.2}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80">
            <Users size={15} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Live Collaboration</p>
            <div className="mt-1 flex -space-x-1.5">
              {["bg-[#60a5fa]", "bg-[#a78bfa]", "bg-[#34d399]"].map((c, i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full border border-[#020617] ${c}`}
                />
              ))}
              <span className="pl-2.5 text-[10px] text-white/55">3 editing</span>
            </div>
          </div>
        </div>
      </FloatCard>

      {/* Copy */}
      <div className="relative z-10 mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <Reveal direction="fade" duration={0.8}>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/75 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-pulse-ring rounded-full bg-cyan" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-cyan" />
            </span>
            <Sparkles size={12} className="text-[#c4b5fd]" />
            AI-powered building intelligence
          </p>
        </Reveal>

        <h1 className="mt-7 max-w-5xl font-display text-hero text-white">
          <RevealText text="Design Tomorrow’s" delay={0.1} />
          <br />
          <RevealText
            text="Buildings Today"
            delay={0.32}
            className="text-gradient-light"
          />
        </h1>

        <Reveal delay={0.55} className="mt-6 max-w-2xl">
          <p className="text-balance text-base leading-relaxed text-white/65 sm:text-body-lg">
            Create intelligent 3D buildings with AI-powered planning, structural
            validation, quantity estimation, and real-time collaboration — all in
            the browser.
          </p>
        </Reveal>

        <Reveal delay={0.7} className="mt-9">
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <MagneticButton href="/login">Start Designing</MagneticButton>
            <MagneticButton href="#demo" variant="ghost">
              <Play size={15} className="fill-current" /> Watch Demo
            </MagneticButton>
          </div>
        </Reveal>

        <Reveal delay={0.85} direction="fade" className="mt-8">
          <p className="text-xs text-white/40">
            No installation · Free tier · Runs on any modern browser
          </p>
        </Reveal>
      </div>

      {/* Stats shelf */}
      <div className="relative z-10 border-t border-white/[0.07] bg-ink/40 backdrop-blur-sm">
        <dl className="mx-auto grid max-w-content grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={0.9 + i * 0.06} direction="fade">
              <div className="text-center md:text-left">
                <dd className="font-display text-xl font-semibold tabular-nums text-white sm:text-2xl">
                  {s.value}
                </dd>
                <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/40">
                  {s.label}
                </dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>

      {/* Scroll cue */}
      <div
        className="pointer-events-none absolute bottom-[6.5rem] left-1/2 z-10 hidden -translate-x-1/2 md:block"
        aria-hidden
      >
        <ChevronDown size={18} className="animate-float text-white/35" />
      </div>
    </section>
  );
}
