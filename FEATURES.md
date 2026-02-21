# Nexus — Feature Spec

## Cover / Top-level mapping (start-page)

- **Pages / Actors mapping:**
  - **Placement Cell** ↔ primary TPO portal pages
  - **Student** ↔ Student portal (intelligence hub)
  - **Placement Authorities** appear as higher-level TPO admins (Placement Cell Officials)
  - **Mailing Team** is a special operational role connected to Placement Cell workflows

---

## Roles (explicit — follow your hierarchy)

- **Placement Cell Officials** (TPO Head, Primary Admins): full system control, approvals, final sign-off.
- **Student Coordinators**: day-to-day operators — add companies, call HR, submit mailing requests, quick call logs.
  - **General Coordinators**: Standard coordinator operations with company/contact management
  - **Student Representatives**: Coordinators with limited write/read permissions; help surface info and assist other coordinators
  - **Mailing Team**: Coordinators with specialized role responsible for templates, send approvals, deliverability and final sends
- **Students**: consumers of intelligence, can submit blogs and follow companies.
- **Admin / Tech Support**: platform-level configuration and troubleshooting.

**Important:** Student Representatives and Mailing Team are specialized types of coordinators, not separate roles. They inherit base coordinator permissions with additional specialized access.

---

## 1) Placement Cell — Contact Database (company-wise / HR contacts; CRUD)

**Purpose:** Single source-of-truth for all contacts and company relationships.

**Key features & behavior**

- Company-centric contact database containing company master records and HR contacts.
- Full CRUD on companies and contacts (Placement Cell Officials and authorized Coordinators based on permissions).
- Each contact entry includes: contact name, role/designation, email(s), phone number(s), notes, last-contacted date, preferred contact method, and related drives.
- Export/download option: placement cell users (with permission) can export the contact list or selected companies to Excel/CSV for offline use or reporting.

**UI expectations**

- Company list (searchable + filterable by industry/status).
- Company detail view shows contacts, past interactions, link to drives and previous placements.
- Contact quick-actions: call, email (opens compose/request flow), add to mailing request, assign to coordinator.

---

## 2) Permissions — All given (download option in Excel sheet)

**Purpose:** Clear privilege model for data access and export.

**What to implement conceptually**

- Roles map to permission levels (Placement Cell Officials > Student Coordinators > Student Representatives).
- Export controls: only roles with export permission can download contact lists or reports.
- Audit & checks: downloads are logged for audit (who exported what, when).

**UI notes**

- Export button on contact list (Excel/CSV); show confirmation + purpose note (for audit).
- Permission management UI (admin/tech support) to grant/revoke export & edit rights.

---

## 3) Assign Companies to Coordinators (Permission authority)

**Purpose:** Distribute workload and create accountability.

**Behavior**

- Admins / Placement Cell Officials assign companies (or specific contacts) to individual Student Coordinators or Student Representatives.
- Assignment includes optional notes for context and instructions.
- Assignments appear in the assigned coordinator’s dashboard and mobile app.

**Operational expectations**

- Bulk assign UI (select many companies -> assign)
- Notifications to assigned coordinator
- Reassignment flow with history (who reassigned, when)

---

## 4) For every coordinator — list of assigned firms / contacts (complete list; marked items)

**Purpose:** Give each coordinator a clear task list.

**Features**

- Coordinator dashboard shows the full list of assigned companies/contacts with statuses and quick actions (call log, mail request, schedule drive).
- Items can be marked complete/flagged/follow-up with date.
- Visual indicators: overdue follow-ups, last contact date, priority flags.

**Mobile-first**

- Coordinators get a mobile-optimized task list with one-tap logging, quick notes, and “add to mailing” action.

---

## 5) For every company — status lifecycle (Not Contacted → Contacted → Positive → Accepted / Rejected)

**Purpose:** Track progress of outreach and recruitment.

**Status definitions & transitions**

- **Not Contacted** — company exists but no outreach initiated.
- **Contacted** — coordinator has attempted/initiated contact (call logged or email request).
- **Positive** — company expressed interest / asked to proceed, requested JD, asked for tentative date.
- **Accepted** — company confirmed a visit/drive (confirmed schedule).
- **Rejected** — company declined or is not interested.

**Behavior**

- Status change must be auditable (who changed, when, notes).
- Certain transitions may trigger system actions:
  - Contacted → Positive: create tasks (send JD, schedule follow-ups)
  - Positive → Accepted: create drive record and notify students via calendar + notifications

- Status-driven notifications: e.g., when a company moves to Accepted, notify students who followed the company.

**UI**

- A Kanban style view for TPO: columns follow the status lifecycle for easier pipeline management.

---

## 6) Templates → Mailing Team will manage (edit, update, delete, add)

**(This section re-introduces the template + mailing team workflow now that assignments & statuses are defined.)**

**Mailing Team responsibilities**

- Maintain a governed template library for invites, follow-ups, JDs, thank-you notes.
- Approve or edit coordinator-submitted mail requests before final send.
- Ensure template compliance, tone, and deliverability.

**Template features**

- Placeholders / variables (company_name, drive_date, venue, contact_name, coordinator_name)
- Preview rendered sample
- Version history and approval metadata

---

## 7) Mailing Team — special mailing page & pending mails

**Purpose:** Central queue for incoming mail requests from coordinators.

**Mailing Team UI**

- Pending queue: lists all mail requests with metadata (coordinator, company, template/custom, urgency).
- For each request: preview rendered mail with variables, ability to edit, approve, schedule, reject with feedback.
- Batch scheduling controls and rate-limit indicators.

**Coordinator → Mailing interactions**

- Coordinator adds company to mailing list (creates mail_request).
- Mailing Team reviews and acts (approve/edit/send/reject).

---

## 8) Two types of mails — Template vs Custom

**Template-based**

- Use pre-approved templates; suited for bulk sends.
- Variables auto-populated.
- Require mailing team approval for bulk sends.

**Custom**

- Coordinator/MT composes ad-hoc text for specific circumstances.
- Mailing Team preview & sanity-check required before send (especially for broad recipients).

**UI**

- Choose template or custom when creating a mail request. Preview and optional test-send button.

---

## 9) Template → Bulk send option using filters

**Purpose:** Let mailing team perform targeted bulk sends safely.

**Filter options**

- Branch, graduation year, eligibility, tags, custom segments (e.g., pre-finalists, alumni pool).

**Policy & safety**

- Bulk sends require Mailing Team approval and obey per-domain rate limits.
- Preview sample recipients and sample rendered emails before sending.
- Ability to schedule staggered sends and throttling windows.

---

## 10) Custom → view text once then send

**Safety flow**

- Custom message previewed by Mailing Team exactly as recipients will see it.
- After preview, Mailing Team can send immediately or schedule.
- A “view once then send” confirmation step prevents accidental mass sends.

---

## 11) Scheduling — OA + Interview (company-wise → student view)

**(Expanded from earlier scheduling note, but placed here after mail/template items as per your ordering)**

**Behavior**

- Coordinators create tentative OA / interview entries for companies.
- Conflict detection warns on venue/date clashes.
- Confirmed schedules propagate to student calendars.
- Coordinators can mark drive status (tentative → confirmed → completed).

**Student view**

- Students see timelines and countdowns, can follow companies, and add events to personal calendars.

---

## 12) Blogs — create → authority (approval) → student (view)

**(Same workflow but placed now per your photo order)**

**Flow**

- Students submit interview experiences; moderators review; approved blogs published.
- Blogs must include metadata and follow constraints (no PII, factual accuracy).
- AI-assisted rewriting is allowed only as an assist and must be flagged.

---

## 13) Students can view — company-wise stats of last year / history

**Student intelligence**

- Company pages show historical stats, average packages, roles recruited, and archived experiences.
- Search & filters to find relevant interview experiences.

---

## 14) Every coordinator — quick actions & list of assigned firms

**(Reiteration to ensure flow continuity)**

- Coordinators use mobile task list for calls, follow-ups, mail requests, and status updates.
- Full list/complete-marked view for each coordinator to track progress.

---

## 15) Constraint checks & governance (mailing, blogs, schedule)

**Checks include:**

- Blog moderation (PII, offensive content)
- Mailing suppression & blocked domain checks
- Conflict detection for scheduling
- Explicit confirmations for risky actions (bulk send, sensitive content)

**Human-in-loop**

- Show warnings, require confirmation and logging when constraints are overridden.

---

## 16) Inbox classification & miscellaneous segregation

**Key signals for classification (priority order)**

1. Reply-to aliases (e.g., `hr+oracle@nexus.edu`)
2. Custom outbound headers (e.g., `X-Nexus-Company-ID`)
3. Thread matching (`In-Reply-To`, `References`)
4. Sender domain mapping → company (manual/learned)
5. Heuristics: subject/body keywords

**Fallback**

- Miscellaneous inbox for unclassified messages; manual triage by mailing team or coordinators.
