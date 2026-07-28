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
  // Optional label for the quote — whatever the customer calls it. Set on the
  // Summary step and editable afterwards from the saved-quote lists.
  customerName: string;
  // The chosen room type: `jobTypeId` is the stable Directus room_types.id
  // (saved to the quote / used for future room-keyed config), `jobType` is its
  // display name that the rest of the wizard renders. Both set together when a
  // chip is picked; both null until then.
  jobTypeId: number | null;
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
  // Quotes save as drafts unless the user marks one final on the Summary step.
  // Part of the draft (rather than Summary-local state) so reopening a saved
  // quote for editing restores the toggle instead of silently resetting it.
  status: 'draft' | 'final';
};

const INITIAL_DRAFT: QuoteDraft = {
  customerName: '',
  jobTypeId: null,
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
  status: 'draft',
};

type QuoteDraftContextValue = {
  draft: QuoteDraft;
  // Merge a partial update into the draft.
  updateDraft: (patch: Partial<QuoteDraft>) => void;
  // Clear everything (e.g. after finishing or abandoning a quote).
  reset: () => void;
  // Set when the wizard is editing an already-saved quote rather than creating
  // one. Summary branches on this to PATCH instead of POST.
  editingId: number | null;
  // Load a saved quote into the wizard. Replaces the draft wholesale.
  hydrate: (draft: QuoteDraft, quoteId: number) => void;
};

const QuoteDraftContext = createContext<QuoteDraftContextValue | null>(null);

export function QuoteDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuoteDraft>(INITIAL_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);

  const updateDraft = useCallback(
    (patch: Partial<QuoteDraft>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  const reset = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setEditingId(null);
  }, []);

  const hydrate = useCallback((next: QuoteDraft, quoteId: number) => {
    setDraft(next);
    setEditingId(quoteId);
  }, []);

  const value = useMemo(
    () => ({ draft, updateDraft, reset, editingId, hydrate }),
    [draft, updateDraft, reset, editingId, hydrate],
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

// True once the user has entered anything at all. Drives the "discard?" prompt
// when they close the flow early — an untouched draft is dismissed silently,
// since there is nothing to lose and a confirm dialog would just be friction.
//
// Compared field-by-field against the initial draft rather than by a dirty flag,
// so undoing an edit (e.g. clearing a typed dimension) correctly reads as clean.
export function isDraftDirty(draft: QuoteDraft): boolean {
  return (Object.keys(INITIAL_DRAFT) as (keyof QuoteDraft)[]).some(
    (key) => draft[key] !== INITIAL_DRAFT[key],
  );
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
