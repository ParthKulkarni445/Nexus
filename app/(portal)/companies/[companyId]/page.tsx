"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Phone,
  Mail,
  Linkedin,
  Plus,
  Pencil,
  Trash2,
  Clock,
  ChevronRight,
  Tag,
  CalendarDays,
  MessageSquare,
  CheckCircle2,
  PhoneCall,
  AlertTriangle,
  Star,
  ExternalLink,
  Users,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ContactModal, {
  type CompanyContact,
} from "../../../../components/companies/ContactModal";
import EmptyState from "@/components/ui/EmptyState";

type CycleStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";
type CompanyPriority = "high" | "medium" | "low";

type CompanyDetailResponse = {
  company: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    priority: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  contacts: Array<{
    id: string;
    name: string;
    designation: string | null;
    emails: string[] | null;
    phones: string[] | null;
    preferredContactMethod: string | null;
    notes: string | null;
    lastContactedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  assignments: Array<{
    id: string;
    itemType: string;
    assigneeUserId: string;
    assigneeName: string | null;
    assignedAt: string;
    notes: string | null;
  }>;
  recentInteractions: Array<{
    id: string;
    summary: string | null;
    createdAt: string;
  }>;
  latestCycle: {
    id: string;
    status: CycleStatus;
    updatedAt: string;
  } | null;
  statusHistory: Array<{
    id: string;
    toStatus: CycleStatus;
    changeNote: string | null;
    changedBy: string;
    changedAt: string;
  }>;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type UiContact = {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  linkedin: string;
  preferredMethod: "email" | "phone" | "linkedin";
  notes: string;
  lastContacted: string;
};

type UiHistory = {
  id: string;
  status: CycleStatus;
  note: string;
  changedBy: string;
  changedAt: string;
};

type UiAssignment = {
  id: string;
  assignee: string;
  type: string;
  assignedAt: string;
  notes: string;
};

type UiCompany = {
  id: string;
  name: string;
  industry: string;
  website: string;
  priority: CompanyPriority;
  status: CycleStatus;
  notes: string;
  createdAt: string;
};

type CompanyEditForm = {
  name: string;
  industry: string;
  priority: CompanyPriority;
  website: string;
  notes: string;
};

function numberToPriority(value: number | null | undefined): CompanyPriority {
  if ((value ?? 0) >= 3) {
    return "high";
  }
  if ((value ?? 0) >= 2) {
    return "medium";
  }
  return "low";
}

function priorityToNumber(priority: CompanyPriority): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

function extractDomain(website: string | undefined) {
  if (!website) {
    return undefined;
  }

  try {
    return new URL(website).hostname;
  } catch {
    return undefined;
  }
}

function normalizePreferredMethod(
  preferredMethod: string | null,
): "email" | "phone" | "linkedin" {
  if (preferredMethod === "phone" || preferredMethod === "linkedin") {
    return preferredMethod;
  }
  return "email";
}

function extractLinkedin(notes: string | null) {
  if (!notes) {
    return "";
  }
  const match = notes.match(/LinkedIn:\s*(\S+)/i);
  return match?.[1] ?? "";
}

function stripLinkedinLine(notes: string | null) {
  if (!notes) {
    return "";
  }
  return notes
    .split("\n")
    .filter((line) => !line.toLowerCase().startsWith("linkedin:"))
    .join("\n")
    .trim();
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });
  const text = await response.text();
  let body: ApiResponse<T> = {};

  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T>;
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(body.error?.message ?? "Request failed");
  }

  return body;
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: UiContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] font-semibold text-sm shrink-0">
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
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-[#2563EB]"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-blue-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#2563EB] group"
          >
            <Mail
              size={14}
              className="text-slate-400 group-hover:text-[#2563EB] shrink-0"
            />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#2563EB] group"
          >
            <Phone
              size={14}
              className="text-slate-400 group-hover:text-[#2563EB] shrink-0"
            />
            <span>{contact.phone}</span>
          </a>
        )}
        {contact.linkedin && (
          <a
            href={`https://${contact.linkedin.replace(/^https?:\/\//i, "")}`}
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
        )}
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

function DetailPageSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in p-4 lg:p-6 xl:h-full xl:overflow-y-auto">
      <div className="card inline-flex w-fit items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="shimmer h-4 w-24 rounded-full" />
          <div className="shimmer h-4 w-4 rounded-full" />
          <div className="shimmer h-4 w-36 rounded-full" />
        </div>
      </div>

        <div className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="shimmer h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="shimmer h-8 w-56 rounded-full" />
                <div className="shimmer h-8 w-28 rounded-full" />
                <div className="shimmer h-8 w-24 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="shimmer h-5 w-20 rounded-full" />
                <div className="shimmer h-5 w-40 rounded-full" />
                <div className="shimmer h-5 w-28 rounded-full" />
              </div>
              <div className="shimmer h-18 w-full rounded-2xl" />
            </div>
            <div className="shimmer h-9 w-24 rounded-xl" />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex gap-4 border-b border-slate-100 px-5 py-4">
            <div className="shimmer h-5 w-24 rounded-full" />
            <div className="shimmer h-5 w-28 rounded-full" />
            <div className="shimmer h-5 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shimmer h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <div className="shimmer h-4 w-28 rounded-full" />
                      <div className="shimmer h-3 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="shimmer h-7 w-14 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="shimmer h-4 w-40 rounded-full" />
                  <div className="shimmer h-4 w-32 rounded-full" />
                  <div className="shimmer h-4 w-36 rounded-full" />
                </div>
                <div className="shimmer h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params?.companyId;

  const [tab, setTab] = useState<"contacts" | "history" | "assignments">(
    "contacts",
  );
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [company, setCompany] = useState<UiCompany | null>(null);
  const [contacts, setContacts] = useState<UiContact[]>([]);
  const [statusHistory, setStatusHistory] = useState<UiHistory[]>([]);
  const [assignments, setAssignments] = useState<UiAssignment[]>([]);

  const [contactModal, setContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UiContact | null>(
    null,
  );
  const [deleteContactModal, setDeleteContactModal] = useState(false);
  const [editCompanyModal, setEditCompanyModal] = useState(false);

  const [contactMutationError, setContactMutationError] = useState<
    string | null
  >(null);
  const [companyMutationError, setCompanyMutationError] = useState<
    string | null
  >(null);
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const [companyForm, setCompanyForm] = useState<CompanyEditForm>({
    name: "",
    industry: "",
    priority: "medium",
    website: "",
    notes: "",
  });

  const loadCompany = useCallback(async () => {
    if (!companyId) {
      return;
    }

    setLoading(true);
    setPageError(null);

    try {
      const detail = await requestJson<CompanyDetailResponse>(
        `/api/v1/companies/${companyId}`,
      );

      if (!detail.data?.company) {
        throw new Error("Company not found");
      }

      const baseCompany = detail.data.company;
      const status: CycleStatus =
        detail.data.latestCycle?.status ?? "not_contacted";
      const historyRows: UiHistory[] = (detail.data.statusHistory ?? []).map(
        (item) => ({
          id: item.id,
          status: item.toStatus,
          note: item.changeNote ?? "",
          changedBy: item.changedBy ?? "System",
          changedAt: item.changedAt,
        }),
      );

      const mappedContacts: UiContact[] = (detail.data.contacts ?? []).map(
        (contact) => ({
          id: contact.id,
          name: contact.name,
          designation: contact.designation ?? "",
          email: contact.emails?.[0] ?? "",
          phone: contact.phones?.[0] ?? "",
          linkedin: extractLinkedin(contact.notes),
          preferredMethod: normalizePreferredMethod(
            contact.preferredContactMethod,
          ),
          notes: stripLinkedinLine(contact.notes),
          lastContacted:
            contact.lastContactedAt ?? contact.updatedAt ?? contact.createdAt,
        }),
      );

      const mappedAssignments: UiAssignment[] = (
        detail.data.assignments ?? []
      ).map((assignment) => {
        const assigneeName =
          assignment.assigneeName ??
          (assignment.assigneeUserId
            ? `User ${String(assignment.assigneeUserId).slice(0, 8)}`
            : "Unassigned");

        return {
          id: assignment.id,
          assignee: assigneeName,
          type: assignment.itemType || "coordinator",
          assignedAt: assignment.assignedAt,
          notes: assignment.notes ?? "",
        };
      });

      const mappedCompany: UiCompany = {
        id: baseCompany.id,
        name: baseCompany.name,
        industry: baseCompany.industry ?? "Unknown",
        website: baseCompany.website ?? "",
        priority: numberToPriority(baseCompany.priority),
        status,
        notes: baseCompany.notes ?? "",
        createdAt: baseCompany.createdAt,
      };

      setCompany(mappedCompany);
      setCompanyForm({
        name: mappedCompany.name,
        industry: mappedCompany.industry,
        priority: mappedCompany.priority,
        website: mappedCompany.website,
        notes: mappedCompany.notes,
      });
      setContacts(mappedContacts);
      setAssignments(mappedAssignments);
      setStatusHistory(
        historyRows.length > 0
          ? historyRows
          : [
              {
                id: "current-state",
                status: mappedCompany.status,
                note: "Current status",
                changedBy: "System",
                changedAt: baseCompany.updatedAt,
              },
            ],
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load company",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  const TABS = useMemo(
    () => [
      {
        key: "contacts" as const,
        label: "Contacts",
        count: contacts.length,
      },
      {
        key: "history" as const,
        label: "Status History",
        count: statusHistory.length,
      },
      {
        key: "assignments" as const,
        label: "Coordinators",
        count: assignments.length,
      },
    ],
    [contacts.length, statusHistory.length, assignments.length],
  );

  const ICON_MAP: Record<string, React.ElementType> = {
    accepted: CheckCircle2,
    positive: Star,
    contacted: PhoneCall,
    not_contacted: AlertTriangle,
    rejected: AlertTriangle,
  };

  const handleContactSubmit = async (form: CompanyContact) => {
    if (!company) {
      return;
    }

    setContactMutationError(null);
    setSavingContact(true);

    try {
      const notesParts = [form.notes?.trim() ?? ""];
      if (form.linkedin?.trim()) {
        notesParts.push(`LinkedIn: ${form.linkedin.trim()}`);
      }

      const payload = {
        name: (form.name ?? "").trim(),
        designation: form.designation?.trim() || undefined,
        emails: form.email?.trim() ? [form.email.trim()] : undefined,
        phones: form.phone?.trim() ? [form.phone.trim()] : undefined,
        preferredContactMethod: form.preferredMethod || undefined,
        notes: notesParts.filter(Boolean).join("\n") || undefined,
      };

      if (!payload.name) {
        throw new Error("Contact name is required");
      }

      if (selectedContact) {
        await requestJson(`/api/v1/contacts/${selectedContact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(`/api/v1/companies/${company.id}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setContactModal(false);
      setSelectedContact(null);
      await loadCompany();
    } catch (error) {
      setContactMutationError(
        error instanceof Error ? error.message : "Unable to save contact",
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) {
      return;
    }

    setContactMutationError(null);
    setDeletingContact(true);

    try {
      await requestJson(`/api/v1/contacts/${selectedContact.id}`, {
        method: "DELETE",
      });

      setDeleteContactModal(false);
      setSelectedContact(null);
      await loadCompany();
    } catch (error) {
      setContactMutationError(
        error instanceof Error ? error.message : "Unable to remove contact",
      );
    } finally {
      setDeletingContact(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!company) {
      return;
    }

    setCompanyMutationError(null);
    setSavingCompany(true);

    try {
      const website = normalizeWebsite(companyForm.website);

      const payload = {
        name: companyForm.name.trim(),
        slug: slugify(companyForm.name),
        industry: companyForm.industry || undefined,
        website,
        domain: extractDomain(website),
        priority: priorityToNumber(companyForm.priority),
        notes: companyForm.notes.trim() || undefined,
      };

      if (!payload.name) {
        throw new Error("Company name is required");
      }

      await requestJson(`/api/v1/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setEditCompanyModal(false);
      await loadCompany();
    } catch (error) {
      setCompanyMutationError(
        error instanceof Error ? error.message : "Unable to save company",
      );
    } finally {
      setSavingCompany(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (pageError || !company) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load company"
          description={pageError ?? "Company not found"}
        />
        <div className="mt-4">
          <Link href="/companies" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in xl:h-full xl:overflow-y-auto">
      <div className="card inline-flex w-fit items-center gap-2 px-4 py-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Link
            href="/companies"
            className="hover:text-[#2563EB] transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Companies
          </Link>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">{company.name}</span>
        </div>
      </div>

        <div className="card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] font-bold text-xl shrink-0">
              {company.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  {company.name}
                </h2>
                <StatusBadge status={company.status} />
                <Badge
                  variant={
                    company.priority === "high"
                      ? "danger"
                      : company.priority === "medium"
                        ? "warning"
                        : "gray"
                  }
                  size="sm"
                >
                  {company.priority.charAt(0).toUpperCase() +
                    company.priority.slice(1)}{" "}
                  Priority
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Tag size={13} />
                  <span>{company.industry}</span>
                </div>
                {company.website && (
                  <a
                    href={normalizeWebsite(company.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline"
                  >
                    <Globe size={13} />
                    {company.website.replace(/^https?:\/\//i, "")}
                    <ExternalLink size={11} />
                  </a>
                )}
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <CalendarDays size={13} />
                  <span>
                    Added{" "}
                    {new Date(company.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {company.notes && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                  {company.notes}
                </p>
              )}
            </div>

            <div className="flex gap-2 sm:shrink-0">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCompanyMutationError(null);
                  setEditCompanyModal(true);
                }}
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 flex overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                ${
                  tab === item.key
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                }`}
            >
              {item.label}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                ${tab === item.key ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-slate-100 text-slate-500"}`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

          {tab === "contacts" && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  HR & Recruitment Contacts
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setContactMutationError(null);
                    setSelectedContact(null);
                    setContactModal(true);
                  }}
                >
                  <Plus size={14} />
                  Add Contact
                </button>
              </div>

              {contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No contacts yet"
                  description="Add the first recruiter contact for this company"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {contacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onEdit={() => {
                        setContactMutationError(null);
                        setSelectedContact(contact);
                        setContactModal(true);
                      }}
                      onDelete={() => {
                        setContactMutationError(null);
                        setSelectedContact(contact);
                        setDeleteContactModal(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="p-4 sm:p-5">
              {statusHistory.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No status history"
                  description="Status transitions will appear here"
                />
              ) : (
                <div className="space-y-0">
                  {statusHistory.map((history, index) => {
                    const Icon = ICON_MAP[history.status] ?? Clock;
                    const isLast = index === statusHistory.length - 1;
                    return (
                      <div key={history.id} className="flex gap-4">
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${index === 0 ? "border-[#2563EB] bg-[#EFF6FF]" : "border-slate-200 bg-white"}`}
                          >
                            <Icon
                              size={14}
                              className={
                                index === 0 ? "text-[#2563EB]" : "text-slate-400"
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
                            <StatusBadge status={history.status} size="sm" />
                            <span className="text-xs text-slate-400">
                              {new Date(history.changedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          {history.note && (
                            <p className="text-sm text-slate-600 mt-1">
                              <MessageSquare
                                size={12}
                                className="inline mr-1 text-slate-400"
                              />
                              {history.note}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            by {history.changedBy}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "assignments" && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Assigned Coordinators
                </p>
              </div>

              {assignments.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No assignments"
                  description="Coordinator assignments will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="card p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] font-semibold text-sm shrink-0">
                        {assignment.assignee
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">
                          {assignment.assignee}
                        </p>
                        <p className="text-xs text-slate-500">
                          Assigned since{" "}
                          {new Date(assignment.assignedAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                        {assignment.notes && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {assignment.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="purple">{assignment.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      <ContactModal
        isOpen={contactModal}
        onClose={() => {
          setContactModal(false);
          setSelectedContact(null);
          setContactMutationError(null);
        }}
        contact={
          selectedContact
            ? {
                name: selectedContact.name,
                designation: selectedContact.designation,
                email: selectedContact.email,
                phone: selectedContact.phone,
                linkedin: selectedContact.linkedin,
                preferredMethod: selectedContact.preferredMethod,
                notes: selectedContact.notes,
              }
            : null
        }
        onSubmit={handleContactSubmit}
        submitting={savingContact}
        errorMessage={contactMutationError}
      />

      <Modal
        isOpen={deleteContactModal}
        onClose={() => {
          setDeleteContactModal(false);
          setContactMutationError(null);
        }}
        title="Remove Contact"
        size="sm"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteContactModal(false)}
              disabled={deletingContact}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => void handleDeleteContact()}
              disabled={deletingContact}
            >
              Remove
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {contactMutationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {contactMutationError}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Remove <strong>{selectedContact?.name}</strong> from{" "}
            <strong>{company.name}</strong>? This will delete their contact
            record.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={editCompanyModal}
        onClose={() => {
          setEditCompanyModal(false);
          setCompanyMutationError(null);
        }}
        title="Edit Company"
        size="lg"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setEditCompanyModal(false)}
              disabled={savingCompany}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void handleSaveCompany()}
              disabled={savingCompany}
            >
              Save Changes
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {companyMutationError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {companyMutationError}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name
            </label>
            <input
              value={companyForm.name}
              onChange={(event) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Industry
            </label>
            <input
              value={companyForm.industry}
              onChange={(event) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  industry: event.target.value,
                }))
              }
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={companyForm.priority}
              onChange={(event) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  priority: event.target.value as CompanyPriority,
                }))
              }
              className="input-base"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Website
            </label>
            <input
              value={companyForm.website}
              onChange={(event) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  website: event.target.value,
                }))
              }
              className="input-base"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="input-base"
              value={companyForm.notes}
              onChange={(event) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
