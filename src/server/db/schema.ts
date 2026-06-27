import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  board: text("board").notNull(),
  evidence: text("evidence").notNull(),
  evidenceType: text("evidence_type").notNull(),
  country: text("country").notNull(),
  state: text("state"),
  district: text("district"),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
