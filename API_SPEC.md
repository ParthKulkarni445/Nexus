# API Spec Plan (Nexus)

## Base
- Base path: `/api/v1`
- Auth: session/JWT via NextAuth/Auth.js
- Response envelope (recommended): `{ data, meta, error }`
- All write endpoints should generate `audit_logs`

## Feature-wise API Plan

## 1) Contact Database (Company + HR Contacts CRUD)
- `GET /companies`
  - List company masters with `search`, `industry`, `page`, `limit` filters.
- `POST /companies`
  - Create company master record.
- `GET /companies/:companyId`
  - Company detail with contacts, assignments, recent interactions, linked drives.
- `PUT /companies/:companyId`
  - Update company master attributes only.
- `DELETE /companies/:companyId`
  - Soft delete (admin only).
- `GET /companies/:companyId/contacts`
  - List contacts for a company.
- `POST /companies/:companyId/contacts`
  - Add new HR contact.
- `PUT /contacts/:contactId`
  - Update contact details.
- `DELETE /contacts/:contactId`
  - Soft delete contact.
- `POST /contacts/:contactId/quick-action`
  - Quick log for call/email/add-to-mail-request action.

## 2) Permissions + Export Controls
- `GET /auth/me`
  - Returns current user profile + effective permissions.
- `GET /admin/roles`
  - List roles and default permission matrix.
- `PUT /admin/users/:userId/permissions`
  - Grant/revoke granular permissions (e.g., export rights).
- `POST /exports/contacts`
  - Export contacts to `csv/xlsx` with filters.
- `POST /exports/drives`
  - Export drive/placement reports.

## 3) Assign Companies to Coordinators/Reps
- `POST /assignments`
  - Assign a company/contact to user with `primary/secondary` flag.
- `POST /assignments/bulk`
  - Bulk assign multiple companies.
- `PUT /assignments/:assignmentId/reassign`
  - Reassign ownership with reason.
- `GET /assignments/history?companyId=`
  - Fetch assignment change history.

## 4) Coordinator-wise Assigned List + Marked Items
- `GET /coordinators/me/assignments`
  - Dashboard list of assigned companies/contacts with statuses.
- `PUT /coordinators/me/task-marks`
  - Mark item as `follow_up`, `flagged`, `completed` with due date.
- `GET /coordinators/me/task-marks`
  - Fetch complete/flagged/follow-up markers.

## 5) Season Contacting Lifecycle + Audit
- `GET /seasons`
  - List recruitment seasons (`intern`, `placement`) and active windows.
- `POST /seasons`
  - Create a new season.
- `POST /companies/:companyId/season-cycles`
  - Create/activate company cycle for a season (unique per company + season).
- `GET /company-season-cycles?seasonId=&status=&assigneeId=&companyId=`
  - List operational company-season rows for Kanban/dashboard.
- `PUT /company-season-cycles/:cycleId/status`
  - Transition `not_contacted -> contacted -> positive -> accepted/rejected` with note.
- `GET /company-season-cycles/:cycleId/status-history`
  - Auditable status transition timeline for that season-cycle.
- `POST /company-season-cycles/:cycleId/status-hooks`
  - Internal endpoint to trigger automation (task creation/notification) after status change.

## 6) Templates (Mailing Team Managed)
- `GET /mail/templates`
  - List templates with status/version.
- `POST /mail/templates`
  - Create draft template.
- `PUT /mail/templates/:templateId`
  - Edit template (approved template edit creates new draft version).
- `POST /mail/templates/:templateId/approve`
  - Approve draft template.
- `POST /mail/templates/:templateId/archive`
  - Archive template.
- `GET /mail/templates/:templateId/versions`
  - Version history.
- `POST /mail/templates/:templateId/preview`
  - Render preview with sample variables.

## 7) Mailing Team Pending Queue
- `GET /mail/requests?status=pending`
  - Pending request queue for mailing team.
- `GET /mail/requests/:requestId`
  - Detailed request preview and metadata.
- `POST /mail/requests/:requestId/approve`
  - Approve request for immediate/scheduled send.
- `POST /mail/requests/:requestId/reject`
  - Reject with feedback.
- `POST /mail/requests/:requestId/schedule`
  - Schedule send time and throttling rules.

## 8) Two Mail Types: Template vs Custom
- `POST /mail/requests`
  - Create mail request (`template` or `custom`).
- `POST /mail/requests/:requestId/test-send`
  - Send preview/test email before final action.

## 9) Bulk Send via Filters
- `POST /mail/requests/:requestId/recipients/preview`
  - Preview recipient sample using filter criteria (`branch`, `year`, `eligibility`, tags).
- `POST /mail/requests/:requestId/send-bulk`
  - Execute bulk send with domain-aware rate limits.
- `GET /mail/rate-limits/domains`
  - Current domain throttle counters/limits.

## 10) Custom Mail View Once Then Send
- `POST /mail/requests/:requestId/view-once-confirm`
  - Confirm the final preview before send (safety checkpoint).
- `POST /mail/requests/:requestId/send`
  - Final dispatch for approved custom mail.

## 11) Scheduling (OA + Interview)
- `GET /drives?from=&to=&status=&seasonId=`
  - Calendar feed.
- `POST /drives`
  - Create tentative/confirmed drive with conflict checks; must reference `company_season_cycle_id`.
- `PUT /drives/:driveId`
  - Update drive details/status.
- `POST /drives/:driveId/confirm`
  - Confirm schedule and trigger student notifications.
- `GET /drives/conflicts?startAt=&endAt=&venue=`
  - Conflict detection endpoint.

## 12) Blogs: Submit -> Approve -> Publish
- `POST /blogs`
  - Student submits blog draft.
- `GET /blogs?company=&tag=&page=`
  - Browse approved blogs with filters.
- `GET /admin/blogs/moderation?status=pending`
  - Moderation queue.
- `POST /admin/blogs/:blogId/approve`
  - Approve blog.
- `POST /admin/blogs/:blogId/reject`
  - Reject blog with note.

## 13) Student Company-wise History/Stats
- `GET /companies/:companyId/stats`
  - Historical hiring stats, package trend, roles.
- `GET /companies/:companyId/experiences`
  - Archived experiences for the company.

## 14) Coordinator Quick Actions
- `POST /coordinators/me/call-logs`
  - Fast call logging from mobile/web against a `company_season_cycle_id`.
- `POST /coordinators/me/mail-requests`
  - Shortcut endpoint to create mail request from assignment context.

## 15) Constraint Checks & Governance
- `POST /governance/checks/blog`
  - PII/offensive-content screening result for blog drafts.
- `POST /governance/checks/mailing`
  - Suppression/domain policy check before send.
- `POST /governance/checks/schedule`
  - Date/venue clash checks.
- `POST /governance/override`
  - Human override endpoint with mandatory reason and audit logging.

## 16) Inbox Classification + Misc Segregation
- `POST /email/inbound`
  - Inbound webhook receiver (normalize, dedupe, enqueue classification).
- `POST /email/classify/:emailId`
  - Internal/manual classification action.
- `GET /email/inbox?bucket=unassigned|misc|company`
  - Inbox segmentation views.
- `PUT /email/:emailId/reclassify`
  - Manual reassignment of email to company/drive.
- `GET /email/threads/:threadId`
  - Thread timeline for context.

## Shared Platform APIs
- `GET /notifications`
  - User notification feed.
- `POST /notifications/mark-read`
  - Mark notifications read.
- `POST /wishlist/toggle`
  - Follow/unfollow company.
- `GET /mobile/sync?since=`
  - Delta sync for mobile cache.
- `POST /ai/generate`
  - AI assist draft generation for email/blog (human approval required).

## Suggested Endpoint Ownership (Role Scope)
- `tpo_admin`: full access, approvals, exports, reassignment, overrides.
- `coordinator`: CRUD limited to assigned entities, call logs, mail requests, drive updates.
- `student_representative`: limited assignment support + view/write where granted.
- `mailing_team`: templates, mail queue review/approve/send, inbox classification.
- `student`: read-only intelligence endpoints + blog submission + follow/wishlist.
- `tech_support`: configuration/ops endpoints, not business approvals.
