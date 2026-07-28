"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { api, applyAuth } from "@/lib/api";

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("engineer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(name.trim(), email.trim(), password, role);
      if (!res.success || !res.data) {
        setError(
          res.message ||
            "Could not create account. Is the Flask API running?"
        );
        return;
      }

      // Register now returns tokens; fall back to login if needed
      if (!applyAuth(res.data)) {
        const login = await api.login(email.trim(), password);
        if (!login.success || !applyAuth(login.data)) {
          setError(
            "Account created, but auto sign-in failed. Please sign in."
          );
          router.push("/login");
          return;
        }
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Unexpected error while creating your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="signup"
      title="Create account"
      subtitle={
        <>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Sign in
          </Link>
        </>
      }
      footer={
        <>
          Want to see it first?{" "}
          <Link href="/features" className="auth-link">
            Explore features
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="auth-field">
          <span>Full name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            autoComplete="name"
            disabled={loading}
          />
        </label>
        <label className="auth-field">
          <span>Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="auth-input"
            disabled={loading}
          >
            <option value="engineer">Civil engineer</option>
            <option value="architect">Architect</option>
            <option value="contractor">Contractor</option>
          </select>
        </label>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pr-16"
              autoComplete="new-password"
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
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="auth-input"
            autoComplete="new-password"
            disabled={loading}
          />
        </label>
        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
