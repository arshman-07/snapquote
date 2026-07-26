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

echo
echo "== Group C: App User A — cross-user & privilege (must be denied) =="
probe "GET B's quote by id"                     403\|404 GET   "/items/quotes/$QUOTE_B"      "$TOKEN_A"
probe "PATCH B's quote"                          403\|404 PATCH "/items/quotes/$QUOTE_B"      "$TOKEN_A" '{"grand_total":0}'
# KNOWN OPEN GAP (2026-07-26): this currently returns 200 — create rules can't
# traverse quote.user_created. Stays a FAIL until the compensating control lands
# (SECURITY.md §2.2a). Expectation kept at 403/404 so it flags loudly.
probe "POST item onto B's quote"                 403\|404 POST  /items/quote_items            "$TOKEN_A" "{\"quote\":$QUOTE_B,\"kind\":\"labour\",\"label\":\"x\",\"amount\":1}"
probe "DELETE own quote (no delete perm)"        403      DELETE "/items/quotes/$QUOTE_A"     "$TOKEN_A"
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
echo "== Result: $pass passed, $fail failed, ${skip} group(s) skipped =="
[[ "$fail" -eq 0 ]]
