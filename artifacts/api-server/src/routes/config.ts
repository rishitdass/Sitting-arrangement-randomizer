import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { configTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const UpdateConfigBody = z.object({
  tableCount: z.number().min(1).optional(),
  maxTeachersPerTable: z.number().min(1).optional(),
  seatsPerTable: z.number().min(2).optional(),
  zoneCount: z.number().min(1).max(20).optional(),
});

async function ensureConfig() {
  const rows = await db.select().from(configTable).limit(1);
  if (rows.length === 0) {
    const [cfg] = await db.insert(configTable).values({
      tableCount: 45,
      maxTeachersPerTable: 1,
      seatsPerTable: 4,
      zoneCount: 1,
    }).returning();
    return cfg;
  }
  return rows[0];
}

router.get("/", async (_req, res) => {
  const config = await ensureConfig();
  res.json(config);
});

router.put("/", async (req, res) => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const config = await ensureConfig();
  const [updated] = await db.update(configTable)
    .set(parsed.data)
    .where(eq(configTable.id, config.id))
    .returning();
  res.json(updated);
});

export default router;
