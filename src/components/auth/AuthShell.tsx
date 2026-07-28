"use client";

import Link from "next/link";
import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api";

type AuthShellProps = {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  mode: "login" | "signup";
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  mode,
}: AuthShellProps) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const health = await api.health();
      if (alive) setApiOnline(health.success);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="auth-scene relative flex min-h-dvh overflow-hidden">
      <div className="auth-scene__bg" aria-hidden />
      <div className="auth-scene__grid" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-10 pb-safe pt-safe sm:px-6 lg:flex-row lg:items-stretch lg:gap-12 lg:px-10 lg:py-14">
        <section className="flex flex-1 flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <Link
            href="/"
            className="auth-back group mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition hover:text-white"
          >
            <span className="auth-back__chevron">←</span>
            Back to home
          </Link>

          <div className="auth-logo-stage">
            <Image
              src="/buildvision.webp"
              alt="BuildVision"
              width={72}
              height={72}
              className="auth-logo-img"
              draggable={false}
              priority
            />
          </div>

          <h1 className="auth-brand-title mt-6 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            BuildVision
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
            {mode === "login"
              ? "Sign in to open your dashboard, projects, and the 3D planner."
              : "Create an account to start designing structures with live 3D feedback."}
          </p>
        </section>

        <section className="auth-panel w-full max-w-md flex-1 lg:max-w-[26rem] lg:self-center">
          <div className="auth-panel__inner">
            <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
              <div className="flex items-center gap-3">
                <Image
                  src="/buildvision.webp"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
                <span className="font-display text-lg font-semibold text-text-primary">
                  BuildVision
                </span>
              </div>
            </div>

            {apiOnline !== null && (
              <div
                className={`mb-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  apiOnline
                    ? "bg-success-soft text-success"
                    : "bg-warning-soft text-warning"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    apiOnline ? "bg-success" : "bg-warning"
                  }`}
                />
                {apiOnline
                  ? "API connected"
                  : "API offline — start backend (py run.py)"}
              </div>
            )}

            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {mode === "login" ? "Welcome back" : "Get started"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
            <div className="mt-2 text-sm text-text-secondary">{subtitle}</div>

            <div className="mt-7">{children}</div>
            {footer && (
              <div className="mt-6 text-sm text-text-secondary">{footer}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
