# CycleCare Backend (Phase 1 & Phase 2)

Backend service for **CycleCare — Digital Bicycle Repair Management System** by Rajput Auto Garage.

Built with **Python 3.12 / 3.13**, **Django**, **Django REST Framework (DRF)**, and **PyMongo** directly connected to MongoDB Atlas.

---

## 1. Architectural Highlights

- **ORM-less Architecture**: Completely eliminates Django ORM, SQL database drivers, and auth/session models (`DATABASES = {}`).
- **Direct MongoDB Storage via PyMongo**: All data persistence for customer repairs, photos, rate limits, and atomic counter sequences is handled through PyMongo.
- **In-Database Photo Storage (No External S3/R2)**: Photos are uploaded via `multipart/form-data`, validated strictly via magic bytes on the server, stored as BSON `Binary` in the `photos` collection, and automatically purged after 30 days via a MongoDB TTL index.
- **Stateless & Concurrency-Safe**: Sequential Repair IDs (`CC-{YYYY}-{00001}`) are generated atomically via MongoDB's `counters` collection with year rollover evaluated in the `Asia/Kolkata` timezone (IST).

---

## 2. Environment Variables & Configuration

Configuration is managed via `.env` in the `backend/` directory. Create it from the template:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
|---|---|---|
| `DJANGO_SECRET_KEY` | High-entropy secret key for Django runtime security. | `replace-with-a-secure-random-key` |
| `DEBUG` | Enable verbose error traces (dev only). Set to `False` in production. | `True` (dev) / `False` (prod) |
| `ALLOWED_HOSTS` | Comma-separated list of host/domain names this site can serve. | `localhost,127.0.0.1` |
| `MONGODB_URI` | MongoDB Atlas SRV connection string with credentials. | `mongodb+srv://<user>:<password>@cluster01.xyz.mongodb.net/` |
| `MONGODB_DATABASE` | Name of the primary application database. | `cyclecare` |
| `FRONTEND_URL` | Allowed frontend origin for CORS restrictions. | `http://localhost:5173` |
| `RATE_LIMIT_REGISTER_PER_10MIN` | Maximum public registration submissions per client IP in a 10-minute window. | `10` |
| `TRUSTED_PROXY_HOPS` | Number of trusted reverse proxy hops (e.g. Render proxy) to accurately read `X-Forwarded-For`. | `1` |
| `MONGODB_TIMEOUT_MS` | Server selection and connection timeout in milliseconds. | `5000` |
| `MONGODB_MAX_POOL_SIZE` | Maximum connection pool size per worker process. | `50` |
| `MONGODB_MIN_POOL_SIZE` | Minimum connection pool size maintained per worker process. | `5` |

> **Security Note:** The `.env` file contains sensitive credentials and is strictly excluded from version control via `.gitignore`. Verify with `git status` or `git check-ignore -v backend/.env`.

---

## 3. Installation & Local Setup

### Step 1: Create and Activate Virtual Environment
```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### Step 2: Install Pinned Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Local Environment
```bash
cp .env.example .env
# Edit .env and set your MONGODB_URI
```

### Step 4: Ensure MongoDB Indexes
Initialize all unique and TTL indexes across collections:
```bash
python manage.py ensure_indexes
```

### Step 5: Start the Development Server
```bash
python manage.py runserver 8000
```

---

## 4. Running Tests & Code Quality Checks

Tests run against a dedicated, isolated test database (`cyclecare_test`) that is verified to end with `_test` before any database cleanup.

```bash
cd backend

# Run entire test suite (unit, integration, concurrency)
pytest -v

# Run linting checks
python -m ruff check .

# Check code formatting
python -m ruff format --check .
```

---

## 5. API Reference (Current Scope)

### `GET /api/health/`
Lightweight system health check. Performs no database calls to remain 100% responsive during cold starts and warm-up pings.

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

### `POST /api/repairs/`
Public customer bicycle repair registration with optional photo uploads (`multipart/form-data`).

**Rate Limit**: 10 submissions per 10 minutes per client IP.

**Form Fields:**
- `customer_name` (string, required): 2-60 characters, letters, spaces, `. ' -` (Latin & Devanagari supported).
- `mobile` (string, required): Indian 10-digit number (`^[6-9]\d{9}$`). Normalized automatically.
- `repair_problems` (repeated string, required): At least one valid code (`puncture_tyre`, `brake`, `chain`, `gear`, `pedal`, `wheel`, `general_service`, `other`).
- `other_problem_text` (string, conditional): Required if `other` is in `repair_problems` (max 200 chars).
- `additional_details` (string, optional): Max 500 characters.
- `idempotency_key` (UUID string, required): Unique UUID generated per form load.
- `website` (string, honeypot): Must be left empty by legitimate users.
- `photos` (repeated binary files, optional): 0 to 3 photos. Max 400 KB each. Allowed: JPEG, PNG, WebP. Verified on the server via magic bytes.

**Success Response (201 Created for new / 200 OK for duplicate):**
```json
{
  "repair_id": "CC-2026-00001",
  "customer_name": "Rohan Sharma",
  "received_at": "2026-11-07T12:00:00Z"
}
```
*Note: Sensitive details like customer mobile numbers, MongoDB `_id`, and internal photo IDs are never exposed in public responses.*

**Error Response Envelope (400 / 413 / 429):**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Please correct the errors in the submitted form.",
    "fields": {
      "mobile": ["Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."]
    }
  }
}
```

---

## 6. Photo Storage Architecture & Atlas Free Tier Capacity Planning

### MongoDB TTL Behavior and Expiry Delay
Photos are stored in a dedicated `photos` collection with a TTL index on `expires_at` (`expireAfterSeconds=0`). The MongoDB background TTL monitor thread runs once every 60 seconds, meaning expired documents are removed within roughly 60 seconds of expiration.

To guarantee zero access to expired photos regardless of background thread timing, the service layer function `get_photo(photo_id)` explicitly verifies `expires_at < utc_now()` before returning bytes. This function is ready to back the future protected admin photo viewing endpoint.

### Document Storage Breakdown
- **Repair Document** (stored forever in `repairs`):
  - Approximately **0.5 KB to 1.0 KB** per record (customer name, normalized mobile, problem codes, ISO timestamps, photo metadata references).
- **Photo Document** (stored for 30 days in `photos`):
  - Typical compressed mobile photo size: **~150 KB – 250 KB**.
  - Server hard cap per photo: **400 KB**.

### Atlas Free Tier (M0 — 512 MB Storage) Sizing Analysis

| Photos Uploaded | Est. Size per Registration | Max Concurrent Records in 512 MB (30-day window) | Est. Registrations per Day |
|---|---|---|---|
| **0 photos** | ~1 KB | ~500,000 records | ~16,000 / day |
| **1 photo (~200 KB)** | ~201 KB | ~2,500 active records | ~83 / day |
| **3 photos (~200 KB each)** | ~601 KB | ~850 active records | ~28 / day |

For a local bicycle repair shop registering 5 to 15 bicycles per day, the active 30-day storage footprint is approximately **30 MB to 90 MB**, comfortably within the 512 MB Atlas free tier threshold.

> ⚠️ **Atlas Free Tier Backup Warning:**
> MongoDB Atlas Free Tier (M0) does not include automated continuous or snapshot backups. Because repair history is permanent business data, Rajput Auto Garage should periodically run `mongodump` exports or upgrade to an Atlas Flex / M2 tier for automated cloud snapshots.
