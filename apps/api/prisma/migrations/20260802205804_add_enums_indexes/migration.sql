-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('API', 'SCRAPE', 'MOCK', 'AI');

-- AlterTable: tracked_accounts
-- deleted_at nullable olduğu için sorunsuz eklenir.
ALTER TABLE "tracked_accounts" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- source_type: DROP+ADD yerine mevcut veriyi enum'a CAST ediyoruz.
-- Veri zaten büyük harfe çevrilmişti ('API'), bu yüzden cast sorunsuz geçer.
ALTER TABLE "tracked_accounts"
  ALTER COLUMN "source_type" TYPE "SourceType"
  USING ("source_type"::"SourceType");

-- AlterTable: users
-- role: aynı şekilde DROP+ADD yerine CAST kullanıyoruz, mevcut ADMIN/USER
-- değerleri korunuyor, hiçbir kullanıcının rolü sıfırlanmıyor.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::"Role");

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "account_metrics_account_id_idx" ON "account_metrics"("account_id");

-- CreateIndex
CREATE INDEX "account_metrics_captured_at_idx" ON "account_metrics"("captured_at");

-- CreateIndex
CREATE INDEX "analysis_results_subject_type_subject_id_idx" ON "analysis_results"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "collection_jobs_account_id_idx" ON "collection_jobs"("account_id");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "post_metrics_captured_at_idx" ON "post_metrics"("captured_at");

-- CreateIndex
CREATE INDEX "posts_account_id_idx" ON "posts"("account_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "tracked_accounts_ig_username_idx" ON "tracked_accounts"("ig_username");

-- CreateIndex
-- NOT: Bu satır, ig_username kolonunda mevcut duplicate değer varsa
-- hata verir. Çalıştırmadan önce şu sorguyla kontrol etmen önerilir:
--   SELECT ig_username, COUNT(*) FROM tracked_accounts
--   GROUP BY ig_username HAVING COUNT(*) > 1;
-- Sonuç boşsa (muhtemelen öyle, tek hesabın var) sorunsuz geçer.
CREATE UNIQUE INDEX "tracked_accounts_ig_username_key" ON "tracked_accounts"("ig_username");