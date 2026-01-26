// Prisma configuration for Supabase PostgreSQL
//
// DATABASE_URL: Pooled connection (port 6543) for application runtime
// DIRECT_URL: Direct connection (port 5432) for schema push/migrations
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct URL for schema operations (db push, migrate)
    // The direct connection bypasses the connection pooler
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
