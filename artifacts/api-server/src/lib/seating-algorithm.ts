export interface PersonData {
  id: number;
  name: string;
  role: "student" | "teacher" | "non_teaching_staff";
  studentGroup?: string | null;
}

export interface GroupData {
  id: number;
  friendshipLevel: number;
  memberIds: number[];
}

export interface SeatingConfig {
  tableCount: number;
  seatsPerTable: number;
  maxTeachersPerTable: number;
  zoneCount: number;
}

export interface TableResult {
  tableNumber: number;
  seats: PersonData[];
  zone?: number;
}

export interface WeekResult {
  weekNumber: number;
  tables: TableResult[];
}

// grade_10, grade_11, grade_12 are seniors — they can serve as table authorities
const SENIOR_GROUPS = new Set(["senior_mag", "grade_10", "grade_11", "grade_12"]);

function isSenior(p: PersonData): boolean {
  return !!p.studentGroup && SENIOR_GROUPS.has(p.studentGroup);
}

function isAuthority(p: PersonData): boolean {
  return p.role === "teacher" || p.role === "non_teaching_staff";
}

function countTeachers(seats: PersonData[]): number {
  return seats.filter(s => s.role === "teacher").length;
}

function countStaff(seats: PersonData[]): number {
  return seats.filter(s => s.role === "non_teaching_staff").length;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function recordWeekPairs(week: WeekResult, seenPairs: Set<string>): void {
  for (const table of week.tables) {
    for (let i = 0; i < table.seats.length; i++) {
      for (let j = i + 1; j < table.seats.length; j++) {
        seenPairs.add(pairKey(table.seats[i].id, table.seats[j].id));
      }
    }
  }
}

/**
 * Combined penalty:
 *  1. 100% friendship rule  → Infinity  (absolute hard block)
 *  2. Previously sat together → 500,000  (near-hard, repeated tablemate)
 *  3. Partial friendship rule → level²   (quadratic discouragement)
 */
function computePenalty(
  tableSeats: PersonData[],
  person: PersonData,
  groups: GroupData[],
  seenPairs: Set<string>
): number {
  let total = 0;

  for (const group of groups) {
    if (group.friendshipLevel <= 0) continue;
    if (!group.memberIds.includes(person.id)) continue;

    for (const seated of tableSeats) {
      if (!group.memberIds.includes(seated.id)) continue;
      if (group.friendshipLevel === 100) return Infinity;
      total += group.friendshipLevel * group.friendshipLevel;
    }
  }

  for (const seated of tableSeats) {
    if (seenPairs.has(pairKey(person.id, seated.id))) {
      total += 500_000;
    }
  }

  return total;
}

/**
 * Pick the best available table for a person.
 * allowedTableIndices restricts which tables are considered (for zone enforcement).
 */
function bestTableFor(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number,
  allowedTableIndices?: Set<number>
): number {
  const { seatsPerTable, maxTeachersPerTable } = config;

  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < tables.length; i++) {
    if (allowedTableIndices && !allowedTableIndices.has(i)) continue;

    const table = tables[i];
    if (table.length >= seatsPerTable) continue;

    // Authority caps: max 1 teacher, max 1 non-teaching staff per table
    if (person.role === "teacher" && countTeachers(table) >= maxTeachersPerTable) continue;
    if (person.role === "non_teaching_staff" && countStaff(table) >= 1) continue;

    const penalty = computePenalty(table, person, groups, seenPairs);
    if (penalty === Infinity) continue;

    const score = penalty + rng() * 10;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function forcedPlace(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number,
  allowedTableIndices?: Set<number>
): number {
  const { seatsPerTable, maxTeachersPerTable } = config;
  let bestIdx = -1;
  let bestScore = Infinity;

  const indicesToCheck = allowedTableIndices
    ? [...allowedTableIndices]
    : tables.map((_, i) => i);

  for (const i of indicesToCheck) {
    const table = tables[i];
    if (table.length >= seatsPerTable) continue;
    if (person.role === "teacher" && countTeachers(table) >= maxTeachersPerTable) continue;
    if (person.role === "non_teaching_staff" && countStaff(table) >= 1) continue;

    const pen = computePenalty(table, person, groups, seenPairs);
    const score = (pen === Infinity ? 10_000_000 : pen) + rng() * 10;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  // If still no valid table (e.g. all staff slots full), try any table with room
  if (bestIdx < 0) {
    for (const i of indicesToCheck) {
      const table = tables[i];
      if (table.length < seatsPerTable) {
        bestIdx = i;
        break;
      }
    }
  }

  return bestIdx;
}

// Canonical segment ordering for zone rotation
const ZONE_SEGMENTS = [
  "junior_mag",
  "senior_mag",
  "grade_9",
  "grade_10",
  "grade_11",
  "grade_12",
  "teacher",
  "non_teaching_staff",
];

function getPersonSegment(p: PersonData): string {
  if (p.role === "teacher") return "teacher";
  if (p.role === "non_teaching_staff") return "non_teaching_staff";
  return p.studentGroup ?? "junior_mag";
}

/**
 * Builds a map from personId → allowed table indices, based on zone assignment.
 * With zoneCount=1 (default), every person gets all tables.
 */
function buildZoneAllowedTables(
  people: PersonData[],
  tableCount: number,
  zoneCount: number,
  weekIndex: number
): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();

  if (zoneCount <= 1) {
    const all = new Set(Array.from({ length: tableCount }, (_, i) => i));
    for (const p of people) result.set(p.id, all);
    return result;
  }

  // Build zone table ranges: 31 tables, 4 zones → [8,8,8,7]
  const baseSize = Math.floor(tableCount / zoneCount);
  const remainder = tableCount % zoneCount;
  const zoneStarts: number[] = [];
  const zoneSizes: number[] = [];
  let start = 0;
  for (let z = 0; z < zoneCount; z++) {
    const size = baseSize + (z < remainder ? 1 : 0);
    zoneStarts.push(start);
    zoneSizes.push(size);
    start += size;
  }

  // Build zone table sets
  const zoneTableSets: Set<number>[] = zoneStarts.map((s, z) => {
    const set = new Set<number>();
    for (let t = s; t < s + zoneSizes[z]; t++) set.add(t);
    return set;
  });

  // Assign each person to a zone based on their segment + weekIndex rotation
  for (const p of people) {
    const segIdx = ZONE_SEGMENTS.indexOf(getPersonSegment(p));
    const zone = (segIdx + weekIndex) % zoneCount;
    result.set(p.id, zoneTableSets[zone]);
  }

  return result;
}

function placeOrForce(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number,
  allowedTables: Set<number>
): void {
  let idx = bestTableFor(person, tables, groups, seenPairs, config, rng, allowedTables);

  // If zone restricted, try without zone restriction as fallback
  if (idx < 0 && config.zoneCount > 1) {
    idx = bestTableFor(person, tables, groups, seenPairs, config, rng);
  }

  if (idx < 0) {
    idx = forcedPlace(person, tables, groups, seenPairs, config, rng, allowedTables);
  }

  if (idx < 0) {
    idx = forcedPlace(person, tables, groups, seenPairs, config, rng);
  }

  if (idx >= 0) tables[idx].push(person);
}

export function generateWeek(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig,
  weekIndex: number,
  seenPairs: Set<string>
): WeekResult {
  const { tableCount, seatsPerTable } = config;
  const rng = seededRandom(weekIndex * 2_654_435_761 + 1_013_904_223);

  const tables: PersonData[][] = Array.from({ length: tableCount }, () => []);

  // Zone assignments per person
  const zoneAllowed = buildZoneAllowedTables(people, tableCount, config.zoneCount, weekIndex);

  function hardBlockCount(p: PersonData): number {
    return groups.filter(g => g.friendshipLevel === 100 && g.memberIds.includes(p.id)).length;
  }

  const authorities = shuffle(people.filter(isAuthority), rng)
    .sort((a, b) => hardBlockCount(b) - hardBlockCount(a));

  const students = shuffle(people.filter(p => !isAuthority(p)), rng)
    .sort((a, b) => hardBlockCount(b) - hardBlockCount(a));

  // ── Phase 1: one authority per table, respecting zone constraints ──
  const extraAuthorities: PersonData[] = [];
  for (let t = 0; t < authorities.length; t++) {
    const person = authorities[t];
    const allowed = zoneAllowed.get(person.id)!;

    if (t < tableCount) {
      // Try placing at table t if it's in this person's allowed zone
      if (allowed.has(t)) {
        const pen = computePenalty(tables[t], person, groups, seenPairs);
        if (pen !== Infinity) {
          tables[t].push(person);
          continue;
        }
      }
      // Find first empty table in allowed zone
      let placed = false;
      for (const ti of allowed) {
        if (tables[ti].length === 0) {
          tables[ti].push(person);
          placed = true;
          break;
        }
      }
      if (!placed) extraAuthorities.push(person);
    } else {
      extraAuthorities.push(person);
    }
  }

  // ── Phase 2: overflow authorities ──
  for (const person of extraAuthorities) {
    placeOrForce(person, tables, groups, seenPairs, config, rng, zoneAllowed.get(person.id)!);
  }

  // ── Phase 3: students ──
  for (const person of students) {
    placeOrForce(person, tables, groups, seenPairs, config, rng, zoneAllowed.get(person.id)!);
  }

  // ── Phase 4: ensure each table has a senior or authority ──
  for (let t = 0; t < tableCount; t++) {
    const table = tables[t];
    if (table.length === 0) continue;
    if (table.some(p => isAuthority(p) || isSenior(p))) continue;

    for (let t2 = 0; t2 < tableCount; t2++) {
      if (t2 === t) continue;
      const other = tables[t2];
      const si = other.findIndex(p => isSenior(p));
      if (si < 0) continue;

      const senior = other[si];
      const ji = table.findIndex(p => !isSenior(p) && !isAuthority(p));
      if (ji < 0) break;
      const junior = table[ji];

      const seniorAtT = computePenalty(table.filter((_, i) => i !== ji), senior, groups, seenPairs);
      const juniorAtT2 = computePenalty(other.filter((_, i) => i !== si), junior, groups, seenPairs);

      if (seniorAtT !== Infinity && juniorAtT2 !== Infinity) {
        table[ji] = senior;
        other[si] = junior;
        break;
      }
    }
  }

  // Build zone index for output labels
  let tableZoneMap: number[] = [];
  if (config.zoneCount > 1) {
    const baseSize = Math.floor(tableCount / config.zoneCount);
    const remainder = tableCount % config.zoneCount;
    let s = 0;
    for (let z = 0; z < config.zoneCount; z++) {
      const size = baseSize + (z < remainder ? 1 : 0);
      for (let t = 0; t < size; t++) tableZoneMap.push(z + 1);
      s += size;
    }
  }

  return {
    weekNumber: weekIndex + 1,
    tables: tables
      .filter(t => t.length > 0)
      .map((seats, i) => ({
        tableNumber: i + 1,
        seats,
        ...(config.zoneCount > 1 ? { zone: tableZoneMap[i] } : {}),
      })),
  };
}

export function generateAllWeeks(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig
): WeekResult[] {
  const seenPairs = new Set<string>();
  const weeks: WeekResult[] = [];

  for (let w = 0; w < 10; w++) {
    const week = generateWeek(people, groups, config, w, seenPairs);
    recordWeekPairs(week, seenPairs);
    weeks.push(week);
  }

  return weeks;
}
