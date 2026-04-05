-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "evaluation_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "run_id" VARCHAR(100) NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "amount_paid_cop" INTEGER NOT NULL,
    "credits_deducted" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_results_application_id_key" ON "evaluation_results"("application_id");

-- CreateIndex
CREATE INDEX "evaluation_results_application_id_idx" ON "evaluation_results"("application_id");

-- CreateIndex
CREATE INDEX "evaluation_results_requested_by_idx" ON "evaluation_results"("requested_by");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_transactions_evaluation_id_key" ON "evaluation_transactions"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_transactions_user_id_idx" ON "evaluation_transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_usage_userId_month_year_eval" ON "evaluation_usage"("user_id", "month", "year");

-- CreateIndex
CREATE INDEX "evaluation_usage_user_id_idx" ON "evaluation_usage"("user_id");

-- AddForeignKey
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_transactions" ADD CONSTRAINT "evaluation_transactions_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluation_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_transactions" ADD CONSTRAINT "evaluation_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_usage" ADD CONSTRAINT "evaluation_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
