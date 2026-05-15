# Production readiness audit

| Area | Status | Notes |
| --- | --- | --- |
| Auth | Exists | NextAuth credentials flow with Prisma users. |
| Roles | Exists | Worker, treasurer, admin, super admin are modeled and enforced on admin APIs. |
| Worker dashboard | Improved | Current month, status totals, monthly totals, warnings, and report links exist. |
| Admin dashboard | Improved | Submitted/recent reports, approval actions, high-risk warning counts, and filters are supported. |
| Reports | Exists | Monthly unique reports with status timeline and submit/approve/pay workflow. |
| Expenses | Improved | Expense creation validates draft ownership, applies rules, updates totals, and can link receipts. |
| Receipts | Improved | Upload, list, review/detail, parsed field editing, and expense conversion are supported. |
| OCR/mock OCR | Improved | Mock provider extracts parsed fields and supports receipt/bank-statement text hints. |
| Rules engine | Improved | Reusable library covers mileage, caps, utilities percentage, category limits, missing receipt, duplicate, and old-expense warnings. |
| Duplicate detection | Improved | Checks amount/date/merchant, same filename, and similar extracted text; warnings do not block submission. |
| PDF/CSV/Excel export | Partial | Excel-compatible CSV is implemented; PDF remains future work. |
| i18n | Partial | English/Turkish dictionaries cover major flows; legacy fallback English remains in some client pages. |
| Database | Fixed | Prisma schema, migration lock, config, generated client, and runtime adapter now align on SQLite/libSQL. |
| File storage | Improved | Vercel Blob is used in production; authenticated local adapter is available for development. |
| Vercel deployment readiness | Improved | README documents Turso/libSQL, Blob, auth, and deployment variables. |
| README/docs | Fixed | Default Next README replaced with project documentation. |
