# Confirmed Tab Plan

## Route
- New frontend tab/page: `/confirmed`
- File: `app/(portal)/confirmed/page.tsx`

## Purpose
- Manage **accepted companies** after outreach confirmation.
- Provide an operations dashboard for team actions per company.

## Frontend Features Implemented
1. Session (Drive) selector.
2. Show only accepted companies for the selected drive/season (live backend data).
3. Company action buttons:
- Call HR
- Schedule event
- Send mail request to mailing team (for all students)
- Send mail directly to company
4. Telegram templates box:
- Multiple templates supported
- Starter templates + manual authoring text area
- Message data is manually written by humans (no schema-derived stipend/CGPA/location assumptions)
5. Per-company uploads:
- Upload Sheet 1 (CSV/XLS/XLSX)
- Upload Sheet 2 (CSV/XLS/XLSX)
6. Multiple HR/contacts per company:
- Contact dropdown for selecting one HR/contact among many
- Selected contact details shown in action panel

## UX Notes
- Search accepted companies by company/role/location.
- Right-side panel for template selection and preview.
- Active company highlighting and quick action focus.
- Responsive layout for desktop/mobile.

## Integration Status
- Backend is integrated for this tab.
- Data source: `GET /api/v1/confirmed`
- Actions integrated:
	- `POST /api/v1/contacts/[contactId]/quick-action` (Call HR log)
	- `POST /api/v1/schedules` (Schedule event)
	- `POST /api/v1/mail/requests` (mailing team and company mail requests)
	- `POST /api/v1/mail/attachments/upload` (two file uploads per company)
- Telegram templates are loaded from approved templates in backend and used as starter text for manual authoring.

## Next Phase (Optional Enhancements)
1. Dedicated telegram-template domain model (separate from email templates) if product requires it.
2. Persist manual telegram drafts per company user/session.
3. Add explicit backend entity to map the two uploaded sheets to company season cycle.
4. Add delivery-state tracking widgets for created mail requests.
5. Confirmed tab reminder: implement final `submit and compare` CSV logic once user provides comparison rules.
