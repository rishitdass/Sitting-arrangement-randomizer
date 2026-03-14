# Workspace

## Overview

Pathashaala - A dining seat arrangement management system for schools. Supports 120 students, 30 teachers, and 30 non-teaching staff. Generates 10 different weekly Excel arrangements with smart seating constraints.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (v3), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite
- **Excel generation**: ExcelJS + archiver (zip)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── pathashaala/        # React + Vite frontend (at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Features

- **People Management**: Add/delete/bulk-import students (Junior Mag, Senior Mag, Grade 9-12), teachers, non-teaching staff
- **Configuration**: Set table count, seats per table, max teachers per table
- **Friendship Groups**: Create groups with friendship levels 0-100% (higher = avoid seating together)
- **Seating Algorithm**: Ensures every table has a teacher/staff OR at least a senior student; respects friendship constraints; generates unique arrangements per week using seeded random
- **10 Weekly Excel Exports**: Each week is different; can download individually or as zip
- **Excel Import Guide**: Documents the expected Excel format for bulk upload

## Database Schema

- `people`: id, name (unique), role (student/teacher/non_teaching_staff), student_group (junior_mag/senior_mag/grade_9/grade_10/grade_11/grade_12)
- `config`: id, table_count, max_teachers_per_table, seats_per_table
- `friendship_groups`: id, name, friendship_level (0-100)
- `group_members`: id, group_id, person_id

## API Routes

All routes under `/api`:
- `GET/POST /people` — list/create people
- `POST /people/bulk` — bulk create from parsed data
- `DELETE /people/:id` — remove person
- `GET/PUT /config` — get/update table config
- `GET/POST /groups` — list/create friendship groups
- `PUT/DELETE /groups/:id` — update/delete group
- `POST /arrangements/generate` — generate 10 weeks of arrangements
- `GET /arrangements/download/:weekIndex` — download single Excel (0-9)
- `GET /arrangements/download-all` — download all as zip

## Seating Algorithm Logic

- Located in `artifacts/api-server/src/lib/seating-algorithm.ts`
- Uses seeded RNG per week (different seed per week = different results)
- Ensures at least one authority (teacher/staff) per table; if none, tries to swap in a senior student
- Respects friendship groups via penalty scoring (higher friendship level = higher cost to seat together)
- Each week generates from scratch for variety

## TypeScript & Composite Projects

Every lib extends `tsconfig.base.json`. Run `pnpm run typecheck` from root.
