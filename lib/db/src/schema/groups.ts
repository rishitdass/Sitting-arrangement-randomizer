import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const friendshipGroupsTable = pgTable("friendship_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  friendshipLevel: integer("friendship_level").notNull().default(50),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  personId: integer("person_id").notNull(),
});

export const insertGroupSchema = createInsertSchema(friendshipGroupsTable).omit({ id: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type FriendshipGroup = typeof friendshipGroupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
