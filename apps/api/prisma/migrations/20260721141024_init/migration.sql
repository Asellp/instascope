-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_accounts" (
    "id" TEXT NOT NULL,
    "ig_username" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "access_token_enc" TEXT,
    "schedule_cron" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "tracked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "ig_media_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "posted_at" TIMESTAMP(3),
    "permalink" TEXT,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_metrics" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_metrics" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "media_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "account_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_hash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "commented_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_jobs" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "items_collected" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "collection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "posts_ig_media_id_key" ON "posts"("ig_media_id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "tracked_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_metrics" ADD CONSTRAINT "account_metrics_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "tracked_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_jobs" ADD CONSTRAINT "collection_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "tracked_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
