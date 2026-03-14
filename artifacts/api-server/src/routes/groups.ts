import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { friendshipGroupsTable, groupMembersTable, peopleTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { CreateGroupBody, UpdateGroupBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getGroupWithMembers(groupId: number) {
  const group = await db.select().from(friendshipGroupsTable).where(eq(friendshipGroupsTable.id, groupId)).limit(1);
  if (group.length === 0) return null;
  const members = await db.select({
    personId: groupMembersTable.personId,
    personName: peopleTable.name,
  })
    .from(groupMembersTable)
    .innerJoin(peopleTable, eq(groupMembersTable.personId, peopleTable.id))
    .where(eq(groupMembersTable.groupId, groupId));
  return { ...group[0], members };
}

router.get("/", async (_req, res) => {
  const allGroups = await db.select().from(friendshipGroupsTable);
  const result = [];
  for (const group of allGroups) {
    const withMembers = await getGroupWithMembers(group.id);
    if (withMembers) result.push(withMembers);
  }
  res.json({ groups: result });
});

router.post("/", async (req, res) => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { name, friendshipLevel, memberPersonIds } = parsed.data;

  const existingPeople = await db.select().from(peopleTable).where(inArray(peopleTable.id, memberPersonIds));
  if (existingPeople.length !== memberPersonIds.length) {
    const foundIds = existingPeople.map(p => p.id);
    const missing = memberPersonIds.filter(id => !foundIds.includes(id));
    res.status(400).json({ error: "invalid_members", message: `Person IDs not found: ${missing.join(", ")}` });
    return;
  }

  const [group] = await db.insert(friendshipGroupsTable).values({ name, friendshipLevel }).returning();
  for (const personId of memberPersonIds) {
    await db.insert(groupMembersTable).values({ groupId: group.id, personId });
  }
  const withMembers = await getGroupWithMembers(group.id);
  res.status(201).json(withMembers);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }
  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { name, friendshipLevel, memberPersonIds } = parsed.data;

  const existing = await db.select().from(friendshipGroupsTable).where(eq(friendshipGroupsTable.id, id)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "not_found", message: "Group not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (friendshipLevel !== undefined) updateData.friendshipLevel = friendshipLevel;
  if (Object.keys(updateData).length > 0) {
    await db.update(friendshipGroupsTable).set(updateData).where(eq(friendshipGroupsTable.id, id));
  }

  if (memberPersonIds !== undefined) {
    if (memberPersonIds.length >= 2) {
      const existingPeople = await db.select().from(peopleTable).where(inArray(peopleTable.id, memberPersonIds));
      if (existingPeople.length !== memberPersonIds.length) {
        const foundIds = existingPeople.map(p => p.id);
        const missing = memberPersonIds.filter(pid => !foundIds.includes(pid));
        res.status(400).json({ error: "invalid_members", message: `Person IDs not found: ${missing.join(", ")}` });
        return;
      }
      await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
      for (const personId of memberPersonIds) {
        await db.insert(groupMembersTable).values({ groupId: id, personId });
      }
    }
  }

  const withMembers = await getGroupWithMembers(id);
  res.json(withMembers);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }
  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  const deleted = await db.delete(friendshipGroupsTable).where(eq(friendshipGroupsTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "not_found", message: "Group not found" });
    return;
  }
  res.status(204).send();
});

export default router;
