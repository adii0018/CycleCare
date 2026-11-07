# CycleCare Backend (Phase 1 to Phase 4)

Backend service for **CycleCare — Digital Bicycle Repair Management System** by Rajput Auto Garage.

Built with **Python 3.13**, **Django**, **Django REST Framework (DRF)**, and **PyMongo** directly connected to MongoDB Atlas.

---

## 1. Architectural Highlights

- **ORM-less Architecture**: Completely eliminates Django ORM, SQL database drivers, and auth/session models (`DATABASES = {}`).
- **Direct MongoDB Storage via PyMongo**: All data persistence for customer repairs, photos, rate limits, admins, and sessions is handled through PyMongo.
- **In-Database Photo Storage (No External S3/R2)**: Photos are uploaded via `multipart/form-data`, validated strictly via magic bytes on the server, stored as BSON `Binary` in the `photos` collection, and automatically purged after 30 days via a MongoDB TTL index.
- **Stateless & Concurrency-Safe**: Sequential Repair IDs (`CC-{YYYY}-{00001}`) are generated atomically via MongoDB's `counters` collection with year rollover evaluated in the `Asia/Kolkata` timezone (IST).
- **Deny-by-Default Security Model**: DRF's default permission is strictly `IsAuthenticated`. Public endpoints (`/api/health/`, public registration, and login) explicitly declare `permission_classes = [AllowAny]` and `authentication_classes = []`.
- **Timing-Safe Admin Authentication**: Admin login runs a constant-time dummy password hash for non-existent or inactive numbers to neutralize user enumeration. Sessions use high-entropy random tokens stored strictly as SHA-256 hashes and delivered via `HttpOnly` cookies.

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
| `FRONTEND_URL` | Allowed frontend origin for CORS and Origin check. | `http://localhost:5173` |
| `RATE_LIMIT_REGISTER_PER_10MIN` | Maximum public registration submissions per client IP in a 10-minute window. | `10` |
| `RATE_LIMIT_LOGIN_IP_PER_15MIN` | Maximum admin login attempts per client IP in a 15-minute window. | `10` |
| `RATE_LIMIT_LOGIN_MOBILE_PER_15MIN` | Maximum failed admin login attempts for a specific mobile number in a 15-minute window. | `5` |
| `TRUSTED_PROXY_HOPS` | Number of trusted reverse proxy hops to accurately read `X-Forwarded-For`. | `1` |
| `SESSION_COOKIE_NAME` | Name of the admin authentication cookie. | `cc_session` |
| `SESSION_COOKIE_SECURE` | Enforce HTTPS-only cookie transmission. Set to `True` in production. | `False` (dev) / `True` (prod) |
| `SESSION_COOKIE_SAMESITE` | Cookie SameSite policy. | `Lax` |
| `SESSION_COOKIE_DOMAIN` | Domain attribute for the cookie (empty string allows host-only cookie). | `""` |
| `ADMIN_SESSION_DAYS` | Active session validity duration in days. | `14` |
| `MONGODB_TIMEOUT_MS` | Server selection and connection timeout in milliseconds. | `5000` |
| `MONGODB_MAX_POOL_SIZE` | Maximum connection pool size per worker process. | `50` |
| `MONGODB_MIN_POOL_SIZE` | Minimum connection pool size maintained per worker process. | `5` |

> **Security Note:** The `.env` file contains sensitive credentials and is strictly excluded from version control via `.gitignore`. Verify with `git check-ignore -v backend/.env`.

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
# Edit .env and set your MONGODB_URI and configurations
```

### Step 4: Ensure MongoDB Indexes
Initialize all unique and TTL indexes across collections:
```bash
python manage.py ensure_indexes
```

### Step 5: Create Administrator Account
Admin creation is interactive to prevent passwords from ever leaking into shell history:
```bash
python manage.py create_admin --mobile 9876543210
# Prompts for password securely twice (min length 10)
```

To update an admin's password and simultaneously revoke all active sessions:
```bash
python manage.py set_admin_password --mobile 9876543210
```

### Step 6: Start the Development Server
```bash
python manage.py runserver 127.0.0.1:8000
```

---

## 4. Production Deployment & Cloud Setup

### Render & Python Runtime
Render requires the Python version to match local development. We provide:
1. `.python-version` in the repository root and `backend/` directory specifying `3.13.14`.
2. On Render Dashboard, set the environment variable:
   ```text
   PYTHON_VERSION=3.13.14
   ```

### Creating the First Admin in Production (No Shell Available)
If your hosting plan does not provide SSH / shell access:
1. Temporarily point your local `.env` to the production `MONGODB_URI`.
2. Run `python manage.py create_admin --mobile <OwnerMobile>` locally. The password will be entered securely via `getpass`.
3. Verify account creation output.
4. Immediately revert `MONGODB_URI` in your local `.env` back to your development database.

### CSRF & Origin Defense Design
Because the frontend and backend share an origin (or proxy path `/api/*`), admin requests authenticate using an `HttpOnly` cookie. To prevent Cross-Site Request Forgery (CSRF) without relying on traditional Django session middleware:
- **Origin / Referer Verification**: Every state-changing request (`POST`, `PATCH`, `DELETE`, `PUT`) must supply an `Origin` (or fallback `Referer`) that exactly matches `FRONTEND_URL` or an approved development host.
- **Strict Content-Type**: Only standard API payload content types (`application/json`, `multipart/form-data`) are permitted, blocking simple cross-site HTML form submissions.
- **Public Registration Exemption**: The public customer registration endpoint does not use cookies (`authentication_classes = []`) and is exempted from this check so customers scanning the shop QR code on various mobile browsers never experience false-positive 403 errors.

### `TRUSTED_PROXY_HOPS` Tuning & Verification
When a client request travels through reverse proxies, each proxy appends an IP to the `X-Forwarded-For` chain:
```text
Client IP -> Proxy 1 (Vercel) -> Proxy 2 (Render) -> Django Backend
```
- If Django is behind Render only: `TRUSTED_PROXY_HOPS = 1`.
- If Vercel rewrites `/api/*` to Render: `TRUSTED_PROXY_HOPS = 2`.
- **What goes wrong if misconfigured?**
  - **Hops too low**: Rate limiting will group all requests under the intermediate proxy IP, causing one user's registration/login attempts to rate-limit all other shop users.
  - **Hops too high**: Attackers could spoof headers and bypass client IP rate limiting.
- **Safety by default**: If the header contains fewer hops than configured, `apps.core.utils.get_client_ip` automatically falls back to the socket IP (`REMOTE_ADDR`), preventing forged short chains.
- **How to verify in production**:
  Temporarily log the parsed IP alongside `request.META.get('HTTP_X_FORWARDED_FOR')` on an authenticated admin request (or temporary health check) to confirm the parsed IP matches your actual test device's public IP.

---

## 5. API Reference

All routes are prefixed with `/api/`.

### Public Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/api/health/` | Lightweight warm-up ping. Zero database queries. | Public |
| `POST` | `/api/auth/login/` | Admin login. Sets `cc_session` HttpOnly cookie. | Public (Origin checked) |
| `POST` | `/api/repairs/` | Public customer registration with optional photos (max 3, max 400 KB each). | Public (Rate-limited) |

### Admin Endpoints (Require `cc_session` cookie)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/logout/` | Revokes the current session from MongoDB and clears the cookie. Returns `204`. |
| `GET` | `/api/auth/me/` | Returns currently logged-in administrator profile (`{"admin": {"mobile": "..."}}`). |
| `GET` | `/api/repairs/stats/` | Overview stats (`total`, `today` in IST boundaries, `archived`, `expired_photos`). |
| `GET` | `/api/repairs/` | Paginated repair records. Query params: `q` (search), `archived` (`true`/`false`), `page`, `page_size`. |
| `POST` | `/api/repairs/manual/` | Manual repair entry by shop owner. Same validation as public submission with `source="admin"`. |
| `GET` | `/api/repairs/<repair_id>/` | Full repair detail with photo metadata and expiration statuses. |
| `PATCH` | `/api/repairs/<repair_id>/archive/` | Toggle archive status (`{"archived": true|false}`). Returns updated record. |
| `GET` | `/api/repairs/<repair_id>/photos/<photo_id>/` | Streams raw image bytes with `Cache-Control: private, max-age=300`. Returns `410 Gone` if expired. |

---

## 6. Photo Storage Architecture & Atlas Free Tier Capacity Planning

### MongoDB TTL Behavior and Expiry Delay
Photos are stored in a dedicated `photos` collection with a TTL index on `expires_at` (`expireAfterSeconds=0`). The MongoDB background TTL monitor thread runs once every 60 seconds, meaning expired documents are removed within roughly 60 seconds of expiration.

To guarantee zero access to expired photos regardless of background thread timing, the service layer function `get_photo(photo_id)` explicitly verifies `expires_at < utc_now()` before returning bytes.

### Document Storage Breakdown
- **Repair Document** (stored forever in `repairs`): Approximately **0.5 KB to 1.0 KB** per record.
- **Photo Document** (stored for 30 days in `photos`): Typical compressed mobile photo size: **~150 KB – 250 KB** (server hard cap 400 KB).

### Atlas Free Tier (M0 — 512 MB Storage) Sizing Analysis

| Photos Uploaded | Est. Size per Registration | Max Concurrent Records in 512 MB (30-day window) | Est. Registrations per Day |
|---|---|---|---|
| **0 photos** | ~1 KB | ~500,000 records | ~16,000 / day |
| **1 photo (~200 KB)** | ~201 KB | ~2,500 active records | ~83 / day |
| **3 photos (~200 KB each)** | ~601 KB | ~850 active records | ~28 / day |

For a local bicycle repair shop registering 5 to 15 bicycles per day, the active 30-day storage footprint is approximately **30 MB to 90 MB**, comfortably within the 512 MB Atlas free tier threshold.

> ⚠️ **Atlas Free Tier Backup Warning:**
> MongoDB Atlas Free Tier (M0) does not include automated continuous or snapshot backups. Rajput Auto Garage should periodically run `mongodump` exports or upgrade to an Atlas Flex / M2 tier for automated cloud snapshots.
