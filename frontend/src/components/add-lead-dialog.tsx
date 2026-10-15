"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import type { Lead } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "./modal";

function Field({
  id,
  label,
  optional,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 text-[13px] font-semibold text-ink">
        {label}{" "}
        {optional ? (
          <span className="font-normal text-ink/40">(Optional)</span>
        ) : (
          <span className="text-red-700" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        {...props}
        className="border-ink/25 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus-visible:border-ink focus-visible:ring-ink/30"
      />
    </div>
  );
}

export function AddLeadDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (name.trim() === "") {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const lead = await api.createLead({
        name: name.trim(),
        company: company.trim() === "" ? undefined : company.trim(),
        phone: phone.trim() === "" ? undefined : phone.trim(),
      });
      onCreated(lead);
      onClose();
    } catch (err) {
      // Values are preserved so the user can retry.
      setError(
        err instanceof ApiError ? err.message : "Could not save the lead.",
      );
      setSaving(false);
    }
  }

  return (
    <Modal title="Add New Lead" onClose={onClose} widthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5" noValidate>
        <Field
          id="lead-name"
          label="Full Name"
          placeholder="e.g., John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <Field
          id="lead-company"
          label="Company"
          optional
          placeholder="e.g., Stark Industries"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
        />
        <Field
          id="lead-phone"
          label="Phone"
          optional
          placeholder="e.g., 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        {error && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 border-t border-ink/15 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-ink/70 hover:text-ink"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="shadow-[2px_2px_0_rgba(28,24,19,0.3)]"
          >
            {saving ? "Saving…" : "Save Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
