"use client";

import { useState, useMemo } from "react";
import {
  Mail,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Pencil,
  AlertCircle,
  CheckSquare,
  Square,
  InboxIcon,
  CalendarCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import FilterSelect from "@/components/ui/FilterSelect";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import SearchBar from "@/components/ui/SearchBar";

// ─── Types & Mock Data ────────────────────────────────────────────────────────
type MailStatus = "pending" | "approved" | "sent" | "rejected";
type MailType = "template" | "custom";

interface MailRequest {
  id: string;
  company: string;
  companyId: string;
  coordinator: string;
  type: MailType;
  templateName?: string;
  subject: string;
  previewText: string;
  bodyHtml?: string;
  status: MailStatus;
  urgency: "normal" | "high";
  requestedAt: string;
  sentAt?: string;
  reviewNote?: string;
}

const MOCK_MAILS: MailRequest[] = [
  {
    id: "m1",
    companyId: "c1",
    company: "Google India",
    coordinator: "Ananya Mehta",
    type: "template",
    templateName: "Placement Invitation 2025-26",
    subject: "Invitation for Campus Placement 2025-26 — [College Name]",
    previewText:
      "We would like to invite Google India for our upcoming campus placement season...",
    bodyHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#4F46E5">Campus Placement Invitation 2025-26</h2>
      <p>Dear Hiring Team,</p>
      <p>We are pleased to invite <strong>Google India</strong> to participate in our campus placement drive for the batch of 2026.</p>
      <p>Our students are proficient in multiple technical domains and we are confident in the talent we can offer.</p>
      <p>Please find attached our placement brochure for your reference.</p>
      <p>Regards,<br/><strong>TPO Office</strong></p>
    </div>`,
    status: "pending",
    urgency: "high",
    requestedAt: "2026-02-18",
  },
  {
    id: "m2",
    companyId: "c5",
    company: "Amazon (AWS)",
    coordinator: "Ananya Mehta",
    type: "template",
    templateName: "Placement Invitation 2025-26",
    subject: "Invitation for Campus Placement 2025-26 — [College Name]",
    previewText:
      "We would like to invite Amazon for our upcoming campus placement season...",
    status: "pending",
    urgency: "normal",
    requestedAt: "2026-02-17",
  },
  {
    id: "m3",
    companyId: "c2",
    company: "Microsoft",
    coordinator: "Rohan Sharma",
    type: "template",
    templateName: "Follow-up Template",
    subject: "Follow-up: Campus Placement Opportunity 2025-26",
    previewText:
      "This is a follow-up to our previous invitation regarding campus recruitment...",
    status: "pending",
    urgency: "normal",
    requestedAt: "2026-02-17",
  },
  {
    id: "m4",
    companyId: "c3",
    company: "Goldman Sachs",
    coordinator: "Priya Singh",
    type: "custom",
    subject: "Re: Campus Placement Drive — Custom Proposal",
    previewText:
      "Dear GS Team, Following our call yesterday, I am writing to confirm the details of the campus hiring engagement...",
    bodyHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <p>Dear GS Hiring Team,</p>
      <p>Following our call yesterday, I am writing to confirm the details discussed for the upcoming campus engagement.</p>
      <ul>
        <li>Role: Summer Analyst</li>
        <li>Slots: 5 students</li>
        <li>Drive Date: 15th March 2026</li>
      </ul>
      <p>Please confirm at your earliest convenience.</p>
      <p>Best Regards,<br/>Priya Singh<br/>Placement Coordinator</p>
    </div>`,
    status: "pending",
    urgency: "high",
    requestedAt: "2026-02-16",
  },
  {
    id: "m5",
    companyId: "c10",
    company: "TCS",
    coordinator: "Ananya Mehta",
    type: "template",
    templateName: "Placement Invitation 2025-26",
    subject: "Invitation for Campus Placement 2025-26 — [College Name]",
    previewText:
      "We would like to invite TCS for our upcoming placement season...",
    status: "approved",
    urgency: "normal",
    requestedAt: "2026-02-10",
    sentAt: "2026-02-11",
  },
  {
    id: "m6",
    companyId: "c6",
    company: "McKinsey",
    coordinator: "Vibha Kapoor",
    type: "custom",
    subject: "McKinsey campus recruitment — Revised PPT request",
    previewText:
      "Following our discussion, please find our revised pre-placement talk schedule...",
    status: "rejected",
    urgency: "normal",
    requestedAt: "2026-02-09",
    reviewNote:
      "Subject line needs to be more formal. Please revise and resubmit.",
  },
  {
    id: "m7",
    companyId: "c14",
    company: "Flipkart",
    coordinator: "Vibha Kapoor",
    type: "template",
    templateName: "Placement Invitation 2025-26",
    subject: "Invitation for Campus Placement 2025-26 — [College Name]",
    previewText:
      "We would like to invite Flipkart to our campus placement 2025-26...",
    status: "sent",
    urgency: "normal",
    requestedAt: "2026-02-05",
    sentAt: "2026-02-06",
  },
  {
    id: "m8",
    companyId: "c9",
    company: "PhonePe",
    coordinator: "Priya Singh",
    type: "template",
    templateName: "Internship Invitation 2025",
    subject: "Invitation for Summer Internship 2025 — [College Name]",
    previewText:
      "We would like to invite PhonePe for our summer internship program...",
    status: "pending",
    urgency: "normal",
    requestedAt: "2026-02-15",
  },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "rejected", label: "Rejected" },
];
const TYPE_OPTIONS = [
  { value: "template", label: "Template" },
  { value: "custom", label: "Custom" },
];
const COORDINATOR_OPTIONS = [
  { value: "Ananya Mehta", label: "Ananya Mehta" },
  { value: "Rohan Sharma", label: "Rohan Sharma" },
  { value: "Priya Singh", label: "Priya Singh" },
  { value: "Vibha Kapoor", label: "Vibha Kapoor" },
];

function PreviewModal({
  mail,
  onClose,
}: {
  mail: MailRequest | null;
  onClose: () => void;
}) {
  if (!mail) return null;
  return (
    <Modal
      isOpen={!!mail}
      onClose={onClose}
      title={`Preview — ${mail.company}`}
      size="lg"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-3">
        <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
            Subject
          </p>
          <p className="text-sm font-semibold text-slate-900">{mail.subject}</p>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400 ml-2">Email Preview</span>
          </div>
          {mail.bodyHtml ? (
            <div
              className="p-4"
              dangerouslySetInnerHTML={{ __html: mail.bodyHtml }}
            />
          ) : (
            <div className="p-6 text-sm text-slate-600 leading-relaxed">
              <p className="text-slate-400 italic">{mail.previewText}</p>
              <p className="mt-3 text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Full template preview not available. Content will be rendered
                from the selected template at send time.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({
  mail,
  onClose,
}: {
  mail: MailRequest | null;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={!!mail}
      onClose={onClose}
      title="Reject Mail Request"
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onClose}>
            Reject
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Reject mail request from <strong>{mail?.coordinator}</strong> for{" "}
          <strong>{mail?.company}</strong>?
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Feedback Note *
          </label>
          <textarea
            rows={3}
            className="input-base"
            placeholder="Explain why this is being rejected..."
          />
        </div>
      </div>
    </Modal>
  );
}

function MailRow({
  mail,
  isSelected,
  onSelect,
  onPreview,
  onApprove,
  onReject,
}: {
  mail: MailRequest;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border border-slate-100 rounded-xl overflow-hidden transition-all ${isSelected ? "border-indigo-200 bg-indigo-50/30" : "bg-white"}`}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Checkbox (only for pending templates) */}
        <div className="mt-0.5 shrink-0">
          {mail.status === "pending" && mail.type === "template" ? (
            <button
              onClick={onSelect}
              className="text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isSelected ? (
                <CheckSquare size={16} className="text-indigo-500" />
              ) : (
                <Square size={16} />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">
                  {mail.company}
                </p>
                <Badge
                  size="sm"
                  variant={mail.type === "template" ? "purple" : "info"}
                >
                  {mail.type === "template" ? (
                    <>
                      <LayoutTemplate size={10} className="inline mr-1" />
                      Template
                    </>
                  ) : (
                    <>
                      <FileText size={10} className="inline mr-1" />
                      Custom
                    </>
                  )}
                </Badge>
                {mail.urgency === "high" && (
                  <Badge size="sm" variant="danger">
                    Urgent
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {mail.subject}
              </p>
            </div>
            <StatusBadge status={mail.status} size="sm" />
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
            <span>
              By <strong className="text-slate-700">{mail.coordinator}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(mail.requestedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {mail.templateName && (
              <span className="flex items-center gap-1 text-indigo-600">
                <LayoutTemplate size={11} />
                {mail.templateName}
              </span>
            )}
          </div>

          {mail.reviewNote && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>
                <strong>Rejection note:</strong> {mail.reviewNote}
              </span>
            </div>
          )}

          {expanded && (
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
              {mail.bodyHtml ? (
                <div
                  className="p-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: mail.bodyHtml }}
                />
              ) : (
                <div className="p-4 text-sm text-slate-500 italic">
                  {mail.previewText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          <button
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-indigo-600"
            onClick={() => setExpanded((v) => !v)}
            title="Preview"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-indigo-600"
            onClick={onPreview}
            title="Full preview"
          >
            <Eye size={15} />
          </button>

          {mail.status === "pending" && (
            <>
              {mail.type === "custom" && (
                <button
                  className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-amber-600"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                className="btn btn-success btn-sm gap-1 hidden sm:flex"
                onClick={onApprove}
              >
                <CheckCircle2 size={13} />
                Approve
              </button>
              <button
                className="btn btn-danger btn-sm gap-1 hidden sm:flex"
                onClick={onReject}
              >
                <XCircle size={13} />
                Reject
              </button>
              {/* Mobile compact */}
              <button
                className="sm:hidden btn btn-success btn-sm btn-icon"
                onClick={onApprove}
              >
                <CheckCircle2 size={14} />
              </button>
              <button
                className="sm:hidden btn btn-danger btn-sm btn-icon"
                onClick={onReject}
              >
                <XCircle size={14} />
              </button>
            </>
          )}

          {mail.status === "approved" && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> Approved
            </span>
          )}
          {mail.status === "sent" && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <Send size={12} /> Sent
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MailingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMail, setPreviewMail] = useState<MailRequest | null>(null);
  const [rejectMail, setRejectMail] = useState<MailRequest | null>(null);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  const filtered = useMemo(() => {
    let data = MOCK_MAILS;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          m.company.toLowerCase().includes(q) ||
          m.coordinator.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q),
      );
    }
    if (statusFilter) data = data.filter((m) => m.status === statusFilter);
    if (typeFilter) data = data.filter((m) => m.type === typeFilter);
    if (coordinatorFilter)
      data = data.filter((m) => m.coordinator === coordinatorFilter);
    return data;
  }, [search, statusFilter, typeFilter, coordinatorFilter]);

  const pendingTemplates = filtered.filter(
    (m) => m.status === "pending" && m.type === "template",
  );

  const stats = useMemo(
    () => ({
      pending: MOCK_MAILS.filter((m) => m.status === "pending").length,
      approved: MOCK_MAILS.filter((m) => m.status === "approved").length,
      sent: MOCK_MAILS.filter((m) => m.status === "sent").length,
      custom: MOCK_MAILS.filter(
        (m) => m.type === "custom" && m.status === "pending",
      ).length,
    }),
    [],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllTemplates = () => {
    if (selectedIds.size === pendingTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingTemplates.map((m) => m.id)));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={InboxIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Awaiting review"
        />
        <StatCard
          title="Custom Mails"
          value={stats.custom}
          icon={FileText}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          subtitle="Manual review required"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="Ready to send"
        />
        <StatCard
          title="Sent This Cycle"
          value={stats.sent}
          icon={Send}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Dispatched"
        />
      </div>

      {/* Main card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search company, coordinator..."
              className="flex-1"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                className={`btn btn-secondary btn-sm ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter size={14} />
                Filter
              </button>
              {selectedIds.size > 0 && (
                <button
                  className="btn btn-success btn-sm gap-1"
                  onClick={() => setBulkApproveOpen(true)}
                >
                  <CheckCircle2 size={14} />
                  Approve Selected ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status quick tabs */}
            {["", "pending", "approved", "sent", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                {s === "pending" && (
                  <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] rounded-full px-1.5 py-0.5 font-semibold">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={TYPE_OPTIONS}
                placeholder="All Types"
                className="w-36"
              />
              <FilterSelect
                value={coordinatorFilter}
                onChange={setCoordinatorFilter}
                options={COORDINATOR_OPTIONS}
                placeholder="All Coordinators"
                className="w-44"
              />
            </div>
          )}
        </div>

        {/* Bulk select header for pending templates */}
        {statusFilter === "pending" &&
          pendingTemplates.length > 0 &&
          !typeFilter && (
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3 text-sm">
              <button
                onClick={selectAllTemplates}
                className="flex items-center gap-2 text-indigo-700 font-medium hover:text-indigo-900 transition-colors"
              >
                {selectedIds.size === pendingTemplates.length ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} className="text-slate-400" />
                )}
                <span>
                  {selectedIds.size === pendingTemplates.length
                    ? "Deselect all"
                    : `Select all templates (${pendingTemplates.length})`}
                </span>
              </button>
              {selectedIds.size > 0 && (
                <Badge variant="info" size="sm">
                  {selectedIds.size} selected
                </Badge>
              )}
              <span className="text-xs text-slate-500 ml-auto">
                Bulk approve is available for template mails only
              </span>
            </div>
          )}

        {/* Mail list */}
        <div className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No mail requests"
              description="No mails match the current filters."
            />
          ) : (
            filtered.map((mail) => (
              <MailRow
                key={mail.id}
                mail={mail}
                isSelected={selectedIds.has(mail.id)}
                onSelect={() => toggleSelect(mail.id)}
                onPreview={() => setPreviewMail(mail)}
                onApprove={() => {}}
                onReject={() => setRejectMail(mail)}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <PreviewModal mail={previewMail} onClose={() => setPreviewMail(null)} />
      <RejectModal mail={rejectMail} onClose={() => setRejectMail(null)} />
      <Modal
        isOpen={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        title="Bulk Approve Templates"
        size="sm"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setBulkApproveOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-success"
              onClick={() => {
                setBulkApproveOpen(false);
                setSelectedIds(new Set());
              }}
            >
              <CheckCircle2 size={14} />
              Approve All
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            You are about to approve{" "}
            <strong>
              {selectedIds.size} template mail{selectedIds.size > 1 ? "s" : ""}
            </strong>
            . These will be queued for dispatch immediately.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Schedule send (optional)
            </label>
            <input type="datetime-local" className="input-base" />
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 flex gap-1.5">
            <CalendarCheck size={13} className="shrink-0 mt-0.5" />
            <span>
              Bulk approval is only allowed for template-based mails. Custom
              mails require individual review.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
