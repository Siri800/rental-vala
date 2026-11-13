# Rental Vala � Multi-Vendor Online Rental Marketplace

A full-stack, multi-vendor rental marketplace enabling customers to rent products across **12 primary categories** with unit-level inventory locking, tiered pricing, OTP-verified handovers, and escrow security deposit management.

## Architecture & Tech Stack
- **Monorepo:** `pnpm` Workspaces + `Turborepo`
- **Frontend (`apps/web`):** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend (`apps/api`):** Node.js, Express, TypeScript, Zod, Argon2id, JWT RBAC
- **Database (`packages/database`):** PostgreSQL 16 + Prisma ORM
- **Cache & Object Storage:** Redis 7 & MinIO S3-compatible buckets
- **Payments:** Razorpay Checkout & HMAC Signature Verification + Double-Entry Financial Ledger

## Quick Start
1. Start infrastructure: `docker compose up -d`
2. Install & seed: `pnpm install && pnpm --filter @rental-vala/database generate && pnpm --filter @rental-vala/database migrate && pnpm --filter @rental-vala/database seed`
3. Run API (`8085`) & Web (`3000`): `pnpm --filter @rental-vala/api dev` and `pnpm --filter @rental-vala/web dev`
4. Run tests: `pnpm --filter @rental-vala/api test`

## Image Uploads

Providers and administrators can request a short-lived MinIO/S3 upload URL with
`POST /api/v1/uploads/presign`. Authenticate with a Bearer access token and send
JSON containing `fileName`, `contentType` (`image/jpeg`, `image/png`, or
`image/webp`), and `folder` (`listings` or `kyc`). The response includes
`data.uploadUrl`, `data.publicUrl`, and `data.key`. Upload the file bytes directly
to `uploadUrl` with an HTTP `PUT` and the same `Content-Type`. Listing images are
publicly readable; KYC objects remain private.

Configure MinIO/S3 with `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_BUCKET_MEDIA`, and `S3_MEDIA_PUBLIC_URL`. The API
creates the media bucket and applies its listing-read policy and browser CORS
configuration on the first upload when needed.

## GST Tax Invoices

Customers, the provider who owns the booking, and administrators can download
the booking invoice as a PDF from
`GET /api/v1/bookings/:id/invoice`. Send the authenticated Bearer access token;
the response is an `application/pdf` attachment named
`RentalVala-Invoice-<bookingId>.pdf`. The invoice itemizes rental charges and
fees, shows the SAC 9973 code and CGST/SGST split, records payment status, and
identifies the refundable security deposit separately from taxable rental value.

## Demo Accounts
- **Super Admin:** `admin@rentalvala.in` / `Admin@1234`
- **Provider:** `provider.tech@rentalvala.in` / `Provider@1234`
- **Customer:** `customer@rentalvala.in` / `Customer@1234`
