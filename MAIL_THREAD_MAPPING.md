# Mail Thread Mapping

## What Changed

We added persistent thread-level company mapping for mailbox mail.

Before this change, every email was mapped to a company independently:

- inbound mail used the sender domain
- outbound mail used recipient domains
- the same Gmail thread could end up split across mapped and unmapped emails

That caused visible inconsistencies:

- the mailbox page grouped all emails in a Gmail thread
- the outreach mail tracker only saw the emails whose `companyId` happened to be set
- users could see `3` messages in mailbox for one thread and only `1` in the tracker

This change makes company mapping stable at the thread level while still using domain matching as the initial signal.

## Why We Chose This Design

We intentionally chose:

- one company can have many threads
- one thread belongs to one company
- domain matching is the seed
- manual override is the correction mechanism
- we do not automatically support one thread mapped to multiple companies

This gives us the simplest model that matches how users think:

- a Gmail thread is one conversation
- a company can have many conversations
- the same conversation should not randomly change company assignment between messages

We did **not** choose automatic many-company mapping because it creates much more ambiguity:

- forwarded chains
- ATS/vendor addresses
- personal email replies
- accidental CCs across organizations

That complexity would make the system harder to trust.

## Data Model

New table:

- `email_thread_mappings`

Fields:

- `thread_id`: Gmail thread id, unique
- `company_id`: mapped company
- `source`: `domain_match`, `mail_request`, or `manual_override`
- `confidence`: qualitative confidence marker
- `last_resolved_at`, `created_at`, `updated_at`

Schema files:

- [prisma/schema.prisma](C:/Users/parth/Desktop/DEP%20Folder/Nexus/prisma/schema.prisma)
- [prisma/migrations/20260405095500_add_email_thread_mappings/migration.sql](C:/Users/parth/Desktop/DEP%20Folder/Nexus/prisma/migrations/20260405095500_add_email_thread_mappings/migration.sql)

## Mapping Rules

### 1. Seed signal: domain matching

Mailbox sync still derives a candidate company from message metadata:

- inbound: sender domain
- outbound: recipient domains

If there is no existing thread mapping and domain matching finds a company, that company becomes the thread mapping.

### 2. Persisted thread mapping wins

If a thread already has a mapping, later synced emails in the same thread inherit that company even if:

- the sender changes to a personal address
- the reply comes from a vendor or alias
- a later message would not match by domain on its own

This is what fixes the “same thread, different company mapping” issue.

### 3. Manual override wins over auto rules

If a human remaps a thread manually, that override becomes the canonical mapping for the thread.

Later syncs keep using it.

## Manual Override

We added a mailbox UI control so someone from the mailing side can correct a thread mapping directly.

Where:

- mailbox thread detail panel in [app/(portal)/mailing/page.tsx](C:/Users/parth/Desktop/DEP%20Folder/Nexus/app/(portal)/mailing/page.tsx)

How it works:

- search company by name/domain
- select company
- save mapping
- all emails in that thread are updated to the selected company
- an audit log is written

API route:

- [app/api/v1/email/threads/[threadId]/company/route.ts](C:/Users/parth/Desktop/DEP%20Folder/Nexus/app/api/v1/email/threads/[threadId]/company/route.ts)

## Where the Logic Lives

Shared helper:

- [lib/mailing/threadMapping.ts](C:/Users/parth/Desktop/DEP%20Folder/Nexus/lib/mailing/threadMapping.ts)

This helper is responsible for:

- storing/upserting thread mappings
- updating all emails in a thread to the mapped company
- normalizing mailbox classification metadata

Mailbox sync:

- [app/api/v1/email/inbox/sync/route.ts](C:/Users/parth/Desktop/DEP%20Folder/Nexus/app/api/v1/email/inbox/sync/route.ts)

What changed there:

- sync checks for existing thread mapping first
- if none exists, it uses domain matching as seed
- if a thread gets mapped, sync propagates that mapping to all emails in the same thread
- if a future domain match disagrees with existing thread mapping, thread mapping still wins and the conflicting candidate is noted in classification metadata

Outbound send path:

- [app/api/v1/mail/requests/[requestId]/approve/route.ts](C:/Users/parth/Desktop/DEP%20Folder/Nexus/app/api/v1/mail/requests/[requestId]/approve/route.ts)

What changed there:

- after sending mail, if we know both `threadId` and `companyId`, we persist a thread mapping immediately with source `mail_request`

Outreach tracker:

- [app/(portal)/outreach/[companyId]/mails/page.tsx](C:/Users/parth/Desktop/DEP%20Folder/Nexus/app/(portal)/outreach/[companyId]/mails/page.tsx)

What changed there:

- once one email in a thread belongs to a company, the tracker expands to show the rest of that thread too

## Classification Behavior

Mailbox emails still keep per-email `classification`, but that metadata now reflects thread-aware decisions.

Examples:

- `bucket: "company"` for mapped mail
- `mappingSource: "domain_match"` or `manual_override`
- optional `conflictingCompanyId` if a fresh domain match disagrees with the current thread mapping

This keeps the decision explainable without letting new messages silently break thread consistency.

## Rollout Steps

### Required

1. Run the Prisma migration.
2. Regenerate Prisma client.
3. Sync mailbox again.

Typical commands:

```powershell
npm run db:migrate
npm run db:generate
```

### Recommended

Backfill old threads so historical mailbox data benefits immediately:

```powershell
npm run db:backfill:email-threads
```

Backfill script:

- [scripts/backfill-email-thread-mappings.ts](C:/Users/parth/Desktop/DEP%20Folder/Nexus/scripts/backfill-email-thread-mappings.ts)

The backfill script:

- scans existing emails that already have both `threadId` and `companyId`
- seeds `email_thread_mappings`
- propagates the company to other emails in those same threads

## What This Fixes

- same Gmail thread showing different company mapping across messages
- outreach mail tracker undercounting messages from an already-mapped thread
- mailbox/operator confusion when personal aliases or vendor addresses appear mid-thread

## What It Does Not Try To Solve

- automatic mapping of one thread to multiple companies
- perfect semantic company detection from arbitrary text
- threads that have no Gmail `threadId`

For those edge cases, manual override remains the safe fallback.

## Why This Is Safer Than Pure Domain Matching

Pure domain matching is brittle because email conversations often drift:

- recruiters reply from personal mail
- ATS tools send on behalf of a company
- consultants or agencies appear in the middle of the thread
- forwarded mail introduces new domains

Thread mapping handles these cases better because it treats the conversation as the unit of truth, not just one message at a time.

## Tradeoff

The main tradeoff is that a wrong thread mapping can propagate to the whole thread.

That is why we added manual override and audit logging instead of trying to over-automate multi-company splitting.

This is a deliberate choice:

- prioritize consistency
- keep corrections simple
- keep reasoning visible

## Summary

The system now works like this:

- domain matching suggests the first company
- thread mapping stores the decision
- later emails inherit the thread decision
- manual override can correct the thread permanently

This keeps mailbox, outreach tracker, and operator expectations aligned around the same real-world object: the email thread.
