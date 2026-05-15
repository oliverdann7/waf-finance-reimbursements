# WAF Finance Reimbursements

A multi-user reimbursement system for WAF field workers, treasurers, and finance administrators. The app supports monthly reimbursement reports, receipt uploads, mock OCR extraction, configurable reimbursement rules, duplicate warnings, approval workflows, and CSV exports.

## Tech stack

- **Framework:** Next.js App Router (`next@16`) with React 19 and TypeScript
- **Auth:** NextAuth v5 credentials provider with Prisma-backed users
- **Database:** Prisma 7 using the SQLite/libSQL provider and `@prisma/adapter-libsql`
- **Production database target:** Turso/libSQL for Vercel serverless deployments
- **File storage:** Vercel Blob in production, local `.uploads/` adapter in development
- **UI:** Tailwind CSS, shadcn-style components, lucide-react, Recharts
- **OCR:** Mock OCR provider with deterministic parsed fields and text-based extraction hints

## User roles

- **Worker:** Creates monthly reports, adds expenses, uploads/reviews receipts, exports own reports.
- **Treasurer:** Reviews submitted reports, approves/rejects expenses and reports, marks reports as paid.
- **Admin / Super Admin:** Full finance administration plus reimbursement rule configuration.

## Main workflows

1. A worker creates a draft report for a month/year.
2. The worker uploads PDF/image/bank receipt files.
3. Mock OCR extracts date, merchant, amount, currency, payment method, suggested category, confidence, and raw text.
4. The worker reviews/edit parsed receipt fields before creating an expense.
5. The rules engine calculates reimbursable amounts and shows warnings for missing receipts, duplicates, old expenses, category caps, and monthly caps.
6. The worker submits the report.
7. Treasurer/admin reviews expenses, approves/rejects line items, approves/rejects the report, and marks approved reports as paid.
8. Workers/admins export report CSV files with worker information, category summaries, line items, receipt checklist, and approval status.

## Local setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

All seeded users use password `password123`.

- `admin@waf.org` — Super Admin
- `treasurer@waf.org` — Treasurer
- `ahmet@waf.org`, `ayse@waf.org`, `mehmet@waf.org`, `fatma@waf.org`, `ali@waf.org` — Workers

## Environment variables

Create `.env.local` for development and configure equivalent variables in Vercel.

```bash
# Required in production. Local default is file:./dev.db.
DATABASE_URL="file:./dev.db"

# Required by NextAuth in production.
AUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Production receipt storage. If absent, local development writes to .uploads/.
BLOB_READ_WRITE_TOKEN="vercel-blob-token"

# Optional local receipt storage directory.
LOCAL_UPLOAD_DIR=".uploads"
```

## Database strategy

This project intentionally uses Prisma's **SQLite/libSQL** provider with `@prisma/adapter-libsql`. That keeps the schema, migration lock, generated Prisma client, and runtime adapter aligned and avoids the provider/adapter mismatch that can break uploads and serverless database calls.

Recommended production setup on Vercel:

1. Create a Turso/libSQL database.
2. Set `DATABASE_URL` to the Turso/libSQL connection URL in Vercel.
3. Keep `prisma/schema.prisma` on `provider = "sqlite"`.
4. Keep runtime Prisma construction in `src/lib/db.ts` using `PrismaLibSql`.
5. Run migrations with the configured `DATABASE_URL` before or during deployment.

Do **not** switch `provider` to PostgreSQL unless you also remove the libSQL adapter and regenerate a PostgreSQL-compatible Prisma client.

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

## Reimbursement rules engine

Rules live outside UI components in `src/lib/rules/` and are seeded into the `ReimbursementRule` table. Current rules include:

- Mileage: kilometers × official rate
- Communication monthly cap
- Hospitality/table-cost monthly cap
- Utilities reimbursement percentage
- Category limits
- Receipt-required threshold
- Duplicate warnings
- Old expense warnings
- Maximum single-expense cap

Admins can update active rule values from the rules admin screen.

## Exports

`GET /api/export?reportId=<id>` returns an Excel-compatible UTF-8 CSV containing:

- Worker info
- Month/year
- Category summaries
- Expense line items
- Receipt checklist
- Total requested
- Total reimbursable
- Approval/payment status dates

## Internationalization

The project includes English and Turkish locale dictionaries under `src/lib/i18n/`. Major navigation, dashboard, report, receipt, admin, settings, status, and category labels are represented in those dictionaries. Some legacy client pages still include fallback English text and should gradually move fully to dictionary lookups.

## Vercel deployment checklist

1. Configure `DATABASE_URL` for Turso/libSQL.
2. Configure `AUTH_SECRET` and the production app URL.
3. Configure `BLOB_READ_WRITE_TOKEN` for Vercel Blob.
4. Run `npm install` and `npm run build` in CI/Vercel.
5. Run Prisma migrations against production before enabling live traffic.
6. Seed demo data only in non-production environments unless explicitly desired.

## Known limitations

- OCR is a mock provider, not a paid OCR integration.
- PDF export is not implemented; CSV is Excel-compatible and production-safe.
- Local filesystem uploads are for development only.
- Some UI copy still falls back to English while the i18n dictionaries are expanded.

## Future roadmap

- Real OCR provider integration (Google Document AI, Azure AI Document Intelligence, or AWS Textract)
- Private signed receipt URLs for Blob storage
- XLSX/PDF export generation
- More granular city/department finance permissions
- Admin-editable rule forms for every seeded rule type
- End-to-end tests for report submission and approval workflows
