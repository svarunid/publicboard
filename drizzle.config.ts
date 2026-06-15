import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: Bun.env.DATABASE_URL ?? "data/app.sqlite",
  },
  strict: true,
  verbose: true,
});
