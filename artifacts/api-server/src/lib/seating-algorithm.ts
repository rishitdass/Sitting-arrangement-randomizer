export interface PersonData {
  id: number;
  name: string;
  role: "student" | "teacher" | "non_teaching_staff";
  studentGroup?: string | null;
}

export interface GroupData {
  id: number;
  friendshipLevel: number; // 0-100, 100 = hard block (never sit together)
  memberIds: number[];
}

export interface SeatingConfig {
  tableCount: number;
  seatsPerTable: number;
  maxTeachersPerTable: number;
}

export interface TableResult {
  tableNumber: number;
  seats: PersonData[];
}

export interface WeekResult {
  weekNumber: number;
  tables: TableResult[];
}

const SENIOR_GROUPS = new Set(["senior_mag", "grade_11", "grade_12"]);

function isSenior(p: PersonData): boolean {
  return !!p.studentGroup && SENIOR_GROUPS.has(p.studentGroup);
}

function isAuthority(p: PersonData): boolean {
  return p.role === "teacher" || p.role === "non_teaching_staff";
}

function countTeachers(seats: PersonData[]): number {
  return seats.filter(s => s.role === "teacher").length;
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

/** Canonical key for a pair — always smaller ID first */
function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Record every pair who shared a table in a completed week */
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
 * Combined penalty for placing `person` at a table:
 *
 *  1. User-defined friendship rule at 100%  → Infinity  (hard block, never allowed)
 *  2. Previously sat together (cross-week)  → 500 000   (near-hard block, only violated
 *                                                         as absolute last resort)
 *  3. Partial friendship rule (< 100%)      → level²     (quadratic, strongly discourages)
 *
 * Higher score = worse choice. Infinity means "don't use this table at all."
 */
function computePenalty(
  tableSeats: PersonData[],
  person: PersonData,
  groups: GroupData[],
  seenPairs: Set<string>
): number {
  let total = 0;

  // --- Friendship rules ---
  for (const group of groups) {
    if (group.friendshipLevel <= 0) continue;
    if (!group.memberIds.includes(person.id)) continue;

    for (const seated of tableSeats) {
      if (!group.memberIds.includes(seated.id)) continue;

      if (group.friendshipLevel === 100) return Infinity; // absolute block
      total += group.friendshipLevel * group.friendshipLevel; // quadratic
    }
  }

  // --- Cross-week no-repeat penalty ---
  // 500 000 >> max friendship penalty (99² = 9801), so "already sat together"
  // will almost always outweigh any friendship concern, but unlike Infinity
  // it can be overridden in a genuine edge-case where no fresh partner exists.
  for (const seated of tableSeats) {
    if (seenPairs.has(pairKey(person.id, seated.id))) {
      total += 500_000;
    }
  }

  return total;
}

/**
 * Pick the best table index for `person`.
 * Returns -1 if no valid table exists (all full or all Infinity).
 */
function bestTableFor(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number
): number {
  const { seatsPerTable, maxTeachersPerTable } = config;

  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (table.length >= seatsPerTable) continue;
    if (person.role === "teacher" && countTeachers(table) >= maxTeachersPerTable) continue;

    const penalty = computePenalty(table, person, groups, seenPairs);
    if (penalty === Infinity) continue; // hard block by a 100% rule

    const score = penalty + rng() * 10; // small noise for variety
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Forced fallback: place person at any table with room,
 * minimising damage even if all ideal constraints are violated.
 * Never returns -1 as long as total capacity >= people count.
 */
function forcedPlace(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number
): number {
  const { seatsPerTable, maxTeachersPerTable } = config;
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (table.length >= seatsPerTable) continue;
    if (person.role === "teacher" && countTeachers(table) >= maxTeachersPerTable) continue;

    const pen = computePenalty(table, person, groups, seenPairs);
    // Treat Infinity as a very large number so we can compare
    const score = (pen === Infinity ? 10_000_000 : pen) + rng() * 10;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function placeOrForce(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
  seenPairs: Set<string>,
  config: SeatingConfig,
  rng: () => number
): void {
  let idx = bestTableFor(person, tables, groups, seenPairs, config, rng);
  if (idx < 0) idx = forcedPlace(person, tables, groups, seenPairs, config, rng);
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

  // Sort most-constrained first so the hardest-to-place people get first pick
  function hardBlockCount(p: PersonData): number {
    return groups.filter(g => g.friendshipLevel === 100 && g.memberIds.includes(p.id)).length;
  }

  const authorities = shuffle(people.filter(isAuthority), rng)
    .sort((a, b) => hardBlockCount(b) - hardBlockCount(a));

  const students = shuffle(people.filter(p => !isAuthority(p)), rng)
    .sort((a, b) => hardBlockCount(b) - hardBlockCount(a));

  // ── Phase 1: one authority per table (guarantee every table has supervision) ──
  const extraAuthorities: PersonData[] = [];
  for (let t = 0; t < authorities.length; t++) {
    const person = authorities[t];
    if (t < tableCount) {
      // Try to place directly at table t; if blocked, find the next empty table
      const pen = computePenalty(tables[t], person, groups, seenPairs);
      if (pen !== Infinity) {
        tables[t].push(person);
      } else {
        // Find another empty slot
        let placed = false;
        for (let t2 = 0; t2 < tableCount; t2++) {
          if (tables[t2].length === 0) {
            tables[t2].push(person);
            placed = true;
            break;
          }
        }
        if (!placed) extraAuthorities.push(person);
      }
    } else {
      extraAuthorities.push(person);
    }
  }

  // ── Phase 2: place overflow authorities ──
  for (const person of extraAuthorities) {
    placeOrForce(person, tables, groups, seenPairs, config, rng);
  }

  // ── Phase 3: place students ──
  for (const person of students) {
    placeOrForce(person, tables, groups, seenPairs, config, rng);
  }

  // ── Phase 4: post-process — ensure every non-empty table has a senior or authority ──
  for (let t = 0; t < tableCount; t++) {
    const table = tables[t];
    if (table.length === 0) continue;
    if (table.some(p => isAuthority(p) || isSenior(p))) continue;

    // Try to swap in a senior from another table
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

  return {
    weekNumber: weekIndex + 1,
    tables: tables
      .filter(t => t.length > 0)
      .map((seats, i) => ({ tableNumber: i + 1, seats })),
  };
}

export function generateAllWeeks(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig
): WeekResult[] {
  // seenPairs accumulates across weeks — the core of no-repeat guarantee
  const seenPairs = new Set<string>();
  const weeks: WeekResult[] = [];

  for (let w = 0; w < 10; w++) {
    const week = generateWeek(people, groups, config, w, seenPairs);
    recordWeekPairs(week, seenPairs);   // ← record AFTER generating, before next week
    weeks.push(week);
  }

  return weeks;
}
