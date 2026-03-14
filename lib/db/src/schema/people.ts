import { pgTable, serial, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personRoleEnum = pgEnum("person_role", ["student", "teacher", "non_teaching_staff"]);
export const studentGroupEnum = pgEnum("student_group", ["junior_mag", "senior_mag", "grade_9", "grade_10", "grade_11", "grade_12"]);

export const peopleTable = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  role: personRoleEnum("role").notNull(),
  studentGroup: studentGroupEnum("student_group"),
});

export const insertPersonSchema = createInsertSchema(peopleTable).omit({ id: true });
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof peopleTable.$inferSelect;
