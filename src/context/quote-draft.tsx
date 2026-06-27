import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { MATERIAL_CATALOG, type Unit } from '@/constants/quote';

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
  // IDs from MATERIAL_CATALOG that the user selected.
  selectedMaterialIds: string[];
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
  selectedMaterialIds: [],
  labourDays: '',
  labourDayRate: '',
};

type QuoteDraftContextValue = {
  draft: QuoteDraft;
  // Merge a partial update into the draft.
  updateDraft: (patch: Partial<QuoteDraft>) => void;
  // Toggle a material on/off in the selection.
  toggleMaterial: (id: string) => void;
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

  const toggleMaterial = useCallback(
    (id: string) =>
      setDraft((d) => ({
        ...d,
        selectedMaterialIds: d.selectedMaterialIds.includes(id)
          ? d.selectedMaterialIds.filter((m) => m !== id)
          : [...d.selectedMaterialIds, id],
      })),
    [],
  );

  const reset = useCallback(() => setDraft(INITIAL_DRAFT), []);

  const value = useMemo(
    () => ({ draft, updateDraft, toggleMaterial, reset }),
    [draft, updateDraft, toggleMaterial, reset],
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

export function getMaterialsTotal(draft: QuoteDraft): number {
  return MATERIAL_CATALOG.filter((m) => draft.selectedMaterialIds.includes(m.id)).reduce(
    (sum, m) => sum + m.unitPrice,
    0,
  );
}

export function getLabourTotal(draft: QuoteDraft): number {
  const days = parseFloat(draft.labourDays);
  const rate = parseFloat(draft.labourDayRate);
  return days > 0 && rate > 0 ? days * rate : 0;
}

export function getQuoteTotal(draft: QuoteDraft): number {
  return getMaterialsTotal(draft) + getLabourTotal(draft);
}
