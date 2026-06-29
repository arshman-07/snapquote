import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { type Unit } from '@/constants/quote';
import {
  buildMaterialPackages,
  type MaterialPackage,
  type MaterialTier,
} from '@/constants/materials-mock';

// The single draft the whole wizard reads from and writes to. Dimensions are
// kept as raw strings so the TextInputs stay controlled while the user types
// (including partial / empty values). Everything starts empty.
export type QuoteDraft = {
  jobType: string | null;
  unit: Unit;
  length: string;
  width: string;
  height: string;
  // Phase 1 has no real camera capture — this just records that the user
  // tapped through the (placeholder) photo step.
  photoAdded: boolean;
  // Free-text description of the work, fed to the (future) AI material lookup.
  materialBrief: string;
  // Optional US ZIP for regional pricing (placeholder in Phase 1).
  materialZip: string;
  // Which of the three material packages the user picked.
  selectedTier: MaterialTier | null;
  // Labour is priced as days on site × a daily rate (USD).
  labourDays: string;
  labourDayRate: string;
};

const INITIAL_DRAFT: QuoteDraft = {
  jobType: null,
  unit: 'ft',
  length: '',
  width: '',
  height: '',
  photoAdded: false,
  materialBrief: '',
  materialZip: '',
  selectedTier: null,
  labourDays: '',
  labourDayRate: '',
};

type QuoteDraftContextValue = {
  draft: QuoteDraft;
  // Merge a partial update into the draft.
  updateDraft: (patch: Partial<QuoteDraft>) => void;
  // Clear everything (e.g. after finishing or abandoning a quote).
  reset: () => void;
};

const QuoteDraftContext = createContext<QuoteDraftContextValue | null>(null);

export function QuoteDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuoteDraft>(INITIAL_DRAFT);

  const updateDraft = useCallback(
    (patch: Partial<QuoteDraft>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  const reset = useCallback(() => setDraft(INITIAL_DRAFT), []);

  const value = useMemo(
    () => ({ draft, updateDraft, reset }),
    [draft, updateDraft, reset],
  );

  return <QuoteDraftContext.Provider value={value}>{children}</QuoteDraftContext.Provider>;
}

export function useQuoteDraft() {
  const ctx = useContext(QuoteDraftContext);
  if (!ctx) {
    throw new Error('useQuoteDraft must be used within a QuoteDraftProvider');
  }
  return ctx;
}

// ---- Derived values -------------------------------------------------------
// Shared so every step computes the quote the same way.

export function getArea(draft: QuoteDraft): number | null {
  const length = parseFloat(draft.length);
  const width = parseFloat(draft.width);
  return length > 0 && width > 0 ? length * width : null;
}

// The chosen material package, rebuilt deterministically from the draft so it
// stays in sync if dimensions change. Null until the user picks a tier. The
// Summary step uses this for the package's line items + title; the totals
// helpers below reuse it for the subtotal.
export function getSelectedPackage(draft: QuoteDraft): MaterialPackage | null {
  if (!draft.selectedTier) return null;
  return (
    buildMaterialPackages({
      jobType: draft.jobType,
      area: getArea(draft),
      unit: draft.unit,
    }).find((p) => p.tier === draft.selectedTier) ?? null
  );
}

export function getMaterialsTotal(draft: QuoteDraft): number {
  return getSelectedPackage(draft)?.subtotal ?? 0;
}

export function getLabourTotal(draft: QuoteDraft): number {
  const days = parseFloat(draft.labourDays);
  const rate = parseFloat(draft.labourDayRate);
  return days > 0 && rate > 0 ? days * rate : 0;
}

export function getQuoteTotal(draft: QuoteDraft): number {
  return getMaterialsTotal(draft) + getLabourTotal(draft);
}
