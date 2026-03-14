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

/**
 * Returns Infinity if placing `person` at `table` violates a 100% rule.
 * Returns a weighted penalty for partial friendship levels.
 */
function friendshipPenalty(
  tableSeats: PersonData[],
  person: PersonData,
  groups: GroupData[]
): number {
  let totalPenalty = 0;
  for (const group of groups) {
    if (group.friendshipLevel <= 0) continue;
    if (!group.memberIds.includes(person.id)) continue;

    const friendsAlreadyThere = tableSeats.filter(s => group.memberIds.includes(s.id));
    if (friendsAlreadyThere.length === 0) continue;

    // 100% = hard block (absolute rule - they must NEVER sit together)
    if (group.friendshipLevel === 100) return Infinity;

    // Partial levels: quadratic scaling to strongly prefer separation
    // At 50% → penalty 2500; at 75% → penalty 5625; at 99% → penalty 9801
    totalPenalty += group.friendshipLevel * group.friendshipLevel;
  }
  return totalPenalty;
}

/**
 * Find the best table index for a person given:
 * - Tables that still have room (fewer than seatsPerTable seats)
 * - Teacher cap (if person is a teacher)
 * - Friendship constraints (100% = Infinity = skip that table)
 * - Small random noise to ensure variety
 */
function bestTableFor(
  person: PersonData,
  tables: PersonData[][],
  groups: GroupData[],
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

    // Teacher cap
    if (person.role === "teacher" && countTeachers(table) >= maxTeachersPerTable) continue;

    const penalty = friendshipPenalty(table, person, groups);
    if (penalty === Infinity) continue; // hard block

    // Add small randomness to avoid deterministic clumping
    const score = penalty + rng() * 10;

    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export function generateWeek(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig,
  weekIndex: number
): WeekResult {
  const { tableCount, seatsPerTable } = config;
  const rng = seededRandom(weekIndex * 2654435761 + 1013904223);

  const tables: PersonData[][] = Array.from({ length: tableCount }, () => []);

  // Shuffle everyone, but sort by constraint strength (most constrained first)
  const shuffled = shuffle(people, rng);

  // Count how many 100% hard-block groups a person is in (more = harder to place)
  function constraintScore(p: PersonData): number {
    return groups.filter(g => g.friendshipLevel === 100 && g.memberIds.includes(p.id)).length;
  }

  // Place authorities first (teachers + non-teaching staff), one per table if possible
  const authorities = shuffle(shuffled.filter(isAuthority), rng)
    .sort((a, b) => constraintScore(b) - constraintScore(a));

  const students = shuffle(shuffled.filter(p => !isAuthority(p)), rng)
    .sort((a, b) => constraintScore(b) - constraintScore(a));

  // Phase 1: Distribute one authority per table (guarantee coverage)
  const unplacedAuthorities: PersonData[] = [];
  const authorityQueue = [...authorities];

  // First pass: one authority per table
  for (let t = 0; t < tableCount && authorityQueue.length > 0; t++) {
    const person = authorityQueue[0];
    const penalty = friendshipPenalty(tables[t], person, groups);
    if (penalty === Infinity) {
      // Can't place here due to hard block - try to find another table
      let placed = false;
      for (let t2 = 0; t2 < tableCount; t2++) {
        if (tables[t2].length === 0) {
          // Empty table - safe to put anyone here (no conflicts possible)
          tables[t2].push(person);
          authorityQueue.shift();
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Just put at first available table with room - constraints can't be fully satisfied
        const idx = bestTableFor(person, tables, groups, config, rng);
        if (idx >= 0) {
          tables[idx].push(person);
        }
        authorityQueue.shift();
      }
    } else {
      tables[t].push(person);
      authorityQueue.shift();
    }
  }

  // Remaining authorities (more than tableCount authorities)
  for (const person of authorityQueue) {
    const idx = bestTableFor(person, tables, groups, config, rng);
    if (idx >= 0) {
      tables[idx].push(person);
    } else {
      // Forced placement - find any table with room, even violating partial constraints
      for (let t = 0; t < tableCount; t++) {
        if (tables[t].length < seatsPerTable) {
          if (person.role !== "teacher" || countTeachers(tables[t]) < config.maxTeachersPerTable) {
            tables[t].push(person);
            break;
          }
        }
      }
    }
  }

  // Phase 2: Place students
  for (const person of students) {
    const idx = bestTableFor(person, tables, groups, config, rng);
    if (idx >= 0) {
      tables[idx].push(person);
    } else {
      // Forced placement - try to respect partial constraints but must place
      let bestFallback = -1;
      let bestFallbackScore = Infinity;
      for (let t = 0; t < tableCount; t++) {
        if (tables[t].length >= seatsPerTable) continue;
        const pen = friendshipPenalty(tables[t], person, groups);
        // Even Infinity tables are acceptable as last resort
        const score = (pen === Infinity ? 9999999 : pen) + rng() * 10;
        if (score < bestFallbackScore) {
          bestFallbackScore = score;
          bestFallback = t;
        }
      }
      if (bestFallback >= 0) {
        tables[bestFallback].push(person);
      }
    }
  }

  // Phase 3: Fix tables that have no authority AND no senior student
  // Try to swap a junior student out for a senior from another table
  for (let t = 0; t < tableCount; t++) {
    const table = tables[t];
    if (table.length === 0) continue;
    if (table.some(p => isAuthority(p) || isSenior(p))) continue;

    // Find a senior student in any other table that we could swap in
    for (let t2 = 0; t2 < tableCount; t2++) {
      if (t2 === t) continue;
      const otherTable = tables[t2];
      const seniorIdx = otherTable.findIndex(p => isSenior(p));
      if (seniorIdx < 0) continue;

      const senior = otherTable[seniorIdx];

      // Find a junior from table t to swap out
      const juniorIdx = table.findIndex(p => !isSenior(p) && !isAuthority(p));
      if (juniorIdx < 0) break;

      const junior = table[juniorIdx];

      // Verify swap doesn't violate 100% hard blocks
      const seniorInT = friendshipPenalty(
        table.filter((_, i) => i !== juniorIdx),
        senior,
        groups
      );
      const juniorInT2 = friendshipPenalty(
        otherTable.filter((_, i) => i !== seniorIdx),
        junior,
        groups
      );

      if (seniorInT !== Infinity && juniorInT2 !== Infinity) {
        table[juniorIdx] = senior;
        otherTable[seniorIdx] = junior;
        break;
      }
    }
  }

  return {
    weekNumber: weekIndex + 1,
    tables: tables
      .filter(t => t.length > 0)
      .map((seats, i) => ({
        tableNumber: i + 1,
        seats,
      })),
  };
}

export function generateAllWeeks(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig
): WeekResult[] {
  return Array.from({ length: 10 }, (_, w) => generateWeek(people, groups, config, w));
}
