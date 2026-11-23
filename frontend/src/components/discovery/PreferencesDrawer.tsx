"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Checkbox, InlineNotice, Skeleton } from "@/components/ui";
import { getPreferences, savePreferences } from "@/lib/api";
import type { JobSearchPreferences } from "@/lib/api/types";
import { EMPLOYMENT_OPTIONS, EXPERIENCE_OPTIONS, WORKPLACE_OPTIONS } from "@/lib/discovery/options";
import { TagInput } from "./TagInput";
import { PreferencesPayFields } from "./PreferencesPayFields";

export interface PreferencesDrawerProps {
  open: boolean;
  onClose: () => void;
  onSavedPreferences?: () => void;
}

const EMPTY_PREFS: JobSearchPreferences = {
  role_keywords: [], location_keywords: [], internships_only: false,
  workplace_modes: [], employment_types: [], experience_levels: [],
  minimum_pay: null, include_unknown: false,
};

export function PreferencesDrawer({ open, onClose, onSavedPreferences }: PreferencesDrawerProps) {
  const [initialPrefs, setInitialPrefs] = useState<JobSearchPreferences>(EMPTY_PREFS);
  const [prefs, setPrefs] = useState<JobSearchPreferences>(EMPTY_PREFS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    queueMicrotask(() => { if (active) setLoading(true); });
    getPreferences()
      .then((data) => {
        if (active) {
          setInitialPrefs(data); setPrefs(data);
          setError(null); setSaved(false); setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load preferences.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [open, reloadTrigger]);

  const isDirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(initialPrefs), [prefs, initialPrefs]);
  const isPayValid = useMemo(() => {
    if (!prefs.minimum_pay) return true;
    const { amount, currency, period } = prefs.minimum_pay;
    return amount > 0 && Boolean(currency) && Boolean(period);
  }, [prefs.minimum_pay]);

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    onClose();
  }, [isDirty, onClose]);

  const handleSave = useCallback(async () => {
    if (prefs.minimum_pay && !isPayValid) {
      setPayError("Enter a minimum amount greater than zero.");
      return;
    }
    setPayError(null); setSaving(true); setError(null);
    try {
      const result = await savePreferences(prefs);
      setInitialPrefs(result); setPrefs(result); setSaved(true);
      onSavedPreferences?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }, [prefs, isPayValid, onSavedPreferences]);

  const summaryLine = useMemo(() => {
    const roles = prefs.role_keywords.join(", ");
    const locs = prefs.location_keywords.join(", ");
    if (!roles && !locs) return "No target role or location keywords configured.";
    if (roles && locs) return `Searching for ${roles} in ${locs}.`;
    return roles ? `Searching for ${roles}.` : `Searching in ${locs}.`;
  }, [prefs.role_keywords, prefs.location_keywords]);

  return (
    <Sheet open={open} onClose={handleClose} side="right" title="Search Preferences">
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" />
        </div>
      )}
      {error && (
        <InlineNotice variant="problem" title="Preferences error" className="mb-4">
          <span>{error}</span>
          <Button variant="quiet" size="sm" onClick={() => setReloadTrigger((p) => p + 1)} className="ml-2 underline text-xs">
            Retry
          </Button>
        </InlineNotice>
      )}
      {saved && (
        <InlineNotice variant="info" title="Preferences saved" className="mb-4">
          Your saved preferences will apply to new discovery searches when enabled.
        </InlineNotice>
      )}
      {!loading && (
        <div className="space-y-6 text-sm">
          <div className="p-3 bg-paper rounded-md border border-hairline">
            <span className="eyebrow block mb-1">SEARCH CRITERIA SUMMARY</span>
            <p className="text-xs text-ink leading-relaxed font-serif italic">{summaryLine}</p>
          </div>
          <TagInput label="ROLE KEYWORDS" tags={prefs.role_keywords} onChange={(t) => setPrefs({ ...prefs, role_keywords: t })} placeholder="e.g. Python, Data Analyst" />
          <TagInput label="LOCATION KEYWORDS" tags={prefs.location_keywords} onChange={(t) => setPrefs({ ...prefs, location_keywords: t })} placeholder="e.g. India, Bengaluru, Hyderabad" />
          <PrefsGroup label="WORKPLACE MODES" options={WORKPLACE_OPTIONS} selected={prefs.workplace_modes} onChange={(v) => setPrefs({ ...prefs, workplace_modes: v })} />
          <PrefsGroup label="EMPLOYMENT TYPES" options={EMPLOYMENT_OPTIONS} selected={prefs.employment_types} onChange={(v) => setPrefs({ ...prefs, employment_types: v })} />
          <PrefsGroup label="EXPERIENCE LEVELS" options={EXPERIENCE_OPTIONS} selected={prefs.experience_levels} onChange={(v) => setPrefs({ ...prefs, experience_levels: v })} />
          <div className="border-t border-hairline pt-4 space-y-3">
            <Checkbox label="Internships only" checked={prefs.internships_only} onChange={(e) => setPrefs({ ...prefs, internships_only: e.target.checked })} />
            <Checkbox label="Include listings with unknown details" hint="Listings that don't state pay, workplace, or level will still be shown." checked={prefs.include_unknown} onChange={(e) => setPrefs({ ...prefs, include_unknown: e.target.checked })} />
          </div>
          <PreferencesPayFields minimumPay={prefs.minimum_pay} error={payError} onChange={(pay) => setPrefs({ ...prefs, minimum_pay: pay })} />
          <div className="border-t border-hairline pt-4 flex items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!isDirty || (prefs.minimum_pay !== null && !isPayValid)} loading={saving}>Save preferences</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function PrefsGroup<T extends string>({
  label, options, selected, onChange,
}: {
  label: string; options: { value: T; label: string }[]; selected: T[]; onChange: (v: T[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="eyebrow mb-1.5">{label}</legend>
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <Checkbox key={opt.value} label={opt.label} checked={checked} onChange={() => {
            onChange(checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
          }} />
        );
      })}
    </fieldset>
  );
}
