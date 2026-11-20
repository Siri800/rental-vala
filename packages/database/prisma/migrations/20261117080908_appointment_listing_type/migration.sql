-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENTAL', 'APPOINTMENT');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "appointment_duration_minutes" INTEGER,
ADD COLUMN     "listing_type" "ListingType" NOT NULL DEFAULT 'RENTAL';
