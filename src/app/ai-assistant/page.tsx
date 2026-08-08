"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Loader2,
  Send,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import { api, getUser, type AiChatMessage, type AiProvider } from "@/lib/api";

type Message = AiChatMessage & { id: string };

const SUGGESTED_PROMPTS = [
  "What column spacing suits a 20×15m commercial floor?",
  "How much steel is typical for a 3-storey office building?",
  "What should I check before sizing a footing on stiff clay?",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      content:
        "Hi! I’m the BuildVision AI assistant. Ask me about column sizing, material quantities, floor layouts, or structural tradeoffs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiProvider>("gemini");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(getUser()?.name || null);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;

    setError("");
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: clean,
    };
    const history: AiChatMessage[] = [...messages, userMessage]
      .filter((message) => message.id !== "m0")
      .map(({ role, content }) => ({ role, content }));

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setSending(true);

    try {
      const result = await api.aiChat(history, provider);
      if (!result.success || !result.data?.text) {
        setError(
          result.message ||
            "The AI assistant could not respond. Check the Flask/OpenAI configuration."
        );
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.data!.text,
        },
      ]);
    } catch {
      setError("The AI assistant could not connect. Check the backend and try again.");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <AppShell title="AI Assistant">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "AI Assistant" }]}
        eyebrow="OpenAI powered"
        title="AI structural assistant"
        description="Ask questions about your structure and get practical guidance grounded in BuildVision’s engineering workflow."
      />

      <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/40 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ai-soft text-ai">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-text-primary sm:text-base">BuildVision Assistant</h2>
                <p className="truncate text-xs text-text-secondary">{provider === "gemini" ? "Google Gemini" : "OpenAI Responses API"} · secure backend proxy</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-border bg-white p-1" role="group" aria-label="Choose AI provider">
                <button type="button" onClick={() => setProvider("openai")} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 ${provider === "openai" ? "bg-accent-soft text-accent" : "text-text-secondary hover:text-text-primary"}`}>OpenAI</button>
                <button type="button" onClick={() => setProvider("gemini")} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 ${provider === "gemini" ? "bg-cyan-soft text-cyan" : "text-text-secondary hover:text-text-primary"}`}>Gemini</button>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent lg:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Protected
              </span>
            </div>
          </header>

          <div ref={listRef} className="touch-scroll min-h-0 flex-1 space-y-5 overflow-y-auto bg-canvas/50 p-4 sm:space-y-6 sm:p-7" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${message.role === "user" ? "bg-surface text-text-secondary" : "bg-ai-soft text-ai"}`} aria-hidden="true">
                  {message.role === "user" ? <UserIcon size={16} /> : <Bot size={17} />}
                </span>
                <div className={`max-w-[min(88%,760px)] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm sm:px-5 sm:py-4 ${message.role === "user" ? "rounded-tr-md bg-accent text-white" : "rounded-tl-md border border-border bg-white text-text-primary"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-start gap-3" role="status" aria-label="Assistant is thinking">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ai-soft text-ai"><Bot size={17} /></span>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-white px-5 py-4 text-sm text-text-secondary shadow-sm">
                  <Loader2 size={16} className="animate-spin text-ai" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-white px-4 py-3 sm:px-6">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => void send(prompt)} disabled={sending} className="rounded-full border border-border px-3 py-2 text-left text-xs text-text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50">
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mx-4 mb-3 flex shrink-0 items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:mx-6" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t border-border bg-white p-3 sm:gap-3 sm:p-5">
            <label className="sr-only" htmlFor="assistant-message">Message for the AI assistant</label>
            <textarea
              id="assistant-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder={userName ? `Ask about ${userName}'s project…` : "Ask about your structure…"}
              className="min-h-14 max-h-36 min-w-0 flex-1 resize-y rounded-2xl border border-border bg-canvas px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/15"
              rows={2}
              disabled={sending}
            />
            <button type="submit" disabled={!input.trim() || sending} className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:px-6" aria-label="Send message">
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="shrink-0 bg-white px-4 pb-3 text-[11px] text-text-tertiary sm:px-6">Shift + Enter for a new line · AI guidance is informational and should be reviewed by a licensed professional.</p>
        </section>
      </div>
    </AppShell>
  );
}
