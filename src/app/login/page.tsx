"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { api, applyAuth } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const gated = params.get("reason") === "auth";

  const [email, setEmail] = useState("admin@buildvision.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.login(email, password);
      if (!res.success || !res.data) {
        setError(
          res.message ||
            "Could not sign in. Make sure the Flask API is running."
        );
        return;
      }

      if (!applyAuth(res.data)) {
        setError("Login succeeded but no token was returned.");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Unexpected error while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="login"
      title="Sign in"
      subtitle={
        <>
          No account?{" "}
          <Link href="/signup" className="auth-link">
            Sign up
          </Link>
          <span className="mt-1 block text-[11px] text-[#94a3b8]">
            Demo: admin@buildvision.com / admin123
          </span>
        </>
      }
      footer={
        <>
          Looking to browse first?{" "}
          <Link href="/features" className="auth-link">
            See features
          </Link>
        </>
      }
    >
      {gated && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-3 text-sm text-[#92450a]">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p>Please sign in to access BuildVision Studio.</p>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            autoComplete="email"
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pr-16"
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary hover:text-accent"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
