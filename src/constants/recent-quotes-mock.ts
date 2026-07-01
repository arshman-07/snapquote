// Phase 1 MOCK for the Home screen's "Recent quotes" list. Static sample data
// standing in for what will become a Directus-backed query of the current
// company's saved quotes. The SHAPE here is the agreed contract: the real
// endpoint will return this exact structure, so the screen won't change when
// it's wired up in Phase 2.

import { type Unit } from '@/constants/quote';

// One saved quote, summarised for a list row. `total` is the pre-computed grand
// total (materials + labour) so the list doesn't need the full breakdown.
export type RecentQuote = {
  id: string;
  jobType: string;
  area: number;
  unit: Unit;
  total: number;
  // ISO date the quote was created — formatted for display on the row.
  dateISO: string;
};

export const RECENT_QUOTES: RecentQuote[] = [
  { id: 'q-1042', jobType: 'Bathroom', area: 60, unit: 'ft', total: 4200, dateISO: '2026-06-28' },
  { id: 'q-1041', jobType: 'Kitchen', area: 180, unit: 'ft', total: 12750, dateISO: '2026-06-25' },
  { id: 'q-1039', jobType: 'Living room', area: 240, unit: 'ft', total: 8900, dateISO: '2026-06-21' },
  { id: 'q-1036', jobType: 'Office', area: 320, unit: 'ft', total: 15400, dateISO: '2026-06-18' },
];
