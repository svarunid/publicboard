import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

const DEFAULT_DATABASE_PATH = "data/app.sqlite";

export function createDatabase(source = Bun.env.DATABASE_URL ?? DEFAULT_DATABASE_PATH) {
  if (source !== ":memory:") {
    mkdirSync(dirname(source), {
      recursive: true,
    });
  }

  return drizzle({
    connection: {
      source,
      create: true,
      readwrite: true,
    },
    schema,
  });
}

export const db = createDatabase();
