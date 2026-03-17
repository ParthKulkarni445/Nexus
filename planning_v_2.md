# Nexus — Planning v2 (Updated with Blog System, AI Moderation & Drive History)

---

# 1. Overview

Nexus is designed as a **centralized placement management and preparation platform**.

This version includes:

- Blog workflow (multi-role support)
- Flexible content design (no strict formats)
- AI-assisted moderation using small LLMs
- Drive History (placement intelligence dashboard)

Goal:

- High student participation  
- Good content quality  
- Data-driven insights  
- Scalable system design  

---

# 2. Blog System Design

## 2.1 Content Philosophy

- Blogs are **free-form** (no strict format)
- Students are guided but not restricted
- Uses tags + moderation instead of rigid structure

---

## 2.2 Blog Sources

### Student Blogs
- Personal interview experiences
- Require moderation

### TPO Blogs
- Verified content
- Can be directly published

---

## 2.3 Workflow

### Student Flow

```
Submit Blog → Auto Checks → Moderation → Publish
```

### TPO Flow

```
Create Blog → Direct Publish
```

---

## 2.4 Moderation Logic

| Role | Moderation |
|------|------------|
| Student | Required |
| TPO | Optional |

---

## 2.5 Display Logic

- TPO Verified blogs shown first
- Student blogs shown after

Each blog shows:
- Company
- Tags
- Date
- Source type

---

# 3. Blog Input Design

## Required Fields
- Title
- Content
- Company

## Optional Fields
- Tags
- AI-assisted flag

## Guidance (Non-blocking)

```
You can include:
• Interview rounds
• Questions asked
• Preparation tips
```

---

# 4. AI-Assisted Moderation

## 4.1 Purpose

Use small LLMs (~800M params) to assist moderation.

---

## 4.2 Pipeline

```
Blog Submitted
      ↓
Rule Checks
      ↓
LLM Moderation
      ↓
Flags + Score
      ↓
Admin Review
```

---

## 4.3 LLM Responsibilities

- Detect PII (emails, phone numbers)
- Check content quality
- Detect unsafe content
- Suggest improvements

---

## 4.4 Output Format

```json
{
  "pii_detected": false,
  "quality_score": 0.75,
  "flags": ["low_detail"],
  "suggestions": ["Add more details"]
}
```

---

## 4.5 Integration

```
POST /governance/checks/blog
```

LLM runs inside this endpoint.

---

# 5. Drive History Tab

## 5.1 Purpose

The Drive History tab provides **placement intelligence** based on past data.

It helps answer:

- What companies have visited before?
- How many students were selected?
- What packages were offered?

---

## 5.2 Core Concept

```
Company → Year → Stats
```

---

## 5.3 Features

### Company Overview

- List of companies
- Shows:
  - Total years participated
  - Last visited year
  - Avg package
  - Total students hired

---

### Company Detail View

#### Year-wise Stats

Example:

```
Amazon

2024:
- Students selected: 25
- Avg package: 18 LPA

2023:
- Students selected: 18
- Avg package: 16 LPA
```

---

### Trends & Insights

- Hiring trend
- Package trend

---

### Contact History

- HR contacts
- Emails / LinkedIn
- Last contacted date

---

### Past Drives (Light)

- Date
- Stage
- Status

---

### Linked Blogs

- Show related interview experiences

---

## 5.4 Schema Mapping

Uses existing tables:

- companies
- company_yearly_stats
- company_contacts
- drives
- blogs

---

## 5.5 APIs

Existing:

```
GET /companies/:companyId/stats
GET /companies/:companyId/experiences
```

New:

```
GET /companies/:companyId/history
GET /companies/history-summary
```

---

## 5.6 UI Flow

```
Drive History → Company List → Company Detail
```

---

## 5.7 MVP Scope

- Company list
- Year-wise stats
- Contacts
- Blogs

---

# 6. MVP Scope (Overall)

Initial implementation includes:

- Blog system (student + TPO)
- AI moderation (basic)
- Drive history (stats + insights)

---

# 7. Key Design Decisions

- No strict blog format
- TPO blogs for cold start
- AI used as assistant
- Drive history focuses on insights, not raw data

---

# 8. Summary

Nexus combines:

```
Content + Intelligence + Automation
```

to create a scalable placement platform.

