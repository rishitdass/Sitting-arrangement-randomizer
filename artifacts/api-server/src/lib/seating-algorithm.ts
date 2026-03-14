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

function isSenior(person: PersonData): boolean {
  return !!person.studentGroup && SENIOR_GROUPS.has(person.studentGroup);
}

function isAuthority(person: PersonData): boolean {
  return person.role === "teacher" || person.role === "non_teaching_staff";
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
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function computeFriendshipPenalty(seats: PersonData[], newPerson: PersonData, groups: GroupData[]): number {
  let penalty = 0;
  for (const group of groups) {
    const level = group.friendshipLevel;
    if (level === 0) continue;
    const inGroup = group.memberIds.includes(newPerson.id);
    if (!inGroup) continue;
    const existingInGroup = seats.filter(s => group.memberIds.includes(s.id));
    if (existingInGroup.length > 0) {
      penalty += level;
    }
  }
  return penalty;
}

function tableHasAuthority(seats: PersonData[]): boolean {
  return seats.some(isAuthority);
}

function tableHasSeniorOrAuthority(seats: PersonData[]): boolean {
  return seats.some(s => isAuthority(s) || isSenior(s));
}

function countTeachers(seats: PersonData[]): number {
  return seats.filter(s => s.role === "teacher").length;
}

export function generateWeek(
  people: PersonData[],
  groups: GroupData[],
  config: SeatingConfig,
  weekIndex: number
): WeekResult {
  const { tableCount, seatsPerTable, maxTeachersPerTable } = config;
  const rng = seededRandom(weekIndex * 999983 + 137);

  const shuffled = shuffle(people, rng);

  const tables: PersonData[][] = Array.from({ length: tableCount }, () => []);

  const authorities = shuffled.filter(isAuthority);
  const nonAuthorities = shuffled.filter(p => !isAuthority(p));

  let authIdx = 0;
  for (let t = 0; t < tableCount && authIdx < authorities.length; t++) {
    tables[t].push(authorities[authIdx++]);
  }
  while (authIdx < authorities.length) {
    const tableIdx = Math.floor(rng() * tableCount);
    const table = tables[tableIdx];
    const teacherCount = countTeachers(table);
    const person = authorities[authIdx];
    if (person.role === "teacher" && teacherCount >= maxTeachersPerTable) {
      authIdx++;
      continue;
    }
    if (table.length < seatsPerTable) {
      table.push(person);
      authIdx++;
    } else {
      authIdx++;
    }
  }

  const shuffledNonAuth = shuffle(nonAuthorities, rng);
  for (const person of shuffledNonAuth) {
    let bestTable = -1;
    let bestScore = Infinity;

    const tablesWithRoom = tables
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.length < seatsPerTable);

    if (tablesWithRoom.length === 0) break;

    for (const { t, i } of tablesWithRoom) {
      const penalty = computeFriendshipPenalty(t, person, groups);
      const hasRoom = t.length < seatsPerTable;
      if (!hasRoom) continue;

      let score = penalty * 10;
      score += rng() * 5;

      if (score < bestScore) {
        bestScore = score;
        bestTable = i;
      }
    }

    if (bestTable >= 0) {
      tables[bestTable].push(person);
    }
  }

  for (let t = 0; t < tableCount; t++) {
    const table = tables[t];
    if (table.length === 0) continue;

    if (!tableHasSeniorOrAuthority(table)) {
      const tablePeople = [...table];
      const seniors = shuffledNonAuth.filter(
        p => isSenior(p) && !tablePeople.some(tp => tp.id === p.id)
      );
      if (seniors.length > 0) {
        const victim = tablePeople.find(p => !isSenior(p) && !isAuthority(p));
        if (victim) {
          const swapWith = seniors[0];
          const otherTable = tables.findIndex(ot =>
            ot !== table &&
            ot.some(p => p.id === swapWith.id)
          );
          if (otherTable >= 0 && tables[otherTable].length > 1) {
            const swapIdx = tables[otherTable].findIndex(p => p.id === swapWith.id);
            const victimIdx = table.findIndex(p => p.id === victim.id);
            [table[victimIdx], tables[otherTable][swapIdx]] = [tables[otherTable][swapIdx], table[victimIdx]];
          }
        }
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
  const weeks: WeekResult[] = [];
  for (let w = 0; w < 10; w++) {
    weeks.push(generateWeek(people, groups, config, w));
  }
  return weeks;
}
