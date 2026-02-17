# DB Schema Plan (Nexus)

## Conventions
- DB: PostgreSQL (Supabase)
- Naming: `snake_case`
- IDs: `uuid` primary keys
- Timestamps: `created_at`, `updated_at` (`timestamptz`)
- Soft delete (where needed): `deleted_at`
- All critical writes should create an `audit_logs` row

## Core Enums
- `user_role`: `tpo_admin`, `coordinator`, `student_representative`, `mailing_team`, `student`, `tech_support`
- `season_type`: `intern`, `placement`
- `season_contact_status`: `not_contacted`, `contacted`, `positive`, `accepted`, `rejected`
- `assignment_role`: `primary`, `secondary`
- `assignment_item_type`: `company`, `contact`
- `task_marker`: `open`, `follow_up`, `flagged`, `completed`
- `drive_status`: `tentative`, `confirmed`, `completed`, `cancelled`
- `mail_request_type`: `template`, `custom`
- `mail_request_status`: `pending`, `approved`, `scheduled`, `sent`, `rejected`, `cancelled`
- `template_status`: `draft`, `approved`, `archived`
- `blog_moderation_status`: `pending`, `approved`, `rejected`
- `application_status`: `applied`, `shortlisted`, `interviewed`, `placed`, `rejected`
- `email_direction`: `inbound`, `outbound`

## Objects

### 1) `users`
Primary user profile + auth-linked identity.
- `id`, `email` (unique), `name`
- `role` (`user_role`)
- `auth_provider`, `auth_subject`
- `profile_meta` (`jsonb`) (branch, grad_year, phone, etc.)
- `is_active`
- `created_at`, `updated_at`

### 2) `user_permissions`
Granular overrides over role defaults.
- `id`, `user_id` (fk `users`)
- `permission_key` (e.g., `export_contacts`, `manage_templates`)
- `is_allowed`
- `granted_by` (fk `users`), `granted_at`

### 3) `companies`
Company master object (no season/process status here).
- `id`, `name`, `slug` (unique)
- `domain`, `industry`, `website`
- `priority`, `notes`
- `created_by` (fk `users`)
- `created_at`, `updated_at`

### 4) `recruitment_seasons`
Season master to represent each campaign window.
- `id`
- `name` (e.g., `2026 Summer Internship`, `2026-27 Placements`)
- `season_type` (`season_type`)
- `academic_year` (e.g., `2026-27`)
- `start_date`, `end_date`
- `is_active`
- `created_by` (fk `users`)
- `created_at`, `updated_at`

### 5) `company_season_cycles`
Per-company, per-season operational object where contacting lifecycle is tracked.
- `id`
- `company_id` (fk `companies`)
- `season_id` (fk `recruitment_seasons`)
- `status` (`season_contact_status`)
- `last_contacted_at`
- `owner_user_id` (fk `users`, nullable)
- `next_follow_up_at`
- `notes`
- `created_at`, `updated_at`
- unique (`company_id`, `season_id`)

### 6) `company_contacts`
HR / hiring contacts under each company.
- `id`, `company_id` (fk `companies`)
- `name`, `designation`
- `emails` (`text[]`), `phones` (`text[]`)
- `preferred_contact_method`
- `notes`
- `last_contacted_at`
- `created_at`, `updated_at`

### 7) `company_assignments`
Assign company/contact responsibility to coordinators/reps.
- `id`
- `item_type` (`assignment_item_type`), `item_id` (company/contact id)
- `assignee_user_id` (fk `users`)
- `assigned_by` (fk `users`)
- `assignment_role` (`assignment_role`)
- `notes`
- `is_active`
- `assigned_at`, `updated_at`

### 8) `company_assignment_history`
Reassignment and accountability trail.
- `id`, `assignment_id` (fk `company_assignments`)
- `from_user_id`, `to_user_id` (fk `users`)
- `changed_by` (fk `users`)
- `reason`, `changed_at`

### 9) `company_season_status_history`
Auditable status transitions for each company-season cycle.
- `id`, `company_season_cycle_id` (fk `company_season_cycles`)
- `from_status`, `to_status` (`season_contact_status`)
- `changed_by` (fk `users`)
- `change_note`
- `changed_at`

### 10) `contact_interactions`
Call/email/log timeline for contacts/companies.
- `id`, `company_id` (fk `companies`), `contact_id` (fk `company_contacts`, nullable)
- `company_season_cycle_id` (fk `company_season_cycles`, nullable)
- `interaction_type` (`call`, `email`, `meeting`, `note`)
- `outcome`
- `summary`, `next_follow_up_at`
- `created_by` (fk `users`)
- `created_at`

### 11) `coordinator_task_marks`
Marked items for each coordinator dashboard (flag/follow-up/completed).
- `id`, `user_id` (fk `users`)
- `company_id` (fk `companies`), `contact_id` (fk `company_contacts`, nullable)
- `company_season_cycle_id` (fk `company_season_cycles`, nullable)
- `marker` (`task_marker`)
- `due_at`, `note`
- `updated_at`

### 12) `drives`
OA/interview/visit schedule records.
- `id`, `company_id` (fk `companies`)
- `company_season_cycle_id` (fk `company_season_cycles`)
- `title`, `stage` (`oa`, `interview`, `hr`, `final`, `other`)
- `status` (`drive_status`)
- `venue`
- `start_at`, `end_at`
- `is_conflict_flagged`
- `notes`
- `created_by` (fk `users`)
- `created_at`, `updated_at`

### 13) `drive_participants`
Student registrations and progression.
- `id`, `drive_id` (fk `drives`), `student_id` (fk `users`)
- `status` (`application_status`)
- `score`
- `updated_at`

### 14) `student_company_follows`
Wishlist/followed companies for notifications.
- `id`, `student_id` (fk `users`), `company_id` (fk `companies`)
- `created_at`
- unique (`student_id`, `company_id`)

### 15) `company_yearly_stats`
Company-wise historical placement stats (student view).
- `id`, `company_id` (fk `companies`)
- `year`
- `total_hired`, `avg_ctc_lpa`, `max_ctc_lpa`
- `roles_hired` (`text[]`)
- `source_note`

### 16) `blogs`
Student-submitted interview experiences.
- `id`, `author_id` (fk `users`), `company_id` (fk `companies`)
- `title`, `body`
- `tags` (`text[]`)
- `is_ai_assisted` (boolean)
- `moderation_status` (`blog_moderation_status`)
- `moderation_note`
- `approved_by` (fk `users`, nullable), `approved_at` (nullable)
- `created_at`, `updated_at`

### 17) `email_templates`
Governed mailing templates.
- `id`, `name`, `slug` (unique)
- `subject`, `body_html`, `body_text`
- `variables` (`text[]`)
- `send_policy` (`jsonb`) (rate limits, approval requirement)
- `status` (`template_status`)
- `created_by`, `approved_by` (fk `users`)
- `created_at`, `updated_at`

### 18) `email_template_versions`
Immutable template version history.
- `id`, `template_id` (fk `email_templates`)
- `version`
- `subject`, `body_html`, `body_text`, `variables`
- `created_by` (fk `users`), `created_at`
- unique (`template_id`, `version`)

### 19) `mail_requests`
Coordinator -> Mailing Team request queue.
- `id`, `company_id` (fk `companies`), `requested_by` (fk `users`)
- `company_season_cycle_id` (fk `company_season_cycles`, nullable)
- `request_type` (`mail_request_type`)
- `template_id` (fk `email_templates`, nullable)
- `template_version` (nullable)
- `custom_subject`, `custom_body`
- `recipient_filter` (`jsonb`) (branch/year/eligibility/tags)
- `preview_payload` (`jsonb`)
- `status` (`mail_request_status`)
- `urgency`
- `reviewed_by` (fk `users`, nullable), `review_note`
- `send_at` (nullable), `sent_at` (nullable)
- `created_at`, `updated_at`

### 20) `emails`
Normalized inbound/outbound message store.
- `id`, `direction` (`email_direction`)
- `message_id` (unique)
- `mail_request_id` (fk `mail_requests`, nullable)
- `template_id`, `template_version` (nullable)
- `company_id` (fk `companies`, nullable), `drive_id` (fk `drives`, nullable)
- `company_season_cycle_id` (fk `company_season_cycles`, nullable)
- `from_email`, `to_emails` (`text[]`), `cc_emails` (`text[]`)
- `subject`, `text_body`, `html_body`
- `in_reply_to`, `references` (`text[]`), `thread_id`
- `headers` (`jsonb`), `classification` (`jsonb`)
- `provider_status`, `provider_event_at`
- `created_at`

### 21) `email_attachments`
Attachment metadata for inbound/outbound messages.
- `id`, `email_id` (fk `emails`)
- `file_name`, `mime_type`, `size_bytes`
- `storage_path`
- `created_at`

### 22) `company_domains`
Domain intelligence for inbound mapping.
- `id`, `company_id` (fk `companies`)
- `domain`
- `confidence` (`manual`, `verified`, `learned`)
- `created_by` (fk `users`)
- `created_at`
- unique (`company_id`, `domain`)

### 23) `blocked_domains`
Public/unsafe domains excluded from auto-mapping.
- `domain` (pk)
- `reason`, `created_at`

### 24) `email_suppression_list`
Do-not-send list from bounces/complaints/manual blocks.
- `email` (pk)
- `reason` (`bounce`, `complaint`, `manual`)
- `source_event_id`
- `created_at`

### 25) `notifications`
In-app notification center + push metadata.
- `id`, `user_id` (fk `users`)
- `type`
- `title`, `body`
- `payload` (`jsonb`)
- `is_read`, `read_at`
- `created_at`

### 26) `exports_audit`
Export/download governance log (Excel/CSV).
- `id`, `actor_id` (fk `users`)
- `export_type` (`contacts`, `drives`, `placements`, `mailing`)
- `format` (`csv`, `xlsx`)
- `filters` (`jsonb`)
- `record_count`
- `purpose_note`
- `created_at`

### 27) `ai_generations`
Audit AI-assisted email/blog drafts.
- `id`
- `type` (`email`, `blog`)
- `requested_by` (fk `users`)
- `input` (`jsonb`), `output` (`text`)
- `model`
- `approved` (boolean)
- `approved_by` (fk `users`, nullable), `approved_at` (nullable)
- `created_at`

### 28) `audit_logs`
Global immutable audit trail for sensitive actions.
- `id`, `actor_id` (fk `users`)
- `action`
- `target_type`, `target_id`
- `meta` (`jsonb`)
- `ip_address`, `user_agent`
- `created_at`

## Recommended Indexes (v1)
- `companies(name)`, `companies(industry)`
- `recruitment_seasons(season_type, academic_year, is_active)`
- `company_season_cycles(company_id, season_id)` unique
- `company_season_cycles(season_id, status)`
- `company_contacts(company_id)`
- `company_assignments(assignee_user_id, is_active)`
- `company_season_status_history(company_season_cycle_id, changed_at desc)`
- `contact_interactions(company_id, created_at desc)`
- `drives(company_id, start_at)`, `drives(start_at, end_at)`
- `student_company_follows(student_id, company_id)` unique
- `blogs(company_id, created_at desc)`, `blogs(tags)` gin
- `mail_requests(status, created_at)`, `mail_requests(send_at)`
- `emails(company_id, created_at desc)`, `emails(message_id)` unique
- `notifications(user_id, is_read, created_at desc)`
- `audit_logs(created_at desc)`, `audit_logs(actor_id, created_at desc)`

## Relationship Summary
- `companies` 1:N `company_contacts`, `company_season_cycles`, `drives`, `blogs`, `mail_requests`
- `recruitment_seasons` 1:N `company_season_cycles`
- `company_season_cycles` 1:N `company_season_status_history`, `drives`, `contact_interactions`
- `users` 1:N `company_assignments`, `contact_interactions`, `notifications`, `audit_logs`
- `email_templates` 1:N `email_template_versions`, `mail_requests`
- `mail_requests` 1:N `emails`
- `drives` 1:N `drive_participants`
- `users(student)` N:N `companies` via `student_company_follows`
