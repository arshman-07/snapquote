#!/usr/bin/env bash
#
# SnapQuote — App User permission probing (SECURITY.md §3.1)
#
# Runs the Group A–D probe matrix against the live Directus API and prints
# PASS/FAIL vs the expected HTTP status for each request. Re-run after every
# permissions change.
#
# Run in Git Bash:  bash probe-permissions.sh
# (curl must be the real curl, which Git Bash provides.)
#
# You run this against your own network — it needs two App User accounts.
# Nothing here is committed to the repo; keep this file in the scratchpad.
#
# ─── CONFIG: fill these in ───────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://100.64.144.41:8056}"   # Tailscale; or the :8056 LAN address

EMAIL_A="${EMAIL_A:-userA@example.com}"              # App User A
PASS_A="${PASS_A:-changeme}"
EMAIL_B="${EMAIL_B:-userB@example.com}"              # App User B
PASS_B="${PASS_B:-changeme}"

# Set true once the directus_users profile fields + App User self Read/Update
# permissions exist (the user_type task backend step). Leave false and the
# /users/me profile probes are skipped instead of reported as failures.
RUN_PROFILE_PROBES="${RUN_PROFILE_PROBES:-false}"
# ─────────────────────────────────────────────────────────────────────────────

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
pass=0
fail=0
skip=0

# probe DESC  EXPECTED_REGEX  METHOD  PATH  TOKEN(none|garbage|<jwt>)  [BODY]
probe() {
  local desc="$1" expected="$2" method="$3" path="$4" token="$5" body="${6:-}"
  local args=(-s -o "$TMP" -w '%{http_code}' -X "$method")
  case "$token" in
    none) ;;
    garbage) args+=(-H "Authorization: Bearer garbage.not.a.jwt") ;;
    *) args+=(-H "Authorization: Bearer $token") ;;
  esac
  [[ -n "$body" ]] && args+=(-H "Content-Type: application/json" -d "$body")
  local code
  code="$(curl "${args[@]}" "$BASE_URL$path")"
  if [[ "$code" =~ ^($expected)$ ]]; then
    printf '  \033[32mPASS\033[0m  %-52s -> %s\n' "$desc" "$code"
    ((pass++))
  else
    printf '  \033[31mFAIL\033[0m  %-52s -> %s (expected %s)\n' "$desc" "$code" "$expected"
    ((fail++))
  fi
}

extract() { grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed "s/\"$1\":\"//;s/\"$//"; }
first_id() { grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+'; }

login() {
  curl -s -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$BASE_URL/auth/login" | extract access_token
}

echo "== Setup =="
TOKEN_A="$(login "$EMAIL_A" "$PASS_A")"
TOKEN_B="$(login "$EMAIL_B" "$PASS_B")"
if [[ -z "$TOKEN_A" || -z "$TOKEN_B" ]]; then
  echo "  Could not log in both accounts — check BASE_URL and credentials." >&2
  exit 1
fi
echo "  Logged in A and B."

# A quote owned by each account (reuse an existing one; create if none).
QUOTE_A="$(curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/items/quotes?limit=1&fields=id" | first_id)"
QUOTE_B="$(curl -s -H "Authorization: Bearer $TOKEN_B" "$BASE_URL/items/quotes?limit=1&fields=id" | first_id)"
[[ -z "$QUOTE_A" ]] && QUOTE_A="$(curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"job_type":"probe","unit":"ft"}' "$BASE_URL/items/quotes?fields=id" | first_id)"
[[ -z "$QUOTE_B" ]] && QUOTE_B="$(curl -s -X POST -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' -d '{"job_type":"probe","unit":"ft"}' "$BASE_URL/items/quotes?fields=id" | first_id)"
# B's user id, read off B's own quote (no directus_users perms needed for this).
USER_B="$(curl -s -H "Authorization: Bearer $TOKEN_B" "$BASE_URL/items/quotes/$QUOTE_B?fields=user_created" | extract user_created)"
echo "  quoteA=$QUOTE_A (owned by A)   quoteB=$QUOTE_B (owned by B)   userB=$USER_B"

echo
echo "== Group A: unauthenticated =="
probe "GET room_types (public surface)"        200      GET  /items/room_types            none
probe "GET labour_rates (not public)"          403      GET  /items/labour_rates          none
probe "GET quotes"                             403      GET  /items/quotes                 none
probe "GET quote_items"                        403      GET  /items/quote_items            none
probe "POST quotes (create)"                   403      POST /items/quotes                 none '{"job_type":"x","unit":"ft"}'
probe "POST quote_items (create)"              403      POST /items/quote_items            none '{"kind":"labour","label":"x","amount":1}'
probe "GET /users"                             403      GET  /users                        none
probe "GET /users/me"                          401      GET  /users/me                     none

echo
echo "== Group B: App User A — allowed on own data =="
probe "GET room_types"                         200      GET  /items/room_types             "$TOKEN_A"
probe "GET labour_rates"                        200      GET  /items/labour_rates           "$TOKEN_A"
probe "GET own quotes list"                     200      GET  "/items/quotes?fields=id"      "$TOKEN_A"
probe "PATCH own quote"                          200      PATCH "/items/quotes/$QUOTE_A"     "$TOKEN_A" '{"job_type":"probe-edit"}'
probe "POST create own quote"                    200      POST  "/items/quotes?fields=id"    "$TOKEN_A" '{"job_type":"probe","unit":"ft"}'
# probe() leaves the response body in $TMP — capture what we just created so the
# run can clean up after itself. Without this the suite accumulates a quote and a
# line item on user A every single time it runs.
CREATED_QUOTE="$(first_id < "$TMP")"
# Regression check for the quote-item-owner-guard hook: the guard must not block
# legitimate saves (the app's useSaveQuote posts items onto the quote it just
# created). The deny probes below wouldn't catch a guard that rejects everything.
probe "POST item onto own quote"                 200      POST  /items/quote_items           "$TOKEN_A" "{\"quote\":$QUOTE_A,\"kind\":\"labour\",\"label\":\"probe\",\"amount\":1}"
CREATED_ITEM="$(first_id < "$TMP")"

echo
echo "== Group C: App User A — cross-user & privilege (must be denied) =="
probe "GET B's quote by id"                     403\|404 GET   "/items/quotes/$QUOTE_B"      "$TOKEN_A"
probe "PATCH B's quote"                          403\|404 PATCH "/items/quotes/$QUOTE_B"      "$TOKEN_A" '{"grand_total":0}'
# Was the open gap found 2026-07-26 (returned 200 — create rules can't traverse
# quote.user_created). Enforced by the quote-item-owner-guard hook extension
# (directus/README.md); these two FAIL until it is deployed on the devbox.
probe "POST item onto B's quote"                 403\|404 POST  /items/quote_items            "$TOKEN_A" "{\"quote\":$QUOTE_B,\"kind\":\"labour\",\"label\":\"x\",\"amount\":1}"
probe "POST item with no quote"                  403\|404 POST  /items/quote_items            "$TOKEN_A" '{"kind":"labour","label":"x","amount":1}'
# Delete on `quotes` was granted 2026-07-27 (quote deletion is now a real app
# feature), so this expects 204 rather than the old 403. It runs against a quote
# created purely as a delete target: pointing it at $QUOTE_A would destroy a
# real quote on every single run, which is what happened the first time the
# permission landed.
DELETE_TARGET="$(curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"job_type":"probe-delete-target","unit":"ft"}' "$BASE_URL/items/quotes?fields=id" | first_id)"
probe "DELETE own quote (granted, owner-scoped)"  204      DELETE "/items/quotes/$DELETE_TARGET" "$TOKEN_A"
probe "DELETE B's quote"                         403\|404 DELETE "/items/quotes/$QUOTE_B"     "$TOKEN_A"
# GET /users responds 200 for App Users but self-filters the body; the content
# assertion below is the real isolation check (status alone isn't meaningful).
probe "GET /users (200, self-filtered)"          200      GET   /users                        "$TOKEN_A"
probe "GET B's user record"                      403\|404 GET   "/users/$USER_B"              "$TOKEN_A"
probe "PATCH B's user record"                    403\|404 PATCH "/users/$USER_B"              "$TOKEN_A" '{"full_name":"hacked"}'
probe "GET /roles (system)"                      403      GET   /roles                         "$TOKEN_A"
probe "GET /policies (system)"                   403      GET   /policies                       "$TOKEN_A"
probe "GET /permissions (system)"                403      GET   /permissions                    "$TOKEN_A"
probe "PATCH /users/me role (escalation)"        403      PATCH /users/me                       "$TOKEN_A" '{"role":"00000000-0000-0000-0000-000000000000"}'
probe "PATCH /users/me email (not allowed field)" 403     PATCH /users/me                       "$TOKEN_A" '{"email":"probe-hijack@example.com"}'
probe "PATCH /users/me password (not allowed)"    403     PATCH /users/me                       "$TOKEN_A" '{"password":"probe-newpass-123"}'

# Cross-user isolation, asserted on list contents (not just status):
echo "  -- isolation: B's quote id must not appear in A's list --"
if curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/items/quotes?limit=-1&fields=id" \
     | grep -oE '"id":[0-9]+' | grep -qx "\"id\":$QUOTE_B"; then
  printf '  \033[31mFAIL\033[0m  %-52s -> B visible to A\n' "A's list excludes B's quote"; ((fail++))
else
  printf '  \033[32mPASS\033[0m  %-52s -> hidden\n' "A's list excludes B's quote"; ((pass++))
fi

# GET /users self-filtering: B's user id must not appear in A's /users response.
echo "  -- isolation: B's user id must not appear in A's /users response --"
if curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/users?limit=-1&fields=id" \
     | grep -qF "$USER_B"; then
  printf '  \033[31mFAIL\033[0m  %-52s -> B visible to A\n' "A's /users excludes B"; ((fail++))
else
  printf '  \033[32mPASS\033[0m  %-52s -> hidden\n' "A's /users excludes B"; ((pass++))
fi

# Cross-user READ of a line item. This is the gap that let a real bug live for a
# day at 35/35 green: `quote_items` Read was scoped on the item's own
# `user_created` instead of the relational `quote.user_created`, so an item
# planted on your quote by someone else was visible to *them* and invisible to
# *you*. Every probe above only checked that cross-user *creation* is blocked.
#
# B creates an item on B's own quote; A must not be able to see it, by id or via
# a filtered query. Cleaned up afterwards by B.
echo "  -- isolation: an item on B's quote must be invisible to A --"
PLANTED="$(curl -s -X POST -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' \
  -d "{\"quote\":$QUOTE_B,\"kind\":\"material\",\"label\":\"probe-isolation\",\"amount\":1}" \
  "$BASE_URL/items/quote_items?fields=id" | first_id)"

if [[ -z "$PLANTED" ]]; then
  printf '  \033[31mFAIL\033[0m  %-52s -> setup failed (B could not create)\n' "B's item invisible to A"; ((fail++))
else
  probe "GET B's item by id"                     403\|404 GET "/items/quote_items/$PLANTED" "$TOKEN_A"
  if curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/items/quote_items?limit=-1&fields=id" \
       | grep -oE '"id":[0-9]+' | grep -qx "\"id\":$PLANTED"; then
    printf '  \033[31mFAIL\033[0m  %-52s -> B'"'"'s item visible to A\n' "A's item list excludes B's item"; ((fail++))
  else
    printf '  \033[32mPASS\033[0m  %-52s -> hidden\n' "A's item list excludes B's item"; ((pass++))
  fi
  # The inverse of the same bug: the owner must be able to see it.
  if curl -s -H "Authorization: Bearer $TOKEN_B" "$BASE_URL/items/quote_items?limit=-1&fields=id" \
       | grep -oE '"id":[0-9]+' | grep -qx "\"id\":$PLANTED"; then
    printf '  \033[32mPASS\033[0m  %-52s -> visible\n' "B sees items on B's own quote"; ((pass++))
  else
    printf '  \033[31mFAIL\033[0m  %-52s -> owner cannot see own item\n' "B sees items on B's own quote"; ((fail++))
  fi
  curl -s -o /dev/null -X DELETE -H "Authorization: Bearer $TOKEN_B" "$BASE_URL/items/quote_items/$PLANTED"
fi

echo
echo "== Group D: token integrity =="
probe "GET quotes with garbage token"            401      GET  /items/quotes                  garbage

if [[ "$RUN_PROFILE_PROBES" == "true" ]]; then
  echo
  echo "== Group E: profile fields (needs directus_users self-permissions) =="
  probe "GET /users/me (self read)"              200      GET   /users/me                     "$TOKEN_A"
  probe "PATCH /users/me full_name (allowed)"    200      PATCH /users/me                      "$TOKEN_A" '{"full_name":"Probe Name"}'
  probe "PATCH /users/me user_type (allowed)"    200      PATCH /users/me                      "$TOKEN_A" '{"user_type":"homeowner"}'
else
  echo
  echo "== Group E: profile fields — SKIPPED (set RUN_PROFILE_PROBES=true after the directus_users backend step) =="
  ((skip++))
fi

echo
echo "== Group F: per-field permissions on quotes =="
# Directus field permissions are per-operation allow-lists, and every probe above
# is operation-level — so a field missing from Read or Update passes the rest of
# this suite while breaking the app. That has now happened twice: `job_type`
# missing from Update (2026-07-26) and `customer_name` missing from all three
# (2026-07-27, which 403'd the entire quote list because Directus rejects a whole
# request over one unreadable field).
#
# Reads use the exact field sets the app sends. Writes run against a throwaway
# quote, then delete it, so no real data is touched.
QUOTE_LIST_FIELDS='id,customer_name,job_type,length,width,unit,grand_total,date_created,status'
QUOTE_DETAIL_FIELDS='id,customer_name,job_type,length,width,height,unit,material_brief,material_zip,selected_tier,materials_total,labour_days,labour_day_rate,labour_total,grand_total,status'
probe "READ app list fields (useRecentQuotes)"   200 GET "/items/quotes?limit=1&fields=$QUOTE_LIST_FIELDS"   "$TOKEN_A"
probe "READ app detail fields (useQuote)"        200 GET "/items/quotes?limit=1&fields=$QUOTE_DETAIL_FIELDS" "$TOKEN_A"

FIELD_TARGET="$(curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"job_type":"probe-field-target","unit":"ft"}' "$BASE_URL/items/quotes?fields=id" | first_id)"
if [[ -z "$FIELD_TARGET" ]]; then
  printf '  \033[31mFAIL\033[0m  %-52s -> could not create probe target\n' "per-field UPDATE probes"; ((fail++))
else
  # Every field the wizard writes back on save. Keep in step with
  # buildQuotePayload() in src/lib/quote-payload.ts.
  for entry in \
    'customer_name:"probe"' 'job_type:"probe"' 'length:1' 'width:1' 'height:1' 'unit:"ft"' \
    'material_brief:"probe"' 'material_zip:"00000"' 'selected_tier:"standard"' \
    'materials_total:1' 'labour_days:1' 'labour_day_rate:1' 'labour_total:1' \
    'grand_total:1' 'status:"draft"'
  do
    fname="${entry%%:*}"; fval="${entry#*:}"
    probe "UPDATE $fname" 200 PATCH "/items/quotes/$FIELD_TARGET" "$TOKEN_A" "{\"$fname\":$fval}"
  done
  curl -s -o /dev/null -X DELETE -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/items/quotes/$FIELD_TARGET"
fi

echo
echo "== Cleanup =="
# Remove the rows the probes created. Everything else the script touches is
# either patched in place with harmless values or already deleted by the probe
# that created it. Best-effort: a failure here doesn't fail the run, it just
# leaves a row behind.
cleanup() { # DESC  METHOD_PATH  TOKEN
  [[ -z "$2" ]] && return
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "Authorization: Bearer $3" "$BASE_URL$2")"
  printf '  %-54s -> %s\n' "$1" "$code"
}
cleanup "delete probe-created line item"  "${CREATED_ITEM:+/items/quote_items/$CREATED_ITEM}" "$TOKEN_A"
cleanup "delete probe-created quote"      "${CREATED_QUOTE:+/items/quotes/$CREATED_QUOTE}"     "$TOKEN_A"

echo
echo "== Result: $pass passed, $fail failed, ${skip} group(s) skipped =="
[[ "$fail" -eq 0 ]]
