-- Split emergency_contact into emergency_contact_name and emergency_contact_phone
ALTER TABLE "User" ADD COLUMN "emergency_contact_name" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN "emergency_contact_phone" VARCHAR(30);
ALTER TABLE "User" DROP COLUMN IF EXISTS "emergency_contact";
