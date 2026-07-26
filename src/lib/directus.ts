import { authentication, createDirectus, rest } from '@directus/sdk';

import { authStorage } from '@/lib/auth-storage';

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

// Custom fields we add to the built-in users collection. Declaring
// `directus_users` in the Schema lets the SDK merge these onto the standard
// user type, so `updateMe`/`readMe` accept and return them. Set once at sign-up;
// `user_type` decides which of the other two apply — homeowner → `full_name`
// (their name); contractor → `company_name` + `full_name` (the owner's name).
export type AppUserProfile = {
  id: string;
  user_type: 'contractor' | 'homeowner' | null;
  full_name: string | null;
  company_name: string | null;
};

export type Schema = {
  room_types: RoomType[];
  labour_rates: LabourRate[];
  quotes: Quote[];
  quote_items: QuoteItem[];
  directus_users: AppUserProfile[];
};

// Base URL comes from EXPO_PUBLIC_DIRECTUS_URL (inlined at build time by Expo).
// Fail loudly in dev if it's missing rather than firing requests at undefined.
const directusUrl = process.env.EXPO_PUBLIC_DIRECTUS_URL;
if (!directusUrl) {
  throw new Error('EXPO_PUBLIC_DIRECTUS_URL is not set — check the .env file.');
}

// Authenticated REST client. `json` mode because React Native has no cookies;
// the SecureStore-backed adapter keeps the refresh token on-device and the
// access token in memory (see auth-storage.ts). autoRefresh renews the access
// token shortly before it expires during a session; restoring the session on a
// cold launch is the auth context's job (it calls `directus.refresh()`).
// Until login exists, requests simply carry no token and fall through to the
// Public policy — same behaviour as the old anonymous client.
export const directus = createDirectus<Schema>(directusUrl)
  .with(authentication('json', { storage: authStorage, autoRefresh: true }))
  .with(rest());
