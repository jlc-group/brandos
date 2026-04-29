import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const migrationArg = process.argv[2];
if (!migrationArg) {
  throw new Error("Usage: node scripts/apply-sql-migration.mjs <migration.sql>");
}

dotenv.config({ path: "D:/Server/run/brandos/.env.prod" });

const migrationPath = path.resolve(process.cwd(), migrationArg);
const sql = fs.readFileSync(migrationPath, "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await pool.query(sql);
  console.log(`Applied migration: ${migrationPath}`);
} finally {
  await pool.end();
}
