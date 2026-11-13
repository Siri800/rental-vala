-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('CUSTOMER', 'PROVIDER', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_ADMIN');

-- CreateEnum
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED');

-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "InventoryUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL_STOCK', 'BOOKING_RESERVED', 'BOOKING_RELEASED', 'HANDOVER_OUT', 'RETURN_IN', 'MAINTENANCE_LOCK', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_PROVIDER_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'ACTIVE', 'RETURN_REQUESTED', 'RETURNED', 'INSPECTION_PENDING', 'COMPLETED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'RELEASED', 'PARTIALLY_DEDUCTED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('BOOKING_PAYMENT_CREDIT', 'SECURITY_DEPOSIT_HOLD', 'PLATFORM_COMMISSION_DEBIT', 'TAX_COLLECTED', 'DELIVERY_FEE_CREDIT', 'PROVIDER_EARNING_CREDIT', 'DEPOSIT_RELEASE_DEBIT', 'DEPOSIT_DAMAGE_DEDUCTION', 'REFUND_DEBIT', 'PAYOUT_DISBURSEMENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PROVIDER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('DAMAGED_PRODUCT', 'MISSING_PRODUCT', 'LATE_RETURN', 'PAYMENT_DISPUTE', 'DEPOSIT_DISPUTE', 'BOOKING_DISPUTE', 'CANCELLATION_DISPUTE');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_CUSTOMER_FAVOR', 'RESOLVED_PROVIDER_FAVOR', 'RESOLVED_SPLIT', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gov_id_type" TEXT,
    "gov_id_number_masked" TEXT,
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL DEFAULT 'INDIVIDUAL',
    "description" TEXT,
    "logo_url" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "business_address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc_code" TEXT,
    "bank_name" TEXT,
    "razorpay_account_id" TEXT,
    "verification_status" "ProviderVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "custom_commission_rate" DECIMAL(5,2),
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_documents" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "review_notes" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_name" TEXT,
    "banner_url" TEXT,
    "default_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data_type" "AttributeDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "placeholder" TEXT,
    "options_json" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_values" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,

    CONSTRAINT "category_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "condition" "ProductCondition" NOT NULL DEFAULT 'GOOD',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pickup_available" BOOLEAN NOT NULL DEFAULT true,
    "delivery_available" BOOLEAN NOT NULL DEFAULT false,
    "delivery_radius_km" INTEGER,
    "instant_booking" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "alt_text" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_attributes" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(14,4),
    "value_bool" BOOLEAN,
    "value_json" JSONB,

    CONSTRAINT "listing_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_pricing" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "primary_unit" "PricingUnit" NOT NULL DEFAULT 'DAILY',
    "hourly_rate" DECIMAL(12,2),
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "weekly_rate" DECIMAL(12,2),
    "monthly_rate" DECIMAL(12,2),
    "security_deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pickup_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cleaning_or_setup_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate_pct" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "min_duration" INTEGER NOT NULL DEFAULT 1,
    "max_duration" INTEGER NOT NULL DEFAULT 90,
    "weekly_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "monthly_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_policies" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "cancellation_policy" TEXT NOT NULL,
    "cancellation_notes" TEXT,
    "damage_policy" TEXT NOT NULL,
    "usage_guidelines" TEXT,
    "late_fee_per_day" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "id_proof_required" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "total_quantity" INTEGER NOT NULL DEFAULT 1,
    "track_individual_units" BOOLEAN NOT NULL DEFAULT false,
    "buffer_hours" INTEGER NOT NULL DEFAULT 2,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_units" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "asset_tag" TEXT,
    "status" "InventoryUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "movement_type" "InventoryMovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "blocked_quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "unit_serial" TEXT,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "delivery_address_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "fulfillment_method" "FulfillmentMethod" NOT NULL DEFAULT 'PICKUP',
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "customer_notes" TEXT,
    "provider_notes" TEXT,
    "payment_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricing_unit" "PricingUnit" NOT NULL,
    "duration_count" INTEGER NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deposit_per_unit" DECIMAL(12,2) NOT NULL,
    "assigned_unit_codes" JSONB,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_price_breakdowns" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "rental_subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coupon_code" TEXT,
    "delivery_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pickup_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "setup_or_service_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "security_deposit" DECIMAL(12,2) NOT NULL,
    "total_payable" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',

    CONSTRAINT "booking_price_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_cancellations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "cancelled_by_role" "RoleType" NOT NULL,
    "cancelled_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "cancellation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundable_amount" DECIMAL(12,2) NOT NULL,
    "cancelled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "gateway_order_id" TEXT NOT NULL,
    "gateway_payment_id" TEXT,
    "gateway_signature" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "payment_method" TEXT,
    "receipt_number" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "gateway_event_id" TEXT,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "gateway_refund_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "refund_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_deposits" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "held_amount" DECIMAL(12,2) NOT NULL,
    "deducted_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "released_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "deduction_notes" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "gross_rental_amount" DECIMAL(12,2) NOT NULL,
    "commission_rate_pct" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "delivery_credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "damage_credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_provider_payout" DECIMAL(12,2) NOT NULL,
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    "payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_payouts" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "payout_reference" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "gateway_transfer_id" TEXT,
    "notes" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_ledger" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "provider_id" TEXT,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_records" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "handover_otp_hash" TEXT NOT NULL,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "customer_confirmed_at" TIMESTAMP(3),
    "provider_confirmed_at" TIMESTAMP(3),
    "checklist_json" JSONB,
    "photo_urls" JSONB,

    CONSTRAINT "pickup_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_records" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "delivery_partner_name" TEXT,
    "tracking_code" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "handover_otp_hash" TEXT NOT NULL,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "proof_photo_urls" JSONB,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_records" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "expected_return_at" TIMESTAMP(3) NOT NULL,
    "actual_returned_at" TIMESTAMP(3),
    "return_method" "FulfillmentMethod" NOT NULL,
    "late_hours" INTEGER NOT NULL DEFAULT 0,
    "late_fee_calculated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provider_confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "return_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "inspector_id" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL,
    "condition_passed" BOOLEAN NOT NULL,
    "accessories_present" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "photo_urls" JSONB,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_cost" DECIMAL(12,2) NOT NULL,
    "approved_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "evidence_urls" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "wishlist_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "product_rating" INTEGER NOT NULL,
    "provider_rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "photo_urls" JSONB,
    "provider_response" TEXT,
    "responded_at" TIMESTAMP(3),
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "listing_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachment_urls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "issue_category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachment_urls" JSONB,
    "is_internal_note" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "dispute_number" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "raised_by_id" TEXT NOT NULL,
    "dispute_type" "DisputeType" NOT NULL,
    "description" TEXT NOT NULL,
    "claimed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "settled_amount" DECIMAL(12,2),
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_notes" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_discount_cap" DECIMAL(10,2),
    "min_order_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_transactions" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_id" TEXT NOT NULL,
    "reward_amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "meta_title" TEXT,
    "meta_desc" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image_url" TEXT NOT NULL,
    "cta_text" TEXT,
    "cta_link" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_user_id_key" ON "provider_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_slug_key" ON "provider_profiles"("slug");

-- CreateIndex
CREATE INDEX "provider_profiles_city_verification_status_idx" ON "provider_profiles"("city", "verification_status");

-- CreateIndex
CREATE INDEX "provider_profiles_verification_status_idx" ON "provider_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_category_id_slug_key" ON "subcategories"("category_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_key_key" ON "category_attributes"("category_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_category_id_subcategory_id_status_idx" ON "listings"("category_id", "subcategory_id", "status");

-- CreateIndex
CREATE INDEX "listings_city_status_idx" ON "listings"("city", "status");

-- CreateIndex
CREATE INDEX "listings_provider_id_status_idx" ON "listings"("provider_id", "status");

-- CreateIndex
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images"("listing_id");

-- CreateIndex
CREATE INDEX "listing_attributes_attribute_id_value_text_idx" ON "listing_attributes"("attribute_id", "value_text");

-- CreateIndex
CREATE UNIQUE INDEX "listing_attributes_listing_id_attribute_id_key" ON "listing_attributes"("listing_id", "attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_pricing_listing_id_key" ON "listing_pricing"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_policies_listing_id_key" ON "listing_policies"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_listing_id_key" ON "inventory_items"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_units_inventory_item_id_serial_number_key" ON "inventory_units"("inventory_item_id", "serial_number");

-- CreateIndex
CREATE INDEX "inventory_movements_inventory_item_id_created_at_idx" ON "inventory_movements"("inventory_item_id", "created_at");

-- CreateIndex
CREATE INDEX "availability_blocks_inventory_item_id_start_date_end_date_idx" ON "availability_blocks"("inventory_item_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX "bookings_customer_id_status_idx" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "bookings_provider_id_status_idx" ON "bookings"("provider_id", "status");

-- CreateIndex
CREATE INDEX "bookings_start_date_end_date_status_idx" ON "bookings"("start_date", "end_date", "status");

-- CreateIndex
CREATE INDEX "booking_items_listing_id_idx" ON "booking_items"("listing_id");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_price_breakdowns_booking_id_key" ON "booking_price_breakdowns"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_cancellations_booking_id_key" ON "booking_cancellations"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_order_id_key" ON "payments"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_payment_id_key" ON "payments"("gateway_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_event_id_key" ON "payment_transactions"("gateway_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_gateway_refund_id_key" ON "refunds"("gateway_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_booking_id_key" ON "security_deposits"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_booking_id_key" ON "commissions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_payouts_payout_reference_key" ON "provider_payouts"("payout_reference");

-- CreateIndex
CREATE INDEX "provider_payouts_provider_id_status_idx" ON "provider_payouts"("provider_id", "status");

-- CreateIndex
CREATE INDEX "financial_ledger_booking_id_idx" ON "financial_ledger"("booking_id");

-- CreateIndex
CREATE INDEX "financial_ledger_provider_id_created_at_idx" ON "financial_ledger"("provider_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_records_booking_id_key" ON "pickup_records"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_records_booking_id_key" ON "delivery_records"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_records_booking_id_key" ON "return_records"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_key" ON "wishlists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_wishlist_id_listing_id_key" ON "wishlist_items"("wishlist_id", "listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_listing_id_is_visible_idx" ON "reviews"("listing_id", "is_visible");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_dispute_number_key" ON "disputes"("dispute_number");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_user_id_key" ON "admin_users"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_documents" ADD CONSTRAINT "provider_documents_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attribute_values" ADD CONSTRAINT "category_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_pricing" ADD CONSTRAINT "listing_pricing_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_policies" ADD CONSTRAINT "listing_policies_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_breakdowns" ADD CONSTRAINT "booking_price_breakdowns_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "provider_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payouts" ADD CONSTRAINT "provider_payouts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_records" ADD CONSTRAINT "pickup_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "wishlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
