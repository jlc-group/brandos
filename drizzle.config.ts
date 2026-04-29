import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://brandos_user:9MVtW9J68zl2$3Ba@192.168.0.41:5432/brandos_db",
  },
  verbose: true,
  strict: true,
});
