# Phase 3 · Section 1 — build checklist (Directus admin, by hand)

Builds the data layer for AI estimation on the **live v11 instance (port 8056)**. No hooks,
no app changes. Plan approved 2026-10-14; design in `ai-material-estimation.md` §1–§7.

Work top to bottom and tick as you go. Exact labels in the admin can differ slightly
between Directus versions; if something isn't where this says, look for the same
setting nearby rather than guessing. **Field keys must be typed exactly as shown**,
because the hooks and probes use them.

---

## Part 1 — `estimate_requests` collection

### 1.1 Create the collection

1. Settings (gear, left rail) → **Data Model** → **+ (Create Collection)**, top right.
2. **Name:** `estimate_requests`
3. **Primary key field:** key `id`, type **Generated UUID**.
4. Next → **Optional system fields:** tick **Created On** (`date_created`) and
   **Created By** (`user_created`). Leave Status, Sort, Updated On and Updated By **unticked**.
   (Don't use the built-in Status here; it creates published/draft/archived. We make our own.)
5. Finish.

- [ ] Check: the collection's field list shows `id`, `date_created`, `user_created`.
      The July rebuild missed these on `quotes`, so look before moving on.

### 1.2 Add the fields

For each one: open the collection → **Create Field** → pick the interface → set the key,
type and options → Save.

**"Required"** is the Required toggle on the field. **"Nullable"** is the Nullable
checkbox in the schema options. Anything not marked Required should be left Nullable.

| # | Key | Interface | Type | Settings |
|---|---|---|---|---|
| 1 | `status` | Dropdown | String | Choices (text = value): `pending`, `done`, `failed`. **Default `pending`**. Required. |
| 2 | `job_type` | Input | String | Required. |
| 3 | `length` | Input | Float | Required. |
| 4 | `width` | Input | Float | Required. |
| 5 | `height` | Input | Float | Nullable (section 2's hook enforces it for wall jobs). |
| 6 | `unit` | Dropdown | String | Choices: `ft`, `m`. Required. |
| 7 | `brief` | Textarea | Text | Nullable. |
| 8 | `zip` | Input | String | Max length **10**. Nullable. |
| 9 | `photos` | Code (language JSON) | JSON | Nullable. Holds an array of file ids. |
| 10 | `result` | Code (language JSON) | JSON | Nullable. |
| 11 | `error` | Textarea | Text | Nullable. |
| 12 | `attempts` | Input | Integer | **Default `0`**. Not nullable. |
| 13 | `last_attempt_at` | Datetime | Timestamp | Nullable. |
| 14 | `model` | Input | String | Nullable. |
| 15 | `tokens_in` | Input | Integer | Nullable. |
| 16 | `tokens_out` | Input | Integer | Nullable. |
| 17 | `searches` | Input | Integer | Nullable. |

- [ ] Check: 20 fields total (17 above + `id`, `date_created`, `user_created`).

---

## Part 2 — `price_cache` collection

### 2.1 Create the collection

1. Data Model → **+ (Create Collection)** → **Name:** `price_cache`.
2. **Primary key:** key `id`, type **Auto-incremented integer**.
3. Optional system fields: **tick none**.

### 2.2 Add the fields

| # | Key | Interface | Type | Settings |
|---|---|---|---|---|
| 1 | `product_key` | Input | String | Required. |
| 2 | `zip3` | Input | String | Max length **3**. Required. |
| 3 | `unit_price` | Input | Float | Required. |
| 4 | `retailer` | Input | String | Nullable. |
| 5 | `url` | Input | String | Max length **2048**. Nullable. |
| 6 | `checked_at` | Datetime | Timestamp | Required. |

- [ ] **No permissions on this collection, for any policy except admin.** Do not add it
      to App User or Public. Only the hook touches it.

---

## Part 3 — `quotes` changes

Data Model → `quotes` → Create Field:

| # | Key | Interface | Type | Settings |
|---|---|---|---|---|
| 1 | `estimate_request` | Many to One (Relational) | UUID (set automatically) | Related collection **`estimate_requests`**. If it offers a reverse (One to Many) field on `estimate_requests`, **leave that off**. Nullable. |
| 2 | `labour_total_min` | Input | Float | Nullable. |
| 3 | `labour_total_max` | Input | Float | Nullable. |
| 4 | `grand_total_min` | Input | Float | Nullable. |
| 5 | `grand_total_max` | Input | Float | Nullable. |

Leave the existing `labour_total` / `grand_total` alone. The app still writes them until the
frontend section switches over.

### 3.1 Backfill existing quotes (on the devbox)

Copies each quote's current total into both ends of its range (min = max). Run these on the
devbox. `docker compose ps` shows the Postgres service name and your `.env` has the DB
user. The database is `directus11`.

```bash
# 1. See how many rows will change (expect: all your existing quotes)
docker compose exec database psql -U directus -d directus11 -c \
  "SELECT count(*) FROM quotes WHERE grand_total_min IS NULL AND grand_total_max IS NULL;"

# 2. Backfill
docker compose exec database psql -U directus -d directus11 -c \
  "UPDATE quotes SET labour_total_min = labour_total, labour_total_max = labour_total,
                     grand_total_min  = grand_total,  grand_total_max  = grand_total
   WHERE grand_total_min IS NULL AND grand_total_max IS NULL;"

# 3. Spot check
docker compose exec database psql -U directus -d directus11 -c \
  "SELECT id, labour_total, labour_total_min, labour_total_max,
          grand_total, grand_total_min, grand_total_max FROM quotes ORDER BY id DESC LIMIT 5;"
```

- [ ] The step 2 row count matches step 1. In step 3, each `_min` / `_max` equals its old column.

---

## Part 4 — App User permissions

Settings → **Access Policies** → **App User** → Permissions section.

### 4.1 `estimate_requests`

Click **Add Collection** → `estimate_requests`. A new row appears with Create / Read /
Update / Delete / Share icons.

**Create** → *Use Custom*:
- **Field Permissions:** tick **only** these 8:
  `job_type`, `length`, `width`, `height`, `unit`, `brief`, `zip`, `photos`.
- Item Permissions: leave empty (create filters can't check ownership; section 2's hook does).

**Read** → *Use Custom*:
- **Item Permissions:** `User Created` → **Equals** → `$CURRENT_USER`.
  Saved JSON should be `{ "user_created": { "_eq": "$CURRENT_USER" } }`.
- **Field Permissions:** tick these 13:
  `id`, `status`, `job_type`, `length`, `width`, `height`, `unit`, `brief`, `zip`,
  `photos`, `result`, `error`, `date_created`.
  `date_created` is listed separately as a system field, so it's easy to miss.
  **Do not** tick `attempts`, `last_attempt_at`, `model`, `tokens_in`, `tokens_out`,
  `searches`, `user_created`.

**Update / Delete / Share:** leave **off** (no access).

### 4.2 `quotes` (Read only, this section)

Open the existing custom **Read** on `quotes` → **Field Permissions** → additionally tick:
`estimate_request`, `labour_total_min`, `labour_total_max`, `grand_total_min`, `grand_total_max`.

**Don't** add them to Create or Update yet. Those land in section 2 along with the
validator rules that check them (totals add up, the estimate belongs to you). The app
doesn't send these fields yet, so nothing breaks in the meantime.

### 4.3 Public policy

- [ ] Nothing to add. Confirm neither new collection appears under Public.

---

## Part 5 — Verify

From Git Bash, with your two App User accounts:

```bash
bash scripts/probe-permissions.sh
```

- [ ] Groups A–G still pass (no regressions).
- [ ] The new **Group H** passes.
- [ ] Note: App Users can't delete estimate rows (by design), so each run leaves two
      `job_type = "probe"` rows behind. Delete them occasionally from the admin.

Then tell me the result and I'll update `BACKEND.md` / `SECURITY.md` with what was built.
