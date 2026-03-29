# Improv.md — Pending Implementation Tasks (After Existing Feature Audit)

**Last Updated:** March 28, 2026
**Scope:** Only tasks not already implemented in current codebase
**Priority Levels:** Critical | High | Medium | Low

---

## Table of Contents

- [1. Mailing Page (Pending)](#1-mailing-page-pending)
- [2. Companies Page (Pending)](#2-companies-page-pending)
- [3. Drive Management Hub (New Module)](#3-drive-management-hub-new-module)
- [4. Schedules Page (Pending)](#4-schedules-page-pending)
- [5. Cross-cutting Concerns (Pending)](#5-cross-cutting-concerns-pending)
- [6. Removed as Already Implemented](#6-removed-as-already-implemented)

---

## 1. Mailing Page (Pending)

**Current State:** Mailing queue, templates CRUD, approval workflow, and preview/edit flow already exist.

### Task 1.1: Auto Variable Injection Pipeline (Template Runtime Rendering)

- **Objective:** Render template variables automatically and safely at send time.
- **Why still needed:** UI supports template variables, but end-to-end runtime injection/validation is not fully implemented.
- **Scope:**
  - Resolve variables from context sources:
    - Company (name, domain, contacts)
    - Season/cycle metadata
    - Coordinator details
    - Optional recipient-level fields
  - Pre-send validation:
    - Detect unresolved placeholders
    - Block send or require explicit override
  - Preview parity:
    - Ensure preview output matches final sent output
  - Fallback behavior:
    - Optional defaults for missing variables
    - Missing-variable audit logs
- **API/Service Work:**
  - Add server-side renderer utility for template variable resolution
  - Add preview endpoint/path that uses the same renderer as send flow
  - Add unresolved-variable error contract in mail request approval/send path
- **Estimated Effort:** 4-6 days

### Task 1.4: Advanced Mail Analytics (Optional Enhancement)

- **Objective:** Add campaign dashboards (delivery/failure trends by template/team/time).
- **Why still needed:** Existing queue/inbound views are operational, but campaign analytics are limited.
- **Estimated Effort:** 4-5 days

---

## 2. Companies Page (Pending)

**Current State:** Company detail, contacts, assignments, and edit workflows already exist.

### Task 2.1: JNF Ownership Split by Page

- **Objective:** Keep current drives JNF management in Drive Management Hub and JNF history in Drive History page.
- **Required Change:**
  - Drive Management page handles active/current JNF operations.
  - Drive History page handles historical JNF records and reference.
- **Estimated Effort:** 2-3 days

### Task 2.3: Add contact information of SPOCs in Coordinator info tab of company details page

- **Objective:** Show SPOC contact information directly in the Coordinator info tab for quick access.
- **Scope:**
  - Display SPOC name, phone, email, and designation in company details coordinator tab.
  - Keep data editable via existing company contact/coordinator workflows.
- **Estimated Effort:** 2-3 days

---

## 3. Drive Management Hub (New Module)

**Current State:** Core drives and schedules exist, but post-confirmation execution layer is missing.

### Task 3.1: Drive Document Management

- **Objective:** Centralized docs per confirmed drive (JNF/INF/JD/offer docs) with versioning.
- **Why still needed:** No drive-specific document model/version history.
- **Estimated Effort:** 1 week

### Task 3.2: Drive Eligibility Engine

- **Objective:** Per-drive structured eligibility and student filtering.
- **Why still needed:** No dedicated drive eligibility model currently.
- **Estimated Effort:** 1 week

### Task 3.3: Drive-linked Attendance Layer on Top of Scheduling

- **Objective:** Extend existing schedule system with drive-linked OA/PPT attendance and reports.
- **Why still needed:** Scheduling exists; drive-bound attendance tracking/reporting does not.
- **Estimated Effort:** 1-1.5 weeks

### Task 3.4: Coordinator Task Checklist per Drive

- **Objective:** Assign per-drive operational tasks with deadlines and ownership.
- **Why still needed:** Company assignment exists, but drive-task granularity/checklist does not.
- **Estimated Effort:** 1 week

### Task 3.5: Communication Timeline per Drive

- **Objective:** Unified timeline of outgoing mail, responses, and follow-ups per drive.
- **Why still needed:** Mailing exists, but no drive-level communication thread view.
- **Estimated Effort:** 5 days

### Task 3.6: JNF Parsing and Auto-fill

- **Objective:** Parse uploaded JNF and prefill drive/eligibility fields.
- **Why still needed:** No parsing pipeline implemented.
- **Estimated Effort:** 1 week

### Task 3.7: Drive State Machine and Board

- **Objective:** Workflow states and kanban board:
  - Confirmed -> Docs Received -> Eligibility Set -> Scheduled -> Ongoing -> Completed
- **Why still needed:** Drive status exists, but execution-stage workflow board/checklist is missing.
- **Estimated Effort:** 1 week

### Task 3.8: Deadline and Alert Layer

- **Objective:** Deadline tracking and reminders per drive task/doc stage.
- **Why still needed:** No dedicated deadline registry/reminder model for drive execution.
- **Estimated Effort:** 1 week

### Task 3.9: Drive Announcement Composer

- **Objective:** Targeted student announcements per drive based on eligibility/registration.
- **Why still needed:** Notifications exist, but no drive-scoped announcement workflow.
- **Estimated Effort:** 1 week

### Task 3.10: Exception Handling Overlay

- **Objective:** Track last-minute eligibility/schedule changes and affected students.
- **Why still needed:** Audit logging exists, but exception-centric flow and impact handling are missing.
- **Estimated Effort:** 4-5 days

---

## 4. Schedules Page (Pending)

### Task 4.1: Acadly Integration and Sync

- **Objective:** Sync student/attendance data from Acadly with reconciliation.
- **Why still needed:** No Acadly integration route/service found.
- **API Endpoints:**
  - `POST /api/v1/admin/integrations/acadly/connect`
  - `POST /api/v1/admin/integrations/acadly/sync`
  - `GET /api/v1/admin/integrations/acadly/status`
- **Estimated Effort:** 1 week

---

## 5. Cross-cutting Concerns (Pending)

### Task 5.1: Data Privacy Hardening

- **Objective:** Field-level response filtering by role and consent-sensitive exports.
- **Why still needed:** Baseline RBAC exists, but field-level privacy controls are still partial.
- **Estimated Effort:** 1 week

### Task 5.2: Email Delivery Reliability Hardening

- **Objective:** Retry queues, bounce handling, and rate-limit strategy at provider layer.
- **Why still needed:** Functional mailing exists, reliability hardening not fully defined.
- **Estimated Effort:** 1 week

### Task 5.3: Feedback Collection Module

- **Objective:** Company and internal feedback forms + reporting.
- **Why still needed:** No dedicated feedback module found.
- **Estimated Effort:** 1 week

### Task 5.4: Architecture/Runbook Documentation

- **Objective:** System architecture docs, workflow runbooks, and edge-case playbooks.
- **Why still needed:** Needs formal operational documentation for IT handoff/review.
- **Estimated Effort:** 1 week

### Task 5.5: Migration Tooling for Legacy Sheets/Excel

- **Objective:** Data import, dedupe workflow, validation reports, rollback strategy.
- **Why still needed:** Import/export exists in parts; full migration workflow is pending.
- **Estimated Effort:** 2 weeks

### Task 5.6: Granular RBAC Permission Matrix

- **Objective:** Move from route-level checks to action-level permission controls.
- **Why still needed:** Baseline route-policy RBAC exists, but granular resource/action permission matrix is incomplete.
- **Scope:**
  - Define permissions by action/resource (view/edit/delete/approve/export)
  - Add field-level permission handling for sensitive entities
  - Harden API middleware for action checks
- **Estimated Effort:** 1-1.5 weeks

### Task 5.7: Notification Preferences and Priority Routing

- **Objective:** Add configurable notification preferences and priority-based delivery.
- **Why still needed:** Notification feed exists, but user-level preferences, priority routing, and action-target metadata are limited.
- **Scope:**
  - Preferences: channel-level opt-in/out and digest controls
  - Priority tags (critical/high/normal) and delivery behavior
  - Action URLs/context payload standards for deep linking
- **Estimated Effort:** 4-5 days

---

## 6. Removed as Already Implemented

The following proposed tasks were removed from actionable scope because core implementation already exists in the project:

- Mailing template CRUD and approvals (creation/edit/versioning)
- Mailing preview/edit flow before send
- Company detail + contacts + assignment visibility
- Assignments page with assignment APIs (including bulk/reassign/history routes)
- Drives analytics page and supporting stats APIs
- Schedule listing/creation and calendar-oriented schedule UI
- Baseline notifications feed and mark-read APIs (core only)
- Baseline audit logs and RBAC route-policy guardrails (core only)

---

## Implementation Roadmap (Pending Scope Only)

### Phase 1 (Weeks 1-2)

- Task 3.7 (Drive state machine/board)
- Task 3.1 (Drive document management)
- Task 3.2 (Drive eligibility engine)

### Phase 2 (Weeks 3-4)

- Task 3.3 (Drive attendance extension)
- Task 3.4 (Coordinator task checklist)
- Task 3.8 (Deadlines and alerts)

### Phase 3 (Weeks 5-6)

- Task 3.5 (Communication timeline)
- Task 3.9 (Drive announcements)
- Task 3.10 (Exception handling)

### Phase 4 (Weeks 7-8)

- Task 2.1 (JNF ownership split by page)
- Task 2.3 (SPOC contact information in coordinator tab)
- Task 4.1 (Acadly integration)

### Phase 5 (Weeks 9-10)

- Task 1.1 (Auto variable injection pipeline)
- Task 1.4 (Advanced mail analytics)
- Task 5.1 and 5.2 (privacy and mail reliability hardening)

### Phase 6 (Ongoing)

- Task 5.3, 5.4, 5.5, 5.6, 5.7

---

**Generated:** March 28, 2026 | **Version:** 2.0 (post-audit cleanup)
