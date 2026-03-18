# OA Schedule Feature — Implementation Plan (Integrated with Existing Nexus Platform)

---

# 1. Context

This feature is an extension of the existing Nexus platform.

Assumptions:

* Existing `companies` table is already present
* Existing auth system (NextAuth) is in place
* Existing notification + mailing system exists
* Existing role system (TPO / Student) is implemented

This document ONLY defines incremental additions required.

---

# 2. Feature Goal

Add OA (Online Assessment) scheduling capability that:

* Allows TPO to create/manage OA events
* Allows students to view schedules
* Enables one-click Google Calendar integration
* Hooks into existing notification system

---

# 3. Database Changes (Minimal Additions)

## New Table: oa_schedules

Fields:

* id (uuid, primary key)
* company_id (uuid, foreign key -> companies.id)
* title (text, required)
* description (text, optional)
* start_time (timestamp, UTC, required)
* end_time (timestamp, UTC, required)
* status (enum: scheduled | rescheduled | cancelled)
* created_by (uuid, reference to users table)
* updated_by (uuid)
* created_at (timestamp)
* updated_at (timestamp)

---

## Relations

* oa_schedules.company_id → companies.id
* Optional future:

  * Link to blogs
  * Link to drive history

---

# 4. API Additions (Extend Existing API Layer)

## Admin APIs (TPO Portal)

### POST /api/oa-schedules

Create OA event

---

### GET /api/oa-schedules

Fetch events (supports filters)

---

### PATCH /api/oa-schedules/:id

Update / reschedule event

---

### DELETE /api/oa-schedules/:id

Soft delete → mark as cancelled

---

## Student APIs

### GET /api/oa-schedules/upcoming

* Returns only future events
* Excludes cancelled

---

### GET /api/oa-schedules/:id/google-link

* Returns pre-generated Google Calendar URL

---

# 5. Service Layer (New Module)

Create a new service:

/services/oaScheduleService.ts

Responsibilities:

* CRUD operations
* Validation (time, status transitions)
* Google Calendar link generation
* Trigger notifications (reuse existing notification service)

---

# 6. Google Calendar Integration (Link-Based Only)

## Utility Function

Create:

/utils/generateGoogleCalendarLink.ts

Input:

* title
* description
* start_time
* end_time

Output:

* URL string

---

## Implementation Rules

* Use UTC timestamps
* Format: YYYYMMDDTHHmmssZ
* Use encodeURIComponent

---

# 7. Integration with Existing Systems

## Notifications (Reuse Existing)

Trigger via existing queue system when:

* New OA created
* OA rescheduled
* OA cancelled

---

## Company Module Integration

* OA schedules appear inside company detail page (optional enhancement)
* Can reuse company filters

---

## Student Wishlist Integration (Optional)

If student follows a company:

* Trigger targeted notification

---

# 8. Frontend Integration

## Student Portal

Add new page:

/oa-schedule

Reuse:

* existing layout
* existing card/table components

Add:

* "Add to Google Calendar" button

---

## TPO Portal

Add new section under admin:

/admin/oa-schedules

Reuse:

* existing CRUD UI patterns
* existing form components

---

# 9. Business Logic Rules

* start_time < end_time
* cancelled events hidden from students
* reschedule updates status automatically
* prevent duplicate overlapping entries (optional)

---

# 10. Implementation Order (Incremental)

1. Add DB table via Drizzle migration
2. Create service layer
3. Add APIs
4. Add Google Calendar utility
5. Integrate notifications
6. Build TPO UI (reuse components)
7. Build Student UI

---

# 11. Definition of Done

* TPO can manage OA schedules
* Students can view upcoming OA events
* Students can add events to Google Calendar
* Notifications integrated with existing system

---

# 12. Notes for Code Generation Tools

* DO NOT recreate existing modules
* Extend existing API structure
* Reuse auth middleware
* Reuse DB connection + Drizzle setup
* Follow existing folder conventions
