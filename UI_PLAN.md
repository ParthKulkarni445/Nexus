# 🧩 Nexus — TPO Side UI Plans

---

## 1️⃣ Companies Page

### Purpose

Central master database view of all companies.

### View

* List of all companies in database (Master DB)
* Minimal info in table:

  * Company Name
  * Status
  * Assigned To
  * Last Updated

### Options

* ➕ Add Company
* ✏️ Update Company
* 🗑 Delete Company

  * All destructive actions must generate **audit logs**

### Company Detail Page (on click)

Clicking a company shows:

* Company full details
* Contacts (HR, LinkedIn, phone, email)
* Last contact date
* Status history
* Assigned coordinators

### Contact Management (inside company view)

* Add Contact
* Edit Contact
* Update LinkedIn
* Update phone/email
* Remove contact

### Export Option

* Download Excel sheet of:

  * All companies
  * Filtered list
  * Contacts

---

## 2️⃣ Outreach Page (Main Workground)

### Purpose

Operational workspace for coordinators.

### View

* List of companies assigned to coordinators for calling
* Marked according to current season
* Filter options:

  * Status
  * Assigned to
  * Season
  * Contacted / Not contacted

### Visibility Rules

* Each coordinator sees:

  * Their assigned companies first
  * Then others’ companies

---

### For Assigned Companies (Coordinator View)

Show:

* Company Name
* Contact Name
* Phone Number
* LinkedIn
* 📞 Call Button
* ✉️ Mail Button (add to mailing queue)

---

### For Other Companies

Show:

* Company Name
* Assigned To (Coordinator name)

---

### Mail Button Behavior

Clicking Mail button:

* Sends company to mailing queue
* Choose:

  * Template Invite
  * Custom Mail

---

## 3️⃣ Mailing Page (Visible to Mailing Team Only)

### Purpose

Approval and dispatch center for emails.

### View

List of pending mails:

a) Invite (Template Based)
b) Custom Mails (with content preview)

---

### Features

* Preview rendered email
* Approve
* Reject
* Edit before approval
* Bulk approve (template-based only)
* Custom mails must be manually reviewed

### Filters

* Company
* Coordinator
* Type (Invite / Custom)
* Status (Pending / Approved / Sent)

---

## 4️⃣ Assignments Page (Visible to Student Representatives)

### Purpose

Manage company assignment to coordinators.

---

### View

* List of all companies
* Toggle between:

  * Assigned
  * Not Assigned

---

### Assigned Companies

* Sorted by:

  * Coordinator
  * Status
  * Season

---

### Unassigned Companies

* Option to assign to coordinators
* Bulk assignment option


### Metrics Display

* Total companies
* Total assigned companies
* Unassigned companies
* Coordinator-wise distribution

  * How many companies per coordinator

### Visuals

* Pie chart: Assigned vs Unassigned
* Bar chart: Coordinator-wise load

---
