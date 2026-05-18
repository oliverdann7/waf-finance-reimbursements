# WAF Finance Reimbursements

A multi-user reimbursement system for WAF field workers, treasurers, and finance administrators. The app supports monthly reimbursement reports, receipt uploads, mock OCR extraction, configurable reimbursement rules, duplicate warnings, approval workflows, CSV exports, and a Church Tithe & Offerings monthly report module.

## Tech stack

- **Framework:** Next.js App Router (`next@16`) with React 19 and TypeScript
- **Auth:** NextAuth v5 credentials provider with Prisma-backed users
- **Database:** PostgreSQL via Prisma 7 with `@prisma/adapter-pg`
- **File storage:** Vercel Blob in production, local `.uploads/` adapter in development
- **UI:** Tailwind CSS, shadcn-style components, lucide-react, Recharts
- **OCR:** Mock OCR provider with deterministic parsed fields and text-based extraction hints

## User roles

- **Worker:** Creates monthly reports, adds expenses, uploads/reviews receipts, exports own reports.
- **Treasurer:** Reviews submitted reports, approves/rejects expenses and reports, marks reports as paid.
- **Admin / Super Admin:** Full finance administration plus reimbursement rule configuration.
- **Church Treasurer / Church Pastor / Church User:** Submit and manage monthly tithe and offering reports for their church.

## Main workflows

### Expense Reimbursement
1. A worker creates a draft report for a month/year.
2. The worker uploads PDF/image/bank receipt files.
3. Mock OCR extracts date, merchant, amount, currency, payment method, suggested category, confidence, and raw text.
4. The worker reviews/edit parsed receipt fields before creating an expense.
5. The rules engine calculates reimbursable amounts and shows warnings for missing receipts, duplicates, old expenses, category caps, and monthly caps.
6. The worker submits the report.
7. Treasurer/admin reviews expenses, approves/rejects line items, approves/rejects the report, and marks approved reports as paid.
8. Workers/admins export report CSV files with worker information, category summaries, line items, receipt checklist, and approval status.

### Church Tithe & Offerings
1. Church treasurer/pastor selects their church and month/year.
2. A 7-step wizard guides through: tithe & offerings summary, fund statement, distribution allocation, bank reconciliation, offering details, attachments, and review.
3. Distribution percentages (GC, MENA, WAF, Local, Other) are configurable by admins.
4. The report is submitted for admin review.
5. Admins can review, approve, or reject church reports.

## Local setup

```bash
npm install
# Set up PostgreSQL and create a database
# Create .env.local with DATABASE_URL pointing to your local PostgreSQL
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

All seeded users use password `password123`.

| Email | Role | Description |
|---|---|---|
| `admin@waf.org` | SUPER_ADMIN | Full system access |
| `treasurer@waf.org` | TREASURER | Report review and approval |
| `ahmet@waf.org` | WORKER | Standard worker |
| `ankara.treasurer@waf.org` | CHURCH_TREASURER | Ankara Grace Church |
| `ankara.pastor@waf.org` | CHURCH_PASTOR | Ankara Grace Church |
| `istanbul.treasurer@waf.org` | CHURCH_TREASURER | Istanbul Light Church |

## Environment variables

Create `.env.local` for development and configure equivalent variables in Vercel.

```bash
# Required. PostgreSQL connection string.
DATABASE_URL="postgresql://postgres:password@localhost:5432/waf_reimbursements?schema=public"

# Required by NextAuth in production.
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="http://localhost:3000"

# Production receipt storage. If absent, local development writes to .uploads/.
BLOB_READ_WRITE_TOKEN="vercel-blob-token"

# Optional local receipt storage directory.
LOCAL_UPLOAD_DIR=".uploads"
```

## Vercel deployment checklist

1. **Database:** Set `DATABASE_URL` to your production PostgreSQL (Vercel Postgres or another provider).
2. **Auth:** Set `AUTH_SECRET` and `AUTH_URL`.
3. **Storage:** Set `BLOB_READ_WRITE_TOKEN` for Vercel Blob.
4. **Migrations:** Run `npx prisma migrate deploy` against production before enabling traffic.
5. **Build:** `npm install && npm run build` in CI/Vercel.
6. **Health check:** Visit `/api/health` to verify database connectivity and required tables.

## API endpoints

### Expense Reimbursement
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard` | Worker dashboard stats |
| GET/POST | `/api/reports` | List/create reports |
| GET/PUT | `/api/reports/[id]` | Report detail/update |
| GET/POST | `/api/expenses` | List/create expenses |
| GET/POST | `/api/receipts` | List receipts |
| POST | `/api/receipts/upload` | Upload receipt |
| GET | `/api/export?reportId=...` | CSV export |

### Church Module
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/churches` | List/create churches (admin) |
| GET/PUT/DELETE | `/api/churches/[id]` | Church CRUD (admin) |
| GET/POST | `/api/churches/[id]/users` | Church user management (admin) |
| GET/POST | `/api/church-reports` | List/create church reports |
| GET/PUT | `/api/church-reports/[id]` | Report detail/update |
| POST | `/api/church-reports/[id]/submit` | Submit report |
| POST | `/api/church-reports/[id]/attachments` | Upload attachment |
| GET/PATCH | `/api/admin/church-reports` | Admin list/update reports |
| GET/PUT | `/api/church-config` | Distribution config (admin) |

### System
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check (DB, tables) |

## File storage strategy

Receipt storage uses a small abstraction in `src/lib/storage.ts`:

- If `BLOB_READ_WRITE_TOKEN` exists, uploads go to **Vercel Blob** and the public blob URL is stored on `Receipt.filePath`.
- If the token is absent, local development writes files under `.uploads/` (or `LOCAL_UPLOAD_DIR`) and serves them through an authenticated local upload route.

Local filesystem storage is only for development. Use Vercel Blob for production deployments.

## Receipt and OCR architecture

- Upload endpoint: `POST /api/receipts/upload`
- Receipt list: `/receipts`
- Receipt review: `/receipts/[id]`
- OCR provider entrypoint: `src/lib/ocr/index.ts`
- Mock provider: `src/lib/ocr/mock-ocr.ts`

The mock OCR provider supports receipts, PDFs, image uploads, and simple bank-statement text hints. It returns parsed fields plus raw text. Workers must confirm/edit parsed data before creating an expense.

## Internationalization

The project includes English, Turkish, and Persian locale dictionaries under `src/lib/i18n/`. Major navigation, dashboard, report, receipt, admin, settings, status, category, and church module labels are represented in those dictionaries.

## Known limitations

- OCR is a mock provider, not a paid OCR integration.
- PDF export is not implemented; CSV is Excel-compatible and production-safe.
- Local filesystem uploads are for development only.
