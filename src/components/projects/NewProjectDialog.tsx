"use client";

import { FormEvent, useEffect, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

export type NewProjectInput = {
  name: string;
  description: string;
  location: string;
  buildingName: string;
  totalFloors: number;
  width: number;
  length: number;
};

const initial: NewProjectInput = {
  name: "",
  description: "",
  location: "",
  buildingName: "",
  totalFloors: 3,
  width: 30,
  length: 20,
};

export default function NewProjectDialog({
  open,
  onClose,
  onCreate,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
  submitting: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<NewProjectInput>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New project"
      description="Give your project a name — you'll go straight into the 3D planner to start designing."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-project-form"
            disabled={submitting || !form.name.trim()}
          >
            {submitting ? "Creating…" : "Create & open planner"}
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={onSubmit} className="space-y-4">
        <label className="auth-field">
          <span>Project name *</span>
          <input
            type="text"
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Downtown Office Complex"
            className="auth-input"
            disabled={submitting}
          />
        </label>

        <label className="auth-field">
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description of the project (optional)"
            rows={2}
            className="auth-input resize-none"
            disabled={submitting}
          />
        </label>

        <label className="auth-field">
          <span>Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Colombo, Sri Lanka"
            className="auth-input"
            disabled={submitting}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="auth-field">
            <span>Building name</span>
            <input
              type="text"
              value={form.buildingName}
              onChange={(e) => setForm((f) => ({ ...f, buildingName: e.target.value }))}
              placeholder="Building 1"
              className="auth-input"
              disabled={submitting}
            />
          </label>
          <label className="auth-field">
            <span>Floors</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.totalFloors}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalFloors: Number(e.target.value) || 1 }))
              }
              className="auth-input"
              disabled={submitting}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="auth-field">
            <span>Width (m)</span>
            <input
              type="number"
              min={3}
              max={200}
              value={form.width}
              onChange={(e) => setForm((f) => ({ ...f, width: Number(e.target.value) || 1 }))}
              className="auth-input"
              disabled={submitting}
            />
          </label>
          <label className="auth-field">
            <span>Length (m)</span>
            <input
              type="number"
              min={3}
              max={200}
              value={form.length}
              onChange={(e) => setForm((f) => ({ ...f, length: Number(e.target.value) || 1 }))}
              className="auth-input"
              disabled={submitting}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
        )}
      </form>
    </Dialog>
  );
}
