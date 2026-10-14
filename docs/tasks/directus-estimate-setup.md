# Directus estimate setup: copy-able specs

The reference tables for Phase 3 section 1. The step-by-step walkthrough is
`phase3-section1-checklist.md`; this file has the same specs in table form.
Interface names are as they appear in the Directus 11 field picker.

## 1. `estimate_requests` (17 fields)

Create the collection first: primary key `id` = **Generated UUID**. Under optional system
fields, tick **Created On** (`date_created`) and **Created By** (`user_created`) only.

| # | Key | Interface | Type | Required | Nullable | Default | Create (8) | Read (13) |
|---|---|---|---|---|---|---|---|---|
| 1 | `status` | Dropdown (`pending`, `done`, `failed`) | String | ✅ | ❌ | `pending` | | ✅ |
| 2 | `job_type` | Input | String | ✅ | ❌ | — | ✅ | ✅ |
| 3 | `length` | Input | Float | ✅ | ❌ | — | ✅ | ✅ |
| 4 | `width` | Input | Float | ✅ | ❌ | — | ✅ | ✅ |
| 5 | `height` | Input | Float | ❌ | ✅ | — | ✅ | ✅ |
| 6 | `unit` | Dropdown (`ft`, `m`) | String | ✅ | ❌ | — | ✅ | ✅ |
| 7 | `brief` | Textarea | Text | ❌ | ✅ | — | ✅ | ✅ |
| 8 | `zip` | Input (max length 10) | String | ❌ | ✅ | — | ✅ | ✅ |
| 9 | `photos` | Code (language JSON) | JSON | ❌ | ✅ | — | ✅ | ✅ |
| 10 | `result` | Code (language JSON) | JSON | ❌ | ✅ | — | | ✅ |
| 11 | `error` | Textarea | Text | ❌ | ✅ | — | | ✅ |
| 12 | `attempts` | Input | Integer | ❌ | ❌ | `0` | | |
| 13 | `last_attempt_at` | Datetime | Timestamp | ❌ | ✅ | — | | |
| 14 | `model` | Input | String | ❌ | ✅ | — | | |
| 15 | `tokens_in` | Input | Integer | ❌ | ✅ | — | | |
| 16 | `tokens_out` | Input | Integer | ❌ | ✅ | — | | |
| 17 | `searches` | Input | Integer | ❌ | ✅ | — | | |

The Read column ticks 11 of these 17. The other 2 Read fields are the system fields `id` and
`date_created`, which aren't in the table.

## 2. `price_cache` (6 fields)

Create the collection first: primary key `id` = **Auto-incremented integer**, no optional
system fields. **No App User or Public permissions.**

| # | Key | Interface | Type | Required | Nullable | Default |
|---|---|---|---|---|---|---|
| 1 | `product_key` | Input | String | ✅ | ❌ | — |
| 2 | `zip3` | Input (max length 3) | String | ✅ | ❌ | — |
| 3 | `unit_price` | Input | Float | ✅ | ❌ | — |
| 4 | `retailer` | Input | String | ❌ | ✅ | — |
| 5 | `url` | Input (max length 2048) | String | ❌ | ✅ | — |
| 6 | `checked_at` | Datetime | Timestamp | ✅ | ❌ | — |

## 3. `quotes` additions

| Key | Interface | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| `estimate_request` | Many to One | UUID (set from the related PK) | ✅ | — | Related collection `estimate_requests`. Direction: many quotes → one estimate request; the field lives on `quotes`. **No** reverse One to Many field on `estimate_requests`. |
| `labour_total_min` | Input | Float | ✅ | — | |
| `labour_total_max` | Input | Float | ✅ | — | |
| `grand_total_min` | Input | Float | ✅ | — | |
| `grand_total_max` | Input | Float | ✅ | — | |

Leave the existing `labour_total` / `grand_total` columns unchanged.

## 4. Backfill SQL (run on the devbox, in the compose directory)

```bash
# 1. Count the rows to backfill
docker compose exec database psql -U directus -d directus11 -c \
  "SELECT count(*) FROM quotes WHERE grand_total_min IS NULL AND grand_total_max IS NULL;"

# 2. Backfill: min = max = the current value
docker compose exec database psql -U directus -d directus11 -c \
  "UPDATE quotes SET labour_total_min = labour_total, labour_total_max = labour_total, grand_total_min = grand_total, grand_total_max = grand_total WHERE grand_total_min IS NULL AND grand_total_max IS NULL;"

# 3. Spot-check the 5 newest quotes
docker compose exec database psql -U directus -d directus11 -c \
  "SELECT id, labour_total, labour_total_min, labour_total_max, grand_total, grand_total_min, grand_total_max FROM quotes ORDER BY id DESC LIMIT 5;"
```

The `UPDATE` should report the same row count as step 1.

## 5. App User field permissions

Settings → Access Policies → **App User**.

**`estimate_requests` Create (Use Custom → Field Permissions, 8):**

```
job_type, length, width, height, unit, brief, zip, photos
```

Item Permissions: leave empty.

**`estimate_requests` Read (Use Custom → Field Permissions, 13):**

```
id, status, job_type, length, width, height, unit, brief, zip, photos, result, error, date_created
```

**`estimate_requests` Read item filter (Item Permissions):**

```json
{ "user_created": { "_eq": "$CURRENT_USER" } }
```

**`estimate_requests` Update / Delete / Share:** no access.

**`quotes` Read: add to the existing field list (5):**

```
estimate_request, labour_total_min, labour_total_max, grand_total_min, grand_total_max
```

Do **not** add these to `quotes` Create or Update yet (that comes in section 2 with the validator rules).
