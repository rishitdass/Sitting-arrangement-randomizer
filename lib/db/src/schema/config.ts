import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const configTable = pgTable("config", {
  id: serial("id").primaryKey(),
  tableCount: integer("table_count").notNull().default(45),
  maxTeachersPerTable: integer("max_teachers_per_table").notNull().default(1),
  seatsPerTable: integer("seats_per_table").notNull().default(4),
  zoneCount: integer("zone_count").notNull().default(1),
});

export const insertConfigSchema = createInsertSchema(configTable).omit({ id: true });
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof configTable.$inferSelect;
