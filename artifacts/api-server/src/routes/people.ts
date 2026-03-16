import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { peopleTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { CreatePersonBody, BulkCreatePeopleBody } from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const people = await db.select().from(peopleTable).orderBy(peopleTable.name);
  res.json({ people });
});

router.post("/", async (req, res) => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { name, role, studentGroup } = parsed.data;

  const existing = await db.select().from(peopleTable).where(eq(peopleTable.name, name));
  if (existing.length > 0) {
    res.status(409).json({ error: "duplicate_name", message: `A person named "${name}" already exists.` });
    return;
  }

  const [person] = await db.insert(peopleTable).values({
    name,
    role,
    studentGroup: studentGroup ?? null,
  }).returning();
  res.status(201).json(person);
});

router.post("/bulk", async (req, res) => {
  const parsed = BulkCreatePeopleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const personData of parsed.data.people) {
    const { name, role, studentGroup } = personData;
    if (!name || !role) {
      errors.push(`Skipping row: missing name or role`);
      skipped++;
      continue;
    }
    const existing = await db.select().from(peopleTable).where(eq(peopleTable.name, name));
    if (existing.length > 0) {
      errors.push(`"${name}" already exists, skipped.`);
      skipped++;
      continue;
    }
    await db.insert(peopleTable).values({
      name,
      role,
      studentGroup: studentGroup ?? null,
    });
    created++;
  }

  res.json({ created, skipped, errors });
});

router.delete("/bulk", async (req, res) => {
  const parsed = z.object({ ids: z.array(z.number()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "ids must be a non-empty array of numbers" });
    return;
  }
  const { ids } = parsed.data;
  await db.delete(peopleTable).where(inArray(peopleTable.id, ids));
  res.status(204).send();
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }
  const deleted = await db.delete(peopleTable).where(eq(peopleTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "not_found", message: "Person not found" });
    return;
  }
  res.status(204).send();
});

export default router;
