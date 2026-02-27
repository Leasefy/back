-- AlterTable: Add notification_settings, is_active, deleted_at to users
ALTER TABLE "users" ADD COLUMN "notification_settings" JSONB;
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateTable: team_members
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'viewer',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_owner_id_idx" ON "team_members"("owner_id");

-- CreateIndex (unique constraint: one invite per email per owner)
CREATE UNIQUE INDEX "team_members_owner_id_email_key" ON "team_members"("owner_id", "email");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
