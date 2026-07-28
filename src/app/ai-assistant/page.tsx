"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Sparkles, User as UserIcon } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import { getUser } from "@/lib/api";

type Message = { id: string; role: "user" | "assistant"; text: string };

const SUGGESTED_PROMPTS = [
  "What column spacing suits a 20×15m commercial floor?",
  "How much steel is typical for a 3-storey office building?",
  "What's the recommended footing size for a stiff clay site?",
];

function craftReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("column") || q.includes("spacing")) {
    return "For mid-rise commercial floors, a 4×3 balanced grid with ~5–6m bays is a good default — it keeps beam spans manageable while limiting column count. Try the 'Balanced grid' option in the 3D planner's AI suggestions panel to see exact quantities for your footprint.";
  }
  if (q.includes("steel") || q.includes("reinforcement")) {
    return "A 3-storey RC office building typically uses 60–90 kg of steel per m³ of concrete, depending on seismic zone and load. Open the Material Estimator for a live number based on your actual dimensions.";
  }
  if (q.includes("footing") || q.includes("foundation")) {
    return "On stiff clay with ~200 kN/m² bearing capacity, isolated footings sized 1.2–1.8m square are common for typical column loads. The planner's dependency engine will recommend a size automatically once you set your site soil type.";
  }
  return "I can help with column/beam sizing, material quantities, and layout tradeoffs. For precise numbers, use the Material Estimator or open a project in the 3D Planner — I'll reference the same engineering engine.";
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Hi! Ask me about column sizing, material quantities, or layout tradeoffs for your structure.",
    },
  ]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(getUser()?.name || null);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: clean };
    const reply: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: craftReply(clean),
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <AppShell title="AI Assistant">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "AI Assistant" }]}
        eyebrow="Beta"
        title="AI structural assistant"
        description="Rule-based guidance today, backed by the same engineering engine as the planner. Full LLM integration is on the roadmap."
      />

      <div className="mx-auto flex h-[calc(100%-6.5rem)] max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div ref={listRef} className="touch-scroll flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user" ? "bg-surface text-text-secondary" : "bg-accent-soft text-accent"
                }`}
              >
                {m.role === "user" ? <UserIcon size={15} /> : <Sparkles size={15} />}
              </span>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "border border-border bg-white text-text-primary"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border pt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              userName ? `Ask about ${userName}'s project…` : "Ask about your structure…"
            }
            className="auth-input flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="auth-btn w-auto shrink-0 px-5"
          >
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
