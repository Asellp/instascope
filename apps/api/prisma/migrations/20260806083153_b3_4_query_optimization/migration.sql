/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `tracked_accounts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tracked_accounts_ig_username_idx";

-- AlterTable
ALTER TABLE "tracked_accounts" DROP COLUMN "deleted_at";

-- CreateIndex
CREATE INDEX "analysis_results_subject_id_kind_created_at_idx" ON "analysis_results"("subject_id", "kind", "created_at");

-- CreateIndex
CREATE INDEX "posts_account_id_posted_at_idx" ON "posts"("account_id", "posted_at");
