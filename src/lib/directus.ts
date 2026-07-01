import { createDirectus, rest } from '@directus/sdk';

// Typed shape of the four Phase-2 collections. This drives the SDK's return
// types — `readItems('room_types')` etc. infer from here, so keep these field
// names in lockstep with the Directus data model (and with QuoteDraft on the
// frontend side).

export type RoomType = {
  id: number;
  name: string;
  sort: number | null;
  // Not exposed by the Public read policy, so optional on the client.
  status?: string;
};

export type LabourRate = {
  id: number;
  daily_rate: number;
  currency: string;
};

// A saved quote. Dimensions are stored as numbers here (the wizard keeps them
// as raw strings while editing, then parses on save).
export type Quote = {
  id: number;
  job_type: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  unit: string;
  material_brief: string | null;
  material_zip: string | null;
  selected_tier: 'budget' | 'standard' | 'premium' | null;
  materials_total: number | null;
  labour_total: number | null;
  grand_total: number | null;
  status: string;
  date_created: string;
  user_created: string;
};

export type QuoteItem = {
  id: number;
  quote: number; // M2O → quotes.id
  kind: 'material' | 'labour';
  label: string;
  amount: number;
};

export type Schema = {
  room_types: RoomType[];
  labour_rates: LabourRate[];
  quotes: Quote[];
  quote_items: QuoteItem[];
};

// Base URL comes from EXPO_PUBLIC_DIRECTUS_URL (inlined at build time by Expo).
// Fail loudly in dev if it's missing rather than firing requests at undefined.
const directusUrl = process.env.EXPO_PUBLIC_DIRECTUS_URL;
if (!directusUrl) {
  throw new Error('EXPO_PUBLIC_DIRECTUS_URL is not set — check the .env file.');
}

// Unauthenticated REST client for now: reads rely on the Public policy's read
// access to room_types. We'll add `.with(authentication())` + login as its own
// section when the app grows real users.
export const directus = createDirectus<Schema>(directusUrl).with(rest());
