# API Implementation Guide

This document provides an overview of the implemented REST APIs for the Nexus TPO system.

## Base URL

All API endpoints are prefixed with: `/api/v1`

## Authentication

Currently using placeholder authentication. To implement production auth:

1. Install NextAuth.js: `npm install next-auth`
2. Update `lib/api/auth.ts` with actual session/JWT validation
3. Configure authentication providers

## Response Format

All endpoints return a consistent response envelope:

```typescript
{
  data?: any,           // Response data
  meta?: {              // Optional metadata (pagination, etc.)
    page?: number,
    limit?: number,
    total?: number
  },
  error?: {             // Only present on errors
    code: string,
    message: string,
    details?: any
  }
}
```

## API Endpoints

### Authentication & Authorization

#### `GET /api/v1/auth/me`

Get current user profile and permissions.

- **Auth Required**: Yes
- **Response**: User profile, role, and custom permissions

#### `PUT /api/v1/admin/users/:userId/permissions`

Grant or revoke granular permissions.

- **Auth Required**: Yes (tpo_admin only)
- **Body**: `{ permissions: [{ key: string, allowed: boolean }] }`

---

### Company Management

#### `GET /api/v1/companies`

List companies with search and filters.

- **Query Params**: `search`, `industry`, `page`, `limit`
- **Response**: Paginated company list

#### `POST /api/v1/companies`

Create a new company.

- **Auth Required**: Yes (tpo_admin, coordinator)
- **Body**: `{ name, slug, domain?, industry?, website?, priority?, notes? }`

#### `GET /api/v1/companies/:companyId`

Get detailed company info with contacts, assignments, interactions, and drives.

- **Auth Required**: Yes

#### `PUT /api/v1/companies/:companyId`

Update company details.

- **Auth Required**: Yes (tpo_admin, coordinator)

#### `DELETE /api/v1/companies/:companyId`

Delete company (admin only).

- **Auth Required**: Yes (tpo_admin only)

---

### Company Contacts

#### `GET /api/v1/companies/:companyId/contacts`

List all contacts for a company.

#### `POST /api/v1/companies/:companyId/contacts`

Add new HR contact to company.

- **Auth Required**: Yes (tpo_admin, coordinator, student_representative)
- **Body**: `{ name, designation?, emails?, phones?, preferredContactMethod?, notes? }`

#### `PUT /api/v1/contacts/:contactId`

Update contact details.

#### `DELETE /api/v1/contacts/:contactId`

Delete contact.

#### `POST /api/v1/contacts/:contactId/quick-action`

Quick log for call/email/note action.

- **Body**: `{ action: "call"|"email"|"note", summary, outcome?, nextFollowUpAt?, companySeasonCycleId? }`

---

### Assignments

#### `POST /api/v1/assignments`

Assign company/contact to user.

- **Auth Required**: Yes (tpo_admin, coordinator)
- **Body**: `{ itemType: "company"|"contact", itemId, assigneeUserId, assignmentRole: "primary"|"secondary", notes? }`

#### `POST /api/v1/assignments/bulk`

Bulk assign multiple items.

- **Body**: `{ assignments: [...] }`

#### `PUT /api/v1/assignments/:assignmentId/reassign`

Reassign ownership with reason.

- **Body**: `{ newAssigneeUserId, reason }`

#### `GET /api/v1/assignments/history?companyId=`

Fetch assignment change history.

---

### Recruitment Seasons

#### `GET /api/v1/seasons`

List all recruitment seasons.

#### `POST /api/v1/seasons`

Create new recruitment season.

- **Auth Required**: Yes (tpo_admin only)
- **Body**: `{ name, seasonType: "intern"|"placement", academicYear, startDate?, endDate?, isActive? }`

#### `POST /api/v1/companies/:companyId/season-cycles`

Create company cycle for a season.

- **Body**: `{ seasonId, status, notes?, ownerUserId? }`

#### `GET /api/v1/company-season-cycles`

List company-season operational rows (Kanban/dashboard).

- **Query Params**: `seasonId`, `status`, `assigneeId`, `companyId`, `page`, `limit`

#### `PUT /api/v1/company-season-cycles/:cycleId/status`

Transition cycle status with audit trail.

- **Body**: `{ status: "not_contacted"|"contacted"|"positive"|"accepted"|"rejected", note? }`

#### `GET /api/v1/company-season-cycles/:cycleId/status-history`

Get status transition history.

---

### Email Templates

#### `GET /api/v1/mail/templates`

List email templates.

- **Query Params**: `status` (draft, approved, archived)

#### `POST /api/v1/mail/templates`

Create draft template.

- **Auth Required**: Yes (tpo_admin, mailing_team)
- **Body**: `{ name, slug, subject, bodyHtml, bodyText?, variables?, sendPolicy? }`

#### `PUT /api/v1/mail/templates/:templateId`

Edit template (creates new version if approved).

#### `POST /api/v1/mail/templates/:templateId/approve`

Approve draft template.

- **Auth Required**: Yes (tpo_admin only)

---

### Mail Requests

#### `GET /api/v1/mail/requests?status=pending`

List mail requests (pending queue for mailing team).

#### `POST /api/v1/mail/requests`

Create mail request.

- **Body**: `{ companyId?, companySeasonCycleId?, requestType: "template"|"custom", templateId?, customSubject?, customBody?, recipientFilter?, urgency? }`

#### `POST /api/v1/mail/requests/:requestId/approve`

Approve mail request for send.

- **Auth Required**: Yes (tpo_admin, mailing_team)
- **Body**: `{ sendAt? }` (optional scheduled time)

#### `POST /api/v1/mail/requests/:requestId/reject`

Reject mail request with feedback.

- **Body**: `{ reviewNote }`

---

### Drives (Scheduling)

#### `GET /api/v1/drives`

Get drive calendar feed.

- **Query Params**: `from`, `to`, `status`, `seasonId`

#### `POST /api/v1/drives`

Create drive with conflict checks.

- **Auth Required**: Yes (tpo_admin, coordinator)
- **Body**: `{ companyId, companySeasonCycleId, title, stage: "oa"|"interview"|"hr"|"final"|"other", status, venue?, startAt?, endAt?, notes? }`

#### `PUT /api/v1/drives/:driveId`

Update drive details.

#### `POST /api/v1/drives/:driveId/confirm`

Confirm drive and trigger notifications.

---

### Blogs

#### `GET /api/v1/blogs`

Browse approved blogs.

- **Query Params**: `company`, `tag`, `page`, `limit`

#### `POST /api/v1/blogs`

Submit blog draft.

- **Auth Required**: Yes (student, tpo_admin, coordinator)
- **Body**: `{ companyId, title, body, tags?, isAiAssisted? }`

#### `GET /api/v1/admin/blogs/moderation?status=pending`

Get moderation queue.

- **Auth Required**: Yes (tpo_admin, coordinator)

#### `POST /api/v1/admin/blogs/:blogId/approve`

Approve blog.

#### `POST /api/v1/admin/blogs/:blogId/reject`

Reject blog with note.

- **Body**: `{ moderationNote }`

---

### Notifications

#### `GET /api/v1/notifications`

Get user notification feed.

- **Query Params**: `unreadOnly=true`

#### `POST /api/v1/notifications/mark-read`

Mark notifications as read.

- **Body**: `{ notificationIds: [uuid] }`

---

### Wishlist

#### `POST /api/v1/wishlist/toggle`

Follow/unfollow company.

- **Auth Required**: Yes (student only)
- **Body**: `{ companyId }`

---

## Role-Based Access Control

### Roles:

- **tpo_admin**: Full system access
- **coordinator**: Company/contact management, assignments, drive management
- **student_representative**: Limited company/contact updates
- **mailing_team**: Template and mail request management
- **student**: Blog submission, company following, read-only access
- **tech_support**: System configuration (not business operations)

## Audit Logging

All critical write operations automatically create audit log entries with:

- Actor ID
- Action type
- Target type and ID
- Metadata
- IP address and user agent

View audit logs in the `audit_logs` table.

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Next Steps

1. **Implement Authentication**: Replace placeholder auth with NextAuth.js
2. **Add Validation**: Enhance Zod schemas for stricter validation
3. **Rate Limiting**: Add rate limiting middleware
4. **Email Integration**: Connect mail request APIs to email provider (SendGrid, AWS SES)
5. **Notification System**: Implement real-time notifications
6. **File Uploads**: Add file upload endpoints for attachments
7. **Export APIs**: Implement CSV/Excel export endpoints
8. **Search**: Enhance search with full-text search or Algolia
9. **Testing**: Write integration tests for all endpoints
10. **API Documentation**: Generate OpenAPI/Swagger documentation

## Development

To test the APIs:

```bash
# Start development server
npm run dev

# Test an endpoint (example)
curl http://localhost:3000/api/v1/companies \
  -H "x-user-id: your-user-id"
```

## Production Considerations

Before deploying to production:

1. Enable strict TypeScript mode
2. Add comprehensive error handling
3. Implement request validation middleware
4. Set up monitoring and logging
5. Add API versioning strategy
6. Implement caching where appropriate
7. Set up CORS policies
8. Add security headers
9. Implement rate limiting
10. Set up database connection pooling
