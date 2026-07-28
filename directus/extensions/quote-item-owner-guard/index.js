/**
 * SnapQuote — quote_items ownership guard (Directus hook extension)
 *
 * Closes the gap found 2026-07-26 by scripts/probe-permissions.sh: an App User
 * could POST /items/quote_items with someone else's `quote` id and attach line
 * items to a quote they don't own. Directus create-time permission filters only
 * see the incoming payload, so they can't traverse the M2O to
 * `quote.user_created` — the check has to happen here, where we can load the row.
 *
 * The rule is deliberately thin: load the referenced quote *as the caller*, so
 * the existing (already correct) read scoping on `quotes`
 * (`user_created = $CURRENT_USER`) stays the single source of truth for
 * ownership. If the caller can't read the quote, ItemsService throws Directus's
 * own ForbiddenError and the write is rejected with a 403.
 *
 * Hand-written ESM — no build step. See ../README.md for deployment.
 */

export default ({ filter }, { services }) => {
  const { ItemsService } = services;

  // Create: the parent quote is mandatory, so an absent `quote` is refused.
  filter('quote_items.items.create', guard(ItemsService, { requireQuote: true }));

  // Update: `quote` only appears when the caller is re-parenting the item, and
  // pointing it at someone else's quote is the same hole by another route. App
  // Users have no quote_items Update permission today — this is here so the gap
  // doesn't quietly reopen the day that permission is granted.
  filter('quote_items.items.update', guard(ItemsService, { requireQuote: false }));
};

function guard(ItemsService, { requireQuote }) {
  return async (payload, _meta, { schema, accountability, database }) => {
    // No accountability object at all = an internal/system call (migrations,
    // flows), not user input — nothing to scope.
    if (!accountability) return payload;

    // Unauthenticated. The Public role has no quote_items create permission
    // anyway; refused here too rather than depending on that staying true.
    if (!accountability.user) throw forbidden();

    // createItems() batches: Directus fires this filter once per item, but
    // normalise in case a future code path hands us the whole array.
    const items = Array.isArray(payload) ? payload : [payload];

    // Same knex instance as the caller's transaction, so this read sees rows
    // created earlier in the same request (e.g. items nested under a new quote).
    const quotes = new ItemsService('quotes', { schema, accountability, knex: database });

    for (const item of items) {
      const quoteId = item?.quote;

      if (quoteId === undefined || quoteId === null) {
        // An item with no parent is unusable and could be re-parented later.
        if (requireQuote) throw forbidden();
        continue;
      }

      // Throws ForbiddenError when the quote isn't the caller's (or doesn't
      // exist — Directus deliberately doesn't distinguish the two).
      await quotes.readOne(quoteId, { fields: ['id'] });
    }

    return payload;
  };
}

/**
 * Directus identifies its own errors by duck-typing (`name === 'DirectusError'`
 * — see isDirectusError in @directus/errors), so we can return a proper 403
 * without importing that package. That keeps this extension dependency-free and
 * loadable with no build or npm install on the server. Worst case the shape
 * stops being recognised and this surfaces as a 500 — still blocked, still fails
 * closed.
 */
function forbidden() {
  const error = new Error("You don't have permission to access this.");
  error.name = 'DirectusError';
  error.code = 'FORBIDDEN';
  error.status = 403;
  error.extensions = {};
  return error;
}
