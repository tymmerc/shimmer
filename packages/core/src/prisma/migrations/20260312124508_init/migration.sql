-- CreateEnum
CREATE TYPE "SearchType" AS ENUM ('EXACT', 'FUNCTIONAL', 'SIMILARITY', 'HYBRID');

-- CreateEnum
CREATE TYPE "ConversationStateEnum" AS ENUM ('INIT', 'DETECTION', 'QUALIFICATION', 'RECOMMENDATION', 'OBJECTION', 'PURCHASE', 'CLOSURE');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('ACTIVE', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MailCategory" AS ENUM ('ORDER_STATUS', 'RETURN_REQUEST', 'PRODUCT_QUESTION', 'COMPLAINT', 'DELIVERY_ISSUE', 'PAYMENT_ISSUE', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "MailStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SENT');

-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "api_key" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(200),
    "brand" VARCHAR(200),
    "price" DECIMAL(10,2),
    "compare_at_price" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_status" VARCHAR(20) NOT NULL DEFAULT 'in_stock',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "image_url" VARCHAR(1000),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "platform_id" INTEGER,
    "platform_product_id" VARCHAR(200),
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "attribute_name" VARCHAR(100) NOT NULL,
    "attribute_value" VARCHAR(500) NOT NULL,
    "attribute_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "unit" VARCHAR(30),
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_type" VARCHAR(50) NOT NULL,
    "variant_value" VARCHAR(100) NOT NULL,
    "price_modifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku_suffix" VARCHAR(20),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_taxonomy" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "category" VARCHAR(200),
    "keywords" TEXT[],
    "description" TEXT,
    "parent_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_usages" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "usage_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "source" VARCHAR(100) NOT NULL DEFAULT 'pim',
    "sources_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_sessions" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "session_token" VARCHAR(100) NOT NULL,
    "query" TEXT,
    "search_type" "SearchType",
    "stage_used" INTEGER,
    "mapped_usages" TEXT[],
    "results" JSONB NOT NULL DEFAULT '[]',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "selected_product_id" INTEGER,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_state" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "state" "ConversationStateEnum" NOT NULL DEFAULT 'INIT',
    "context" JSONB NOT NULL DEFAULT '{}',
    "budget_signal" VARCHAR(200),
    "detected_usages" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "session_token" VARCHAR(100) NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "status" "ChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalation_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_queue" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "external_id" VARCHAR(200),
    "from_addr" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "MailCategory",
    "urgency" VARCHAR(20),
    "sentiment" VARCHAR(20),
    "extracted_data" JSONB,
    "draft_response" TEXT,
    "confidence" DECIMAL(3,2),
    "status" "MailStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_feedback" (
    "id" SERIAL NOT NULL,
    "search_session_id" INTEGER NOT NULL,
    "query" TEXT,
    "stage_used" INTEGER,
    "mapped_usage" VARCHAR(50),
    "client_validated" BOOLEAN,
    "client_correction" VARCHAR(200),
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "address" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(30) NOT NULL DEFAULT 'card',
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "carrier" VARCHAR(50) NOT NULL,
    "tracking_number" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'preparing',
    "shipped_at" TIMESTAMP(3),
    "estimated_delivery" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "last_location" VARCHAR(200),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sav_requests" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "request_number" VARCHAR(20) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "description" TEXT,
    "resolution" TEXT,
    "refund_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "sav_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "api_url" VARCHAR(500),
    "api_status" VARCHAR(20) NOT NULL DEFAULT 'inactive',
    "credentials_ok" BOOLEAN NOT NULL DEFAULT false,
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "products_synced" INTEGER NOT NULL DEFAULT 0,
    "products_failed" INTEGER NOT NULL DEFAULT 0,
    "error_msg" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
    "product_id" INTEGER,
    "platform_id" INTEGER,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_knowledge" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "buyer_profile" VARCHAR(100) NOT NULL,
    "profile_label" VARCHAR(100) NOT NULL,
    "criteria" TEXT NOT NULL,
    "avoid" TEXT,
    "price_range_min" INTEGER,
    "price_range_max" INTEGER,
    "keywords" TEXT[],

    CONSTRAINT "product_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_api_key_key" ON "stores"("api_key");

-- CreateIndex
CREATE INDEX "products_store_id_idx" ON "products"("store_id");

-- CreateIndex
CREATE INDEX "products_platform_id_idx" ON "products"("platform_id");

-- CreateIndex
CREATE INDEX "products_stock_status_idx" ON "products"("stock_status");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_store_id_key" ON "products"("sku", "store_id");

-- CreateIndex
CREATE INDEX "product_attributes_product_id_idx" ON "product_attributes"("product_id");

-- CreateIndex
CREATE INDEX "product_attributes_attribute_name_idx" ON "product_attributes"("attribute_name");

-- CreateIndex
CREATE INDEX "idx_product_attrs_filterable" ON "product_attributes"("is_filterable");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_variant_type_variant_value_key" ON "product_variants"("product_id", "variant_type", "variant_value");

-- CreateIndex
CREATE UNIQUE INDEX "usage_taxonomy_code_key" ON "usage_taxonomy"("code");

-- CreateIndex
CREATE INDEX "usage_taxonomy_category_idx" ON "usage_taxonomy"("category");

-- CreateIndex
CREATE INDEX "usage_taxonomy_code_idx" ON "usage_taxonomy"("code");

-- CreateIndex
CREATE INDEX "product_usages_product_id_idx" ON "product_usages"("product_id");

-- CreateIndex
CREATE INDEX "product_usages_usage_id_idx" ON "product_usages"("usage_id");

-- CreateIndex
CREATE INDEX "product_usages_score_idx" ON "product_usages"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_usages_product_id_usage_id_key" ON "product_usages"("product_id", "usage_id");

-- CreateIndex
CREATE INDEX "search_sessions_store_id_idx" ON "search_sessions"("store_id");

-- CreateIndex
CREATE INDEX "search_sessions_session_token_idx" ON "search_sessions"("session_token");

-- CreateIndex
CREATE INDEX "search_sessions_created_at_idx" ON "search_sessions"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_state_session_id_key" ON "conversation_state"("session_id");

-- CreateIndex
CREATE INDEX "chat_sessions_store_id_idx" ON "chat_sessions"("store_id");

-- CreateIndex
CREATE INDEX "chat_sessions_session_token_idx" ON "chat_sessions"("session_token");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions"("status");

-- CreateIndex
CREATE INDEX "mail_queue_store_id_idx" ON "mail_queue"("store_id");

-- CreateIndex
CREATE INDEX "mail_queue_status_idx" ON "mail_queue"("status");

-- CreateIndex
CREATE INDEX "mail_queue_created_at_idx" ON "mail_queue"("created_at" DESC);

-- CreateIndex
CREATE INDEX "learning_feedback_search_session_id_idx" ON "learning_feedback"("search_session_id");

-- CreateIndex
CREATE INDEX "learning_feedback_created_at_idx" ON "learning_feedback"("created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_store_id_idx" ON "analytics_events"("store_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "customers_store_id_idx" ON "customers"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_store_id_key" ON "customers"("email", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_store_id_idx" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "sav_requests_request_number_key" ON "sav_requests"("request_number");

-- CreateIndex
CREATE INDEX "sav_requests_store_id_idx" ON "sav_requests"("store_id");

-- CreateIndex
CREATE INDEX "sav_requests_order_id_idx" ON "sav_requests"("order_id");

-- CreateIndex
CREATE INDEX "sav_requests_customer_id_idx" ON "sav_requests"("customer_id");

-- CreateIndex
CREATE INDEX "platforms_store_id_idx" ON "platforms"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_store_id_key" ON "platforms"("name", "store_id");

-- CreateIndex
CREATE INDEX "sync_logs_platform_id_idx" ON "sync_logs"("platform_id");

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "faq_store_id_idx" ON "faq"("store_id");

-- CreateIndex
CREATE INDEX "faq_category_idx" ON "faq"("category");

-- CreateIndex
CREATE INDEX "alerts_store_id_idx" ON "alerts"("store_id");

-- CreateIndex
CREATE INDEX "idx_alerts_unread" ON "alerts"("is_read");

-- CreateIndex
CREATE INDEX "product_knowledge_category_idx" ON "product_knowledge"("category");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_usages" ADD CONSTRAINT "product_usages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_usages" ADD CONSTRAINT "product_usages_usage_id_fkey" FOREIGN KEY ("usage_id") REFERENCES "usage_taxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "search_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_queue" ADD CONSTRAINT "mail_queue_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_feedback" ADD CONSTRAINT "learning_feedback_search_session_id_fkey" FOREIGN KEY ("search_session_id") REFERENCES "search_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sav_requests" ADD CONSTRAINT "sav_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sav_requests" ADD CONSTRAINT "sav_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sav_requests" ADD CONSTRAINT "sav_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq" ADD CONSTRAINT "faq_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
