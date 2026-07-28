"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Button from "@/components/ui/Button";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="section-eyebrow">Contact</p>
              <h1 className="mt-3 text-display-xl text-text-primary">
                Talk to the team.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-text-secondary">
                Questions about pricing, enterprise plans, or the camera
                measurement module — we usually reply within one business day.
              </p>

              <div className="mt-8 space-y-4 text-sm text-text-secondary">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-text-tertiary" /> hello@buildvision.app
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-text-tertiary" /> Colombo, Sri Lanka
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare size={16} className="text-text-tertiary" /> Live chat available for Studio & Enterprise plans
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="card p-6">
                {sent ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <p className="font-display text-lg font-semibold text-text-primary">
                      Message sent
                    </p>
                    <p className="text-sm text-text-secondary">
                      Thanks for reaching out — we&apos;ll get back to you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4">
                    <label className="auth-field">
                      <span>Full name</span>
                      <input type="text" required className="auth-input" />
                    </label>
                    <label className="auth-field">
                      <span>Work email</span>
                      <input type="email" required className="auth-input" />
                    </label>
                    <label className="auth-field">
                      <span>Message</span>
                      <textarea
                        required
                        rows={4}
                        className="auth-input resize-none"
                      />
                    </label>
                    <Button type="submit" className="w-full">
                      Send message
                    </Button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
