import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { peopleTable, configTable, friendshipGroupsTable, groupMembersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import archiver from "archiver";
import { generateAllWeeks, type PersonData, type GroupData, type SeatingConfig } from "../lib/seating-algorithm.js";

const router: IRouter = Router();

let cachedWeeks: ReturnType<typeof generateAllWeeks> | null = null;

router.post("/generate", async (_req, res) => {
  const people = await db.select().from(peopleTable);
  if (people.length < 4) {
    res.status(400).json({ error: "not_enough_people", message: "Need at least 4 people to generate arrangements." });
    return;
  }

  const configRows = await db.select().from(configTable).limit(1);
  const config: SeatingConfig = configRows.length > 0
    ? {
        tableCount: configRows[0].tableCount,
        seatsPerTable: configRows[0].seatsPerTable,
        maxTeachersPerTable: configRows[0].maxTeachersPerTable,
      }
    : { tableCount: 45, seatsPerTable: 4, maxTeachersPerTable: 1 };

  const allGroups = await db.select().from(friendshipGroupsTable);
  const groupsData: GroupData[] = [];
  for (const group of allGroups) {
    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
    groupsData.push({
      id: group.id,
      friendshipLevel: group.friendshipLevel,
      memberIds: members.map(m => m.personId),
    });
  }

  const peopleData: PersonData[] = people.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    studentGroup: p.studentGroup,
  }));

  const weeks = generateAllWeeks(peopleData, groupsData, config);
  cachedWeeks = weeks;

  res.json({
    weeks: weeks.map(w => ({
      weekNumber: w.weekNumber,
      tables: w.tables.map(t => ({
        tableNumber: t.tableNumber,
        seats: t.seats.map(s => ({
          id: s.id,
          name: s.name,
          role: s.role,
          studentGroup: s.studentGroup,
        })),
      })),
    })),
    message: `Successfully generated 10 weekly arrangements for ${people.length} people across ${config.tableCount} tables.`,
  });
});

function formatRole(role: string): string {
  if (role === "teacher") return "Teacher";
  if (role === "non_teaching_staff") return "Non-Teaching Staff";
  return "Student";
}

function formatGroup(g?: string | null): string {
  if (!g) return "";
  const map: Record<string, string> = {
    junior_mag: "Junior Mag",
    senior_mag: "Senior Mag",
    grade_9: "Grade 9",
    grade_10: "Grade 10",
    grade_11: "Grade 11",
    grade_12: "Grade 12",
  };
  return map[g] ?? g;
}

async function buildExcel(weekNumber: number, week: ReturnType<typeof generateAllWeeks>[0]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pathashaala";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Week ${weekNumber}`);

  sheet.getRow(1).values = [`Pathashaala - Week ${weekNumber} Dining Arrangement`];
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.mergeCells("A1:E1");
  sheet.getRow(1).alignment = { horizontal: "center" };

  sheet.getRow(2).values = [];

  sheet.getRow(3).values = ["Table No.", "Seat", "Name", "Role", "Student Group"];
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2B6CB0" },
  };
  sheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };

  sheet.columns = [
    { key: "table", width: 12 },
    { key: "seat", width: 8 },
    { key: "name", width: 30 },
    { key: "role", width: 22 },
    { key: "group", width: 16 },
  ];

  let rowIdx = 4;
  const colors = ["FFEAF2FF", "FFF0FFF4", "FFFFF9F0", "FFFFF5F5"];
  let colorIdx = 0;

  for (const table of week.tables) {
    const fillColor = colors[colorIdx % colors.length];
    colorIdx++;
    for (let s = 0; s < table.seats.length; s++) {
      const person = table.seats[s];
      const row = sheet.getRow(rowIdx++);
      row.values = [
        s === 0 ? `Table ${table.tableNumber}` : "",
        s + 1,
        person.name,
        formatRole(person.role),
        formatGroup(person.studentGroup),
      ];
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
      if (s === 0) {
        row.getCell(1).font = { bold: true };
      }
      row.commit();
    }
    const sepRow = sheet.getRow(rowIdx++);
    sepRow.values = [];
    sepRow.commit();
  }

  sheet.addConditionalFormatting({
    ref: `A3:E${rowIdx}`,
    rules: [],
  });

  return await workbook.xlsx.writeBuffer();
}

router.get("/download/:weekIndex", async (req, res) => {
  const weekIndex = parseInt(req.params.weekIndex);
  if (isNaN(weekIndex) || weekIndex < 0 || weekIndex > 9) {
    res.status(400).json({ error: "invalid_week", message: "Week index must be 0-9" });
    return;
  }
  if (!cachedWeeks) {
    res.status(404).json({ error: "not_generated", message: "No arrangements generated yet. Please generate first." });
    return;
  }
  const week = cachedWeeks[weekIndex];
  const buffer = await buildExcel(week.weekNumber, week);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="pathashaala-week-${week.weekNumber}.xlsx"`);
  res.send(buffer);
});

router.get("/download-all", async (_req, res) => {
  if (!cachedWeeks) {
    res.status(404).json({ error: "not_generated", message: "No arrangements generated yet. Please generate first." });
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="pathashaala-all-weeks.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  for (const week of cachedWeeks) {
    const buffer = await buildExcel(week.weekNumber, week);
    archive.append(Buffer.from(buffer), { name: `pathashaala-week-${week.weekNumber}.xlsx` });
  }

  await archive.finalize();
});

export default router;
