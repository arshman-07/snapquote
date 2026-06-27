// Phase 1 MOCK for the Materials step. This stands in for what will become a
// server-side call (Directus → AI + retailer/affiliate lookup, cached in
// Postgres). The SHAPE here is the agreed contract: the real endpoint will
// return this exact structure, so the screen won't change when it's wired up.
//
// Everything is deterministic from the job type + floor area, so a quote stays
// stable as the user moves back and forth between steps.

import { type Unit } from '@/constants/quote';

export type MaterialTier = 'budget' | 'standard' | 'premium';

// One purchasable line in a package: what it is, how much is needed, the price,
// and where to buy it (the buy URL becomes an affiliate link in Phase 3).
export type MaterialLineItem = {
  name: string;
  explanation: string;
  quantity: string;
  price: number;
  retailer: string;
  url: string;
};

// A whole-job package at one quality tier. `pricedAt` carries the freshness
// date so the UI can show "est. as of <date>" regardless of the cache TTL.
export type MaterialPackage = {
  tier: MaterialTier;
  title: string;
  tagline: string;
  items: MaterialLineItem[];
  subtotal: number;
  pricedAt: string;
};

type TierRecipe = {
  tier: MaterialTier;
  title: string;
  tagline: string;
  // The headline surface material (flooring / tile) for this tier.
  surface: { name: string; explanation: string; pricePerArea: number; retailer: string; url: string };
  // Prep layer (underlayment / thinset), priced per area unit.
  prep: { name: string; explanation: string; pricePerArea: number; retailer: string; url: string };
  // Paint, priced per gallon (~350 sq ft coverage).
  paint: { name: string; explanation: string; pricePerGallon: number; retailer: string; url: string };
  // Trim / baseboard, priced per linear unit along the perimeter.
  trim: { name: string; explanation: string; pricePerLength: number; retailer: string; url: string };
};

// Illustrative US products + prices across the three tiers. Replaced by live
// data in Phase 3.
const TIER_RECIPES: TierRecipe[] = [
  {
    tier: 'budget',
    title: 'Budget',
    tagline: 'Gets the job done for less',
    surface: {
      name: 'Vinyl plank flooring (LVP)',
      explanation: 'Durable, water-resistant click-lock planks — the most affordable solid option.',
      pricePerArea: 2.5,
      retailer: 'The Home Depot',
      url: 'https://www.homedepot.com/b/Flooring-Vinyl-Flooring-Luxury-Vinyl-Plank/N-5yc1vZc3of',
    },
    prep: {
      name: 'Foam underlayment',
      explanation: 'Basic moisture barrier and cushioning under the planks.',
      pricePerArea: 0.4,
      retailer: 'The Home Depot',
      url: 'https://www.homedepot.com/b/Flooring-Underlayment/N-5yc1vZaqns',
    },
    paint: {
      name: 'Contractor-grade interior paint',
      explanation: 'Single-coat wall paint that covers well for the price.',
      pricePerGallon: 22,
      retailer: 'Walmart',
      url: 'https://www.walmart.com/browse/home/interior-paint/',
    },
    trim: {
      name: 'Primed MDF baseboard',
      explanation: 'Inexpensive pre-primed trim for a clean edge.',
      pricePerLength: 1.2,
      retailer: 'The Home Depot',
      url: 'https://www.homedepot.com/b/Moulding-Millwork-Baseboards/N-5yc1vZaqyi',
    },
  },
  {
    tier: 'standard',
    title: 'Standard',
    tagline: 'Solid quality at a mid-range price',
    surface: {
      name: 'Glazed ceramic tile',
      explanation: 'Hard-wearing, easy-to-clean tile — a reliable middle-of-the-road choice.',
      pricePerArea: 5,
      retailer: "Lowe's",
      url: 'https://www.lowes.com/pl/Ceramic-tile-Tile-Flooring/4294612519',
    },
    prep: {
      name: 'Modified thinset mortar',
      explanation: 'Stronger bond and better moisture tolerance than the budget prep.',
      pricePerArea: 0.8,
      retailer: "Lowe's",
      url: 'https://www.lowes.com/pl/Mortar-Tile-installation-Tile-Flooring/4294612487',
    },
    paint: {
      name: 'Premium interior latex paint',
      explanation: 'Better coverage and a more durable, washable finish.',
      pricePerGallon: 38,
      retailer: 'Sherwin-Williams',
      url: 'https://www.sherwin-williams.com/homeowners/products/interior-paints',
    },
    trim: {
      name: 'Solid pine baseboard',
      explanation: 'Real wood trim that takes paint or stain cleanly.',
      pricePerLength: 2.4,
      retailer: "Lowe's",
      url: 'https://www.lowes.com/pl/Baseboard-Moulding-millwork-Building-supplies/4294612327',
    },
  },
  {
    tier: 'premium',
    title: 'Premium',
    tagline: 'High-end finishes built to last',
    surface: {
      name: 'Porcelain tile',
      explanation: 'Dense, low-porosity tile that resists wear, water, and staining for decades.',
      pricePerArea: 9,
      retailer: 'Floor & Decor',
      url: 'https://www.flooranddecor.com/porcelain-tile',
    },
    prep: {
      name: 'Uncoupling membrane + thinset',
      explanation: 'Prevents cracked tile over time — the pro-grade installation system.',
      pricePerArea: 1.8,
      retailer: 'Floor & Decor',
      url: 'https://www.flooranddecor.com/underlayment',
    },
    paint: {
      name: 'Designer low-VOC paint',
      explanation: 'Rich, low-odor finish with excellent durability and color depth.',
      pricePerGallon: 58,
      retailer: 'Benjamin Moore',
      url: 'https://www.benjaminmoore.com/en-us/interior-exterior-paints-stains',
    },
    trim: {
      name: 'Primed poplar baseboard',
      explanation: 'Smooth hardwood trim for a crisp, high-end edge.',
      pricePerLength: 3.6,
      retailer: 'The Home Depot',
      url: 'https://www.homedepot.com/b/Moulding-Millwork-Baseboards/N-5yc1vZaqyi',
    },
  },
];

// Build the three packages for the current job. Quantities are derived from the
// floor area (and an estimated perimeter) so the numbers feel grounded.
export function buildMaterialPackages(input: {
  jobType: string | null;
  area: number | null;
  unit: Unit;
}): MaterialPackage[] {
  const area = input.area && input.area > 0 ? input.area : 0;
  const areaUnit = input.unit === 'ft' ? 'sq ft' : 'm²';
  // Rough perimeter from a square-ish room, for trim length.
  const perimeter = area > 0 ? 4 * Math.sqrt(area) : 0;
  // Paint coverage ~350 sq ft per gallon; always at least one.
  const gallons = Math.max(1, Math.ceil(area / 350));
  const pricedAt = new Date().toISOString().slice(0, 10);

  return TIER_RECIPES.map((r) => {
    const items: MaterialLineItem[] = [
      {
        name: r.surface.name,
        explanation: r.surface.explanation,
        quantity: `${Math.round(area)} ${areaUnit}`,
        price: Math.round(area * r.surface.pricePerArea),
        retailer: r.surface.retailer,
        url: r.surface.url,
      },
      {
        name: r.prep.name,
        explanation: r.prep.explanation,
        quantity: `${Math.round(area)} ${areaUnit}`,
        price: Math.round(area * r.prep.pricePerArea),
        retailer: r.prep.retailer,
        url: r.prep.url,
      },
      {
        name: r.paint.name,
        explanation: r.paint.explanation,
        quantity: `${gallons} gal`,
        price: Math.round(gallons * r.paint.pricePerGallon),
        retailer: r.paint.retailer,
        url: r.paint.url,
      },
      {
        name: r.trim.name,
        explanation: r.trim.explanation,
        quantity: `${Math.round(perimeter)} ${input.unit}`,
        price: Math.round(perimeter * r.trim.pricePerLength),
        retailer: r.trim.retailer,
        url: r.trim.url,
      },
    ];

    return {
      tier: r.tier,
      title: r.title,
      tagline: r.tagline,
      items,
      subtotal: items.reduce((sum, i) => sum + i.price, 0),
      pricedAt,
    };
  });
}
