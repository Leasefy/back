// Prisma configuration for Supabase PostgreSQL
//
// For migrations, use the direct URL (non-pooled) by setting DATABASE_URL:
//   DATABASE_URL=$DIRECT_URL npx prisma migrate dev
//
// For application runtime, DATABASE_URL should point to the pooled connection
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
