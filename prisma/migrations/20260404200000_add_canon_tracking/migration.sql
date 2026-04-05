-- CreateTable
CREATE TABLE "canon_tracking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "consignacion_id" UUID NOT NULL,
    "canon_amount" INTEGER NOT NULL,
    "leasify_fee" INTEGER NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "pse_transaction_id" VARCHAR(100),
    "payment_reference" VARCHAR(100),
    "reported_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canon_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canon_tracking_consignacion_id_month_key" ON "canon_tracking"("consignacion_id", "month");

-- CreateIndex
CREATE INDEX "canon_tracking_agency_id_idx" ON "canon_tracking"("agency_id");

-- CreateIndex
CREATE INDEX "canon_tracking_agency_id_month_idx" ON "canon_tracking"("agency_id", "month");

-- AddForeignKey
ALTER TABLE "canon_tracking" ADD CONSTRAINT "canon_tracking_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canon_tracking" ADD CONSTRAINT "canon_tracking_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
