# Drives Page Plan Review (Project-Aligned)

## 1. Executive Summary

This document revises the previous drives implementation plan using the actual Nexus codebase and schema.

Key outcome:

- Your original plan is strong conceptually.
- It is not fully aligned with the current Prisma schema and existing API routes.
- The best path is a phased rollout:
  1. ship a robust season and drive intelligence dashboard using current schema,
  2. add placement analytics (CTC/stipend) through a focused schema extension,
  3. add compare/export/privacy hardening.

---

## 2. Reality Check: Current Project State

### 2.1 Prisma models that already support Drives

From `prisma/schema.prisma`:

- `RecruitmentSeason`
- `CompanySeasonCycle`
- `Drive`
- `Company`
- `CompanyContact`
- `ContactInteraction`
- `Blog`
- `AuditLog`

Important relationship already in place:

- A drive is linked to a season through `Drive.companySeasonCycleId -> CompanySeasonCycle.seasonId`.

### 2.2 Existing API routes that already exist

From `app/api/v1`:

- `GET /api/v1/seasons`
- `GET /api/v1/drives`
- `POST /api/v1/drives`
- `PUT /api/v1/drives/:driveId`
- `GET /api/v1/company-season-cycles`
- `PUT /api/v1/company-season-cycles/:cycleId/status`
- `GET /api/v1/company-season-cycles/:cycleId/status-history`

### 2.3 Existing UI state

From `app/(portal)/drives/page.tsx`:

- Current page is mock-data driven and not wired to APIs yet.
- The visual language is already established and should be preserved.
- A route loading skeleton already exists in `app/(portal)/drives/loading.tsx`.

---

## 3. Compliance Matrix (Original Plan vs Current Schema)

| Area                        | Status      | Notes                                                                       | Action                                                            |
| --------------------------- | ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `recruitment_seasons`       | Compliant   | Already exists as `RecruitmentSeason`                                       | Reuse directly                                                    |
| Drive entity                | Partial     | Exists as `Drive`, but no direct `season_id` column                         | Use join via `companySeasonCycleId`                               |
| Company contacts            | Partial     | `emails` and `phones` are arrays, not single fields                         | API response should normalize/select primary                      |
| `company_yearly_stats`      | Not present | Mentioned in old plan, absent in actual schema                              | Remove dependency                                                 |
| Placements table            | Not present | Required for CTC/stipend analytics                                          | Add `Placement` model                                             |
| Student branch/year columns | Not present | `User` does not expose branch/year columns directly                         | Use `User.profileMeta` (short-term) or add profile table          |
| Student consent table       | Not present | Needed for privacy-safe student list display                                | Add `StudentDataConsent` model                                    |
| Aggregate tables/views      | Not present | `season_aggregates` and `company_season_aggregates` not present             | Add after placements                                              |
| Export audit table          | Not present | Export governance proposed but schema currently only has generic `AuditLog` | Start with `AuditLog`; add dedicated export audit later if needed |
| Compare endpoint            | Not present | Must be introduced                                                          | Add new endpoint(s) under `/api/v1/drives/stats`                  |

---

## 4. Corrected Data Model Plan

## 4.1 Keep as-is (already good)

- `RecruitmentSeason`
- `CompanySeasonCycle`
- `Drive`
- `CompanyContact`
- `ContactInteraction`
- `Blog`
- `AuditLog`

## 4.2 Add for analytics (Phase 2)

Recommended Prisma additions:

```prisma
model Placement {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  studentId          String   @map("student_id") @db.Uuid
  companyId          String   @map("company_id") @db.Uuid
  seasonId           String   @map("season_id") @db.Uuid
  driveId            String?  @map("drive_id") @db.Uuid
  role               String   @db.VarChar(255)
  packageType        String   @map("package_type") @db.VarChar(50) // ctc | stipend
  packageAmount      Decimal  @map("package_amount") @db.Decimal(12,2)
  packageFrequency   String?  @map("package_frequency") @db.VarChar(20) // yearly | monthly
  currency           String   @default("INR") @db.VarChar(10)
  selectionDate      DateTime? @map("selection_date") @db.Date
  placementStatus    String   @default("accepted") @map("placement_status") @db.VarChar(50)
  source             String?  @db.VarChar(100)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  student            User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  company            Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  season             RecruitmentSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  drive              Drive?   @relation(fields: [driveId], references: [id], onDelete: SetNull)

  @@index([seasonId, companyId], map: "placements_season_company_idx")
  @@index([studentId, seasonId], map: "placements_student_season_idx")
  @@index([packageAmount], map: "placements_package_amount_idx")
  @@map("placements")
}

model StudentDataConsent {
  studentId              String   @id @map("student_id") @db.Uuid
  allowPublicPlacementData Boolean @default(false) @map("allow_public_placement_data")
  updatedAt              DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  student                User     @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("student_data_consent")
}
```

## 4.3 Optional aggregate tables (Phase 3)

- `season_aggregates`
- `company_season_aggregates`

Use only if query latency becomes a bottleneck.

---

## 5. API Plan (Aligned to Current Route Style)

## 5.1 Keep existing endpoints and extend filters

### `GET /api/v1/drives`

Add support for:

- `seasonId`
- `companyId`
- `ownerUserId`

Implementation note:

- `seasonId` filter should be applied through relation:
  - `where: { companySeasonCycle: { seasonId } }`

## 5.2 New stats endpoints (recommended)

### `GET /api/v1/drives/stats/seasons`

- Returns seasons with basic counts for selector badges.

### `GET /api/v1/drives/stats/season/:seasonId/summary`

Phase 1 response (without placements):

- companies in cycle,
- cycle status distribution,
- total drives,
- confirmed/completed drives,
- recent activity trend.

Phase 2 response (with placements):

- total selected,
- avg/median/max/min package,
- histogram buckets.

### `GET /api/v1/drives/stats/season/:seasonId/companies`

- Paginated company rows with season-scoped stats.

### `GET /api/v1/drives/stats/season/:seasonId/company/:companyId`

- Company detail panel data:
  - cycle status timeline,
  - recent drives,
  - contacts used,
  - linked blogs,
  - placements (if model added and caller permitted).

### `GET /api/v1/drives/stats/compare`

- Compare two seasons for one company or global summary.

### `GET /api/v1/drives/stats/export`

- CSV first, XLSX later.
- Log every export in `AuditLog`.

---

## 6. Improved UI Plan (Tailored to Existing Nexus UI)

## 6.1 Information architecture

Page sections:

1. Season toolbar
2. KPI strip
3. Chart band
4. Company list/table
5. Right-side detail panel (desktop) / bottom sheet (mobile)

## 6.2 Season toolbar

Controls:

- Season select (required)
- Season type chip: Intern / Placement
- Search companies
- Quick filters: Status, Stage, Date range
- Export button (role-gated)
- Compare button

## 6.3 KPI strip

### Phase 1 KPIs (no placements required)

- Companies in season
- Not Contacted / Contacted / Positive / Accepted / Rejected
- Total drives
- Confirmed drives
- Completed drives
- Conflict-flagged drives

### Phase 2 KPIs (after placements)

- Students placed
- Avg package
- Median package
- Max package
- Min package

Each KPI chip should be clickable and apply a filter to company list.

## 6.4 Charts

Use existing dependency `recharts`.

Recommended chart set:

- Status stacked bar (season pipeline)
- Drives over time line chart (weekly/monthly)
- Stage distribution donut
- Package histogram and box summary (Phase 2)

## 6.5 Company list UX

Columns:

- Company
- Season status
- Drives (total, confirmed, completed)
- Last activity
- Contacts count
- Actions

Row expand panel:

- Recent drives
- Contact cards (primary email/phone)
- Linked blogs (approved only for students)
- Compare season CTA

Sorting options:

- Last activity (default)
- Completed drives
- Accepted status first
- Package metrics (Phase 2)

## 6.6 Compare UX

Modal with:

- Season A vs Season B selectors
- Scope toggle: Global / Company
- Delta cards with absolute and percentage change
- Trend mini chart

## 6.7 Role-aware data presentation

- Student: no personally identifiable student placement data.
- Coordinator/TPO: full access according to RBAC and consent.
- Export CTA hidden or disabled for unauthorized users.

## 6.8 Loading and empty states

- Keep current shimmer style and card geometry from existing `loading.tsx`.
- Empty state variants:
  - No season selected
  - No data for selected season
  - Filters returned zero rows

---

## 7. Query and Aggregation Strategy

## 7.1 Phase 1 aggregates (current schema)

Compute from:

- `CompanySeasonCycle`
- `Drive`
- `ContactInteraction`
- `Blog`

Example outputs:

- cycle status counts
- drive status/stage counts
- company activity leaderboard

## 7.2 Phase 2 aggregates (after placements)

Compute from `Placement`:

- avg/median/min/max package
- selected count by company/season
- role-wise selection distribution

Use Postgres `percentile_cont(0.5)` for median.

## 7.3 Caching

Start simple:

- Cache season summary for 5 to 15 min.
- Invalidate on placement import and drive writes.

Add materialized aggregates only when needed.

---

## 8. Privacy, RBAC, and Audit

- Respect existing role model in `lib/auth/rbac.ts`.
- Log student-level list reads and all exports in `AuditLog`.
- Introduce consent checks once `StudentDataConsent` is added.
- For student-facing endpoints, return only aggregate counts by default.

---

## 9. Delivery Plan (Practical Sprint Breakdown)

## Sprint 1 (No migration, high impact)

- Replace mock data in drives page with live APIs.
- Add season selector and status-driven KPIs.
- Add company list filters and detail panel from existing models.
- Add compare UI shell with non-package metrics.

## Sprint 2 (Analytics foundation)

- Add `Placement` + import path.
- Add package KPIs and charts.
- Add `drives/stats` endpoints for compensation analytics.

## Sprint 3 (Governance and performance)

- Add `StudentDataConsent` checks.
- Add export endpoint + audit metadata.
- Add optional aggregate tables/materialized views if needed.

---

## 10. Final Recommendation

Implement the drives dashboard in two layers:

- Layer A (now): pipeline intelligence using existing schema.
- Layer B (next): placement compensation analytics via a small schema extension.

This avoids blocking on large migrations while still delivering immediate product value and keeping the UI roadmap compatible with your long-term vision.