-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('SCHEDULED', 'SENT', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_MODERATION', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PublicationPlatform" AS ENUM ('PRODUCT_PAGE', 'GOOGLE', 'TRUSTPILOT');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "review_requests" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "review_request_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "order_id" INTEGER NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "product_rating" INTEGER,
    "delivery_rating" INTEGER,
    "service_rating" INTEGER,
    "title" VARCHAR(200),
    "comment" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "would_recommend" BOOLEAN,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
    "moderated_at" TIMESTAMP(3),
    "moderation_note" TEXT,
    "ai_summary" TEXT,
    "ai_sentiment" VARCHAR(20),
    "sav_triggered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_publications" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "platform" "PublicationPlatform" NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" VARCHAR(200),
    "external_url" VARCHAR(500),
    "published_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_token_key" ON "review_requests"("token");

-- CreateIndex
CREATE INDEX "review_requests_store_id_idx" ON "review_requests"("store_id");

-- CreateIndex
CREATE INDEX "review_requests_order_id_idx" ON "review_requests"("order_id");

-- CreateIndex
CREATE INDEX "review_requests_customer_id_idx" ON "review_requests"("customer_id");

-- CreateIndex
CREATE INDEX "review_requests_status_idx" ON "review_requests"("status");

-- CreateIndex
CREATE INDEX "review_requests_token_idx" ON "review_requests"("token");

-- CreateIndex
CREATE INDEX "reviews_store_id_idx" ON "reviews"("store_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "reviews_order_id_idx" ON "reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_overall_rating_idx" ON "reviews"("overall_rating");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at" DESC);

-- CreateIndex
CREATE INDEX "review_publications_review_id_idx" ON "review_publications"("review_id");

-- CreateIndex
CREATE INDEX "review_publications_platform_idx" ON "review_publications"("platform");

-- CreateIndex
CREATE INDEX "review_publications_status_idx" ON "review_publications"("status");

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_publications" ADD CONSTRAINT "review_publications_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
