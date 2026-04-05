-- CreateEnum
CREATE TYPE "AgentCreditTransactionType" AS ENUM ('PURCHASE', 'DEDUCTION');

-- CreateTable
CREATE TABLE "agent_credits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_credit_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "AgentCreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "pse_transaction_id" VARCHAR(100),
    "amount_paid_cop" INTEGER,
    "application_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "subscription_plan_configs" ADD COLUMN "evaluation_credit_price" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "agent_credits_user_id_key" ON "agent_credits"("user_id");

-- CreateIndex
CREATE INDEX "agent_credits_user_id_idx" ON "agent_credits"("user_id");

-- CreateIndex
CREATE INDEX "agent_credit_transactions_user_id_created_at_idx" ON "agent_credit_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_credit_transactions_user_id_idx" ON "agent_credit_transactions"("user_id");

-- AddForeignKey
ALTER TABLE "agent_credits" ADD CONSTRAINT "agent_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_credit_transactions" ADD CONSTRAINT "agent_credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
