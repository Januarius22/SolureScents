"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Check, Clock } from "lucide-react";
import type { DateRangePreset } from "../utils/date-range";

interface Option {
  id: DateRangePreset | "custom";
  label: string;
  description: string;
}

const PRESET_OPTIONS: Option[] = [
  { id: "today", label: "Today", description: "Current day in Lagos" },
  { id: "yesterday", label: "Yesterday", description: "Full prior 24 hours" },
  { id: "7d", label: "Last 7 Days", description: "Past 7 calendar days" },
  { id: "14d", label: "Last 14 Days", description: "Past 14 calendar days" },
  { id: "30d", label: "Last 30 Days", description: "Standard 30-day reporting window (Default)" },
  { id: "90d", label: "Last 90 Days", description: "Past quarter of operations" },
  { id: "this_month", label: "This Month", description: "1st of current month to now" },
  { id: "last_month", label: "Last Month", description: "Full preceding calendar month" },
  { id: "this_year", label: "This Year", description: "Jan 1 of current year to now" },
  { id: "custom", label: "Custom Date Range", description: "Select specific start & end dates" },
];

interface AnalyticsDateFilterProps {
  currentRange?: string;
  currentFrom?: string;
  currentTo?: string;
  activeLabel: string;
}

export function AnalyticsDateFilter({
  currentRange = "30d",
  currentFrom = "",
  currentTo = "",
  activeLabel,
}: AnalyticsDateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(currentRange);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(currentRange === "custom");
  const [customFrom, setCustomFrom] = useState<string>(currentFrom);
  const [customTo, setCustomTo] = useState<string>(currentTo);

  const applyRange = (rangeId: string) => {
    setSelectedId(rangeId);
    if (rangeId === "custom") {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    setIsOpen(false);

    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", rangeId);
    sp.delete("from");
    sp.delete("to");
    router.push(`/admin/analytics?${sp.toString()}`);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setIsOpen(false);

    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", "custom");
    sp.set("from", customFrom);
    sp.set("to", customTo);
    router.push(`/admin/analytics?${sp.toString()}`);
  };

  const fallbackOption: Option = {
    id: "30d",
    label: "Last 30 Days",
    description: "Standard 30-day reporting window (Default)",
  };
  const activeOption = PRESET_OPTIONS.find((o) => o.id === selectedId) ?? fallbackOption;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex min-h-10 items-center gap-2.5 border border-charcoal/20 bg-white px-3.5 py-2 text-xs font-semibold tracking-wider text-charcoal uppercase shadow-xs transition hover:border-gold hover:text-gold"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <Calendar size={14} className="text-gold" />
          <span>Period:</span>
          <span className="font-bold text-charcoal">{activeLabel || activeOption.label}</span>
          <ChevronDown
            size={13}
            className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <span className="inline-flex items-center gap-1 rounded bg-ivory px-2.5 py-1 text-[11px] font-medium text-muted">
          <Clock size={11} className="text-gold" />
          <span>Africa/Lagos (UTC+1)</span>
        </span>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-0 top-full z-40 mt-2 w-80 sm:w-96 rounded border border-charcoal/20 bg-white p-3 shadow-xl">
            <div className="mb-2 border-b border-charcoal/10 pb-2">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-gold uppercase">
                Select Reporting Period
              </p>
              <p className="text-[11px] text-muted">
                Updates all financial KPIs, best-seller lists, and volume horizons.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = selectedId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyRange(opt.id)}
                    className={`flex w-full items-start justify-between rounded p-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-charcoal text-pearl"
                        : "hover:bg-ivory text-charcoal"
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{opt.label}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? "text-pearl/70" : "text-muted"
                        }`}
                      >
                        {opt.description}
                      </span>
                    </div>
                    {isSelected && <Check size={14} className="text-gold shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Form */}
            {isCustomMode && (
              <form onSubmit={handleCustomSubmit} className="mt-3 border-t border-charcoal/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-charcoal">
                  Custom Range Dates
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      required
                      className="w-full border border-charcoal/20 px-2 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">End Date</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      required
                      className="w-full border border-charcoal/20 px-2 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      applyRange("30d");
                    }}
                    className="border border-charcoal/20 px-3 py-1 text-xs text-muted hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-charcoal px-4 py-1 text-xs font-semibold uppercase tracking-wider text-pearl hover:bg-gold hover:text-charcoal transition"
                  >
                    Apply Range
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
