"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  Mail,
  Linkedin,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Users,
  ChevronRight,
  Tag,
  CalendarDays,
  MessageSquare,
  CheckCircle2,
  PhoneCall,
  AlertTriangle,
  Star,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

// ─── Mock data for a single company ───────────────────────────────────────────
const MOCK_COMPANY = {
  id: "c1",
  name: "Google India",
  industry: "IT",
  website: "google.com",
  priority: "high",
  status: "accepted",
  notes:
    "Top partner company. Has hired consistently over the past 3 years. Focus on SWE and PM roles.",
  createdAt: "2025-06-01",
};

const MOCK_CONTACTS = [
  {
    id: "ct1",
    name: "Neha Joshi",
    designation: "Senior HR Business Partner",
    email: "neha.joshi@google.com",
    phone: "+91 98200 00001",
    linkedin: "linkedin.com/in/nehajoshi",
    preferredMethod: "email",
    notes: "Primary contact for placement queries.",
    lastContacted: "2026-02-16",
  },
  {
    id: "ct2",
    name: "Arvind Kapoor",
    designation: "Campus Recruitment Lead",
    email: "arvind.kapoor@google.com",
    phone: "+91 98200 00002",
    linkedin: "linkedin.com/in/arvindkapoor",
    preferredMethod: "phone",
    notes: "Handles all scheduling and logistics.",
    lastContacted: "2026-02-10",
  },
  {
    id: "ct3",
    name: "Sandra D'souza",
    designation: "Talent Acquisition Manager",
    email: "sandra.dsouza@google.com",
    phone: "+91 98200 00003",
    linkedin: "linkedin.com/in/sandradsouza",
    preferredMethod: "linkedin",
    notes: "Good for escalations.",
    lastContacted: "2026-01-30",
  },
];

const MOCK_STATUS_HISTORY = [
  {
    id: "h1",
    status: "accepted",
    note: "JD received. OA scheduled for March 5.",
    changedBy: "Ananya Mehta",
    changedAt: "2026-02-18",
  },
  {
    id: "h2",
    status: "positive",
    note: "Positive interest confirmed over call.",
    changedBy: "Ananya Mehta",
    changedAt: "2026-02-10",
  },
  {
    id: "h3",
    status: "contacted",
    note: "Initial email sent with placement brochure.",
    changedBy: "Ananya Mehta",
    changedAt: "2026-01-25",
  },
  {
    id: "h4",
    status: "not_contacted",
    note: "Company added to season cycle.",
    changedBy: "System",
    changedAt: "2025-12-01",
  },
];

const MOCK_ASSIGNMENTS = [
  {
    id: "a1",
    assignee: "Ananya Mehta",
    type: "coordinator",
    itemType: "company",
    assignedAt: "2025-12-01",
    notes: "Lead coordinator.",
  },
];

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: (typeof MOCK_CONTACTS)[0];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
            {contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{contact.name}</p>
            <p className="text-xs text-slate-500">{contact.designation}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-indigo-600"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <a
          href={`mailto:${contact.email}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 group"
        >
          <Mail
            size={14}
            className="text-slate-400 group-hover:text-indigo-500 shrink-0"
          />
          <span className="truncate">{contact.email}</span>
        </a>
        <a
          href={`tel:${contact.phone}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 group"
        >
          <Phone
            size={14}
            className="text-slate-400 group-hover:text-indigo-500 shrink-0"
          />
          <span>{contact.phone}</span>
        </a>
        <a
          href={`https://${contact.linkedin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 group"
        >
          <Linkedin
            size={14}
            className="text-slate-400 group-hover:text-blue-500 shrink-0"
          />
          <span className="truncate">{contact.linkedin}</span>
          <ExternalLink
            size={11}
            className="text-slate-300 group-hover:text-blue-400 shrink-0"
          />
        </a>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={11} />
          <span>
            Last contacted:{" "}
            {new Date(contact.lastContacted).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <Badge
          size="sm"
          variant={
            contact.preferredMethod === "email"
              ? "info"
              : contact.preferredMethod === "phone"
                ? "success"
                : "purple"
          }
        >
          {contact.preferredMethod}
        </Badge>
      </div>

      {contact.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          {contact.notes}
        </p>
      )}
    </div>
  );
}

function ContactModal({
  isOpen,
  onClose,
  contact,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: (typeof MOCK_CONTACTS)[0] | null;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? "Edit Contact" : "Add Contact"}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            {contact ? "Save Changes" : "Add Contact"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              defaultValue={contact?.name}
              className="input-base"
              placeholder="e.g. Neha Joshi"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Designation
            </label>
            <input
              defaultValue={contact?.designation}
              className="input-base"
              placeholder="e.g. HR Business Partner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              defaultValue={contact?.email}
              className="input-base"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              defaultValue={contact?.phone}
              className="input-base"
              placeholder="+91 98xxx xxxxx"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              LinkedIn URL
            </label>
            <input
              defaultValue={contact?.linkedin}
              className="input-base"
              placeholder="linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preferred Contact Method
            </label>
            <select
              defaultValue={contact?.preferredMethod}
              className="input-base"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            className="input-base"
            defaultValue={contact?.notes}
            placeholder="Any notes about this contact..."
          />
        </div>
      </div>
    </Modal>
  );
}

export default function CompanyDetailPage({
  params,
}: {
  params: { companyId: string };
}) {
  const [tab, setTab] = useState<"contacts" | "history" | "assignments">(
    "contacts",
  );
  const [contactModal, setContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<
    (typeof MOCK_CONTACTS)[0] | null
  >(null);
  const [deleteContactModal, setDeleteContactModal] = useState(false);
  const [editCompanyModal, setEditCompanyModal] = useState(false);

  const TABS = [
    {
      key: "contacts" as const,
      label: "Contacts",
      count: MOCK_CONTACTS.length,
    },
    {
      key: "history" as const,
      label: "Status History",
      count: MOCK_STATUS_HISTORY.length,
    },
    {
      key: "assignments" as const,
      label: "Coordinators",
      count: MOCK_ASSIGNMENTS.length,
    },
  ];

  const ICON_MAP: Record<string, React.ElementType> = {
    accepted: CheckCircle2,
    positive: Star,
    contacted: PhoneCall,
    not_contacted: AlertTriangle,
    rejected: AlertTriangle,
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/companies"
          className="hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Companies
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{MOCK_COMPANY.name}</span>
      </div>

      {/* Company Header Card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
            {MOCK_COMPANY.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">
                {MOCK_COMPANY.name}
              </h2>
              <StatusBadge status={MOCK_COMPANY.status} />
              <Badge
                variant={
                  MOCK_COMPANY.priority === "high"
                    ? "danger"
                    : MOCK_COMPANY.priority === "medium"
                      ? "warning"
                      : "gray"
                }
                size="sm"
              >
                {MOCK_COMPANY.priority.charAt(0).toUpperCase() +
                  MOCK_COMPANY.priority.slice(1)}{" "}
                Priority
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Tag size={13} />
                <span>{MOCK_COMPANY.industry}</span>
              </div>
              {MOCK_COMPANY.website && (
                <a
                  href={`https://${MOCK_COMPANY.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                >
                  <Globe size={13} />
                  {MOCK_COMPANY.website}
                  <ExternalLink size={11} />
                </a>
              )}
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays size={13} />
                <span>
                  Added{" "}
                  {new Date(MOCK_COMPANY.createdAt).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </span>
              </div>
            </div>

            {MOCK_COMPANY.notes && (
              <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                {MOCK_COMPANY.notes}
              </p>
            )}
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEditCompanyModal(true)}
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                ${
                  tab === t.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                }`}
            >
              {t.label}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                ${tab === t.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Contacts Tab */}
        {tab === "contacts" && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                HR & Recruitment Contacts
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedContact(null);
                  setContactModal(true);
                }}
              >
                <Plus size={14} />
                Add Contact
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {MOCK_CONTACTS.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onEdit={() => {
                    setSelectedContact(c);
                    setContactModal(true);
                  }}
                  onDelete={() => {
                    setSelectedContact(c);
                    setDeleteContactModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Status History Tab */}
        {tab === "history" && (
          <div className="p-4 sm:p-5">
            <div className="space-y-0">
              {MOCK_STATUS_HISTORY.map((h, idx) => {
                const Icon = ICON_MAP[h.status] ?? Clock;
                const isLast = idx === MOCK_STATUS_HISTORY.length - 1;
                return (
                  <div key={h.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${idx === 0 ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}
                      >
                        <Icon
                          size={14}
                          className={
                            idx === 0 ? "text-indigo-500" : "text-slate-400"
                          }
                        />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                      )}
                    </div>

                    <div
                      className={`${isLast ? "pb-0" : "pb-5"} flex-1 min-w-0`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={h.status} size="sm" />
                        <span className="text-xs text-slate-400">
                          {new Date(h.changedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {h.note && (
                        <p className="text-sm text-slate-600 mt-1">
                          <MessageSquare
                            size={12}
                            className="inline mr-1 text-slate-400"
                          />
                          {h.note}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        by {h.changedBy}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {tab === "assignments" && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Assigned Coordinators
              </p>
            </div>
            <div className="space-y-3">
              {MOCK_ASSIGNMENTS.map((a) => (
                <div key={a.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                    {a.assignee
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{a.assignee}</p>
                    <p className="text-xs text-slate-500">
                      Assigned since{" "}
                      {new Date(a.assignedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {a.notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{a.notes}</p>
                    )}
                  </div>
                  <Badge variant="purple">{a.type}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ContactModal
        isOpen={contactModal}
        onClose={() => setContactModal(false)}
        contact={selectedContact}
      />
      <Modal
        isOpen={deleteContactModal}
        onClose={() => setDeleteContactModal(false)}
        title="Remove Contact"
        size="sm"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteContactModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setDeleteContactModal(false)}
            >
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Remove <strong>{selectedContact?.name}</strong> from{" "}
          <strong>{MOCK_COMPANY.name}</strong>? This will delete their contact
          record.
        </p>
      </Modal>
      <Modal
        isOpen={editCompanyModal}
        onClose={() => setEditCompanyModal(false)}
        title="Edit Company"
        size="lg"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setEditCompanyModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditCompanyModal(false)}
            >
              Save Changes
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name
            </label>
            <input defaultValue={MOCK_COMPANY.name} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Industry
            </label>
            <input
              defaultValue={MOCK_COMPANY.industry}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select defaultValue={MOCK_COMPANY.priority} className="input-base">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Website
            </label>
            <input defaultValue={MOCK_COMPANY.website} className="input-base" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="input-base"
              defaultValue={MOCK_COMPANY.notes}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
