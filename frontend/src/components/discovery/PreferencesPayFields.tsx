"use client";

import React from "react";
import { Checkbox, Select } from "@/components/ui";
import type { PayFloor, PayPeriod } from "@/lib/api/types";

export interface PreferencesPayFieldsProps {
  minimumPay: PayFloor | null | undefined;
  error?: string | null;
  onChange: (pay: PayFloor | null) => void;
}

const PAY_PERIODS: { value: PayPeriod; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
  { value: "year", label: "Per year" },
];

const CURRENCY_OPTIONS = ["GBP", "USD", "EUR", "CAD", "AUD"];

export function PreferencesPayFields({ minimumPay, error, onChange }: PreferencesPayFieldsProps) {
  const isEnabled = minimumPay !== null;

  return (
    <div className="border-t border-hairline pt-4 space-y-3">
      <Checkbox
        label="Minimum compensation threshold"
        checked={isEnabled}
        onChange={(e) => {
          onChange(
            e.target.checked
              ? { amount: 30000, currency: "GBP", period: "year" }
              : null
          );
        }}
      />
      {minimumPay && (
        <div className="space-y-2 pl-6">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="pref-pay-amount" className="eyebrow block mb-1">
                Amount
              </label>
              <input
                id="pref-pay-amount"
                type="number"
                min={0}
                step={1000}
                value={minimumPay.amount || ""}
                onChange={(e) => {
                  const amount = Math.max(0, parseFloat(e.target.value) || 0);
                  onChange({ ...minimumPay, amount });
                }}
                className="block w-full rounded-md border border-hairline bg-paper-raised px-2.5 py-1 text-sm text-ink font-mono"
              />
            </div>
            <div>
              <label htmlFor="pref-pay-curr" className="eyebrow block mb-1">
                Currency
              </label>
              <Select
                id="pref-pay-curr"
                value={minimumPay.currency}
                onChange={(e) => {
                  onChange({ ...minimumPay, currency: e.target.value });
                }}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="pref-pay-period" className="eyebrow block mb-1">
                Period
              </label>
              <Select
                id="pref-pay-period"
                value={minimumPay.period}
                onChange={(e) => {
                  onChange({ ...minimumPay, period: e.target.value as PayPeriod });
                }}
              >
                {PAY_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-brick font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}
