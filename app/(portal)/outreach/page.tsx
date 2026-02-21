"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Phone,
  Mail,
  Linkedin,
  Filter,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  ExternalLink,
  Send,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import FilterSelect from "@/components/ui/FilterSelect";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";

// ─── Types & Mock Data ────────────────────────────────────────────────────────
const MY_ID = "coordinator_ananya";

const MOCK_OUTREACH = [
  {
    id: "oc1",
    companyId: "c1",
    companyName: "Google India",
    industry: "IT",
    status: "positive",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
    contact: {
      name: "Neha Joshi",
      designation: "HR BP",
      phone: "+91 98200 00001",
      email: "neha.joshi@google.com",
      linkedin: "linkedin.com/in/nehajoshi",
    },
    lastContacted: "2026-02-16",
    nextFollowUp: "2026-02-22",
  },
  {
    id: "oc2",
    companyId: "c5",
    companyName: "Amazon (AWS)",
    industry: "IT",
    status: "contacted",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
    contact: {
      name: "Rajeev Verma",
      designation: "Campus Recruiter",
      phone: "+91 98200 00010",
      email: "rajeev@amazon.com",
      linkedin: "linkedin.com/in/rajeevverma",
    },
    lastContacted: "2026-02-14",
    nextFollowUp: "2026-02-21",
  },
  {
    id: "oc3",
    companyId: "c10",
    companyName: "TCS",
    industry: "IT",
    status: "accepted",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
    contact: {
      name: "Shalini Iyer",
      designation: "Talent Partner",
      phone: "+91 98200 00020",
      email: "shalini@tcs.com",
      linkedin: "linkedin.com/in/shaliniiyer",
    },
    lastContacted: "2026-02-09",
    nextFollowUp: null,
  },
  {
    id: "oc4",
    companyId: "c2",
    companyName: "Microsoft",
    industry: "IT",
    status: "positive",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Rohan Sharma",
    assignedId: "coordinator_rohan",
    contact: {
      name: "Ajay Mishra",
      designation: "HR Manager",
      phone: "+91 98200 00030",
      email: "ajay@microsoft.com",
      linkedin: "linkedin.com/in/ajaymishra",
    },
    lastContacted: "2026-02-17",
    nextFollowUp: null,
  },
  {
    id: "oc5",
    companyId: "c3",
    companyName: "Goldman Sachs",
    industry: "Finance",
    status: "contacted",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Priya Singh",
    assignedId: "coordinator_priya",
    contact: {
      name: "Kavita Rao",
      designation: "Campus Relations",
      phone: "+91 98200 00040",
      email: "kavita.rao@gs.com",
      linkedin: "linkedin.com/in/kavitarao",
    },
    lastContacted: "2026-02-16",
    nextFollowUp: "2026-02-23",
  },
  {
    id: "oc6",
    companyId: "c6",
    companyName: "McKinsey & Company",
    industry: "Consulting",
    status: "positive",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Vibha Kapoor",
    assignedId: "coordinator_vibha",
    contact: {
      name: "Ritu Bose",
      designation: "Office Recruiter",
      phone: "+91 98200 00050",
      email: "ritu@mckinsey.com",
      linkedin: "linkedin.com/in/ritubose",
    },
    lastContacted: "2026-02-13",
    nextFollowUp: null,
  },
  {
    id: "oc7",
    companyId: "c14",
    companyName: "Flipkart",
    industry: "IT",
    status: "not_contacted",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Vibha Kapoor",
    assignedId: "coordinator_vibha",
    contact: {
      name: "Sunita Sharma",
      designation: "Recruiter",
      phone: "+91 98200 00060",
      email: "sunita@flipkart.com",
      linkedin: "linkedin.com/in/sunitasharma",
    },
    lastContacted: null,
    nextFollowUp: null,
  },
  {
    id: "oc8",
    companyId: "c9",
    companyName: "PhonePe",
    industry: "Finance",
    status: "contacted",
    season: "Placement 2025-26",
    seasonType: "placement",
    assignedTo: "Priya Singh",
    assignedId: "coordinator_priya",
    contact: {
      name: "Ashwin Patel",
      designation: "HR Lead",
      phone: "+91 98200 00070",
      email: "ashwin@phonepe.com",
      linkedin: "linkedin.com/in/ashwinpatel",
    },
    lastContacted: "2026-02-10",
    nextFollowUp: "2026-02-24",
  },
];

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];
const COORDINATOR_OPTIONS = [
  { value: "Ananya Mehta", label: "Ananya Mehta" },
  { value: "Rohan Sharma", label: "Rohan Sharma" },
  { value: "Priya Singh", label: "Priya Singh" },
  { value: "Vibha Kapoor", label: "Vibha Kapoor" },
];
const SEASON_OPTIONS = [
  { value: "Placement 2025-26", label: "Placement 2025-26" },
  { value: "Intern 2025", label: "Intern 2025" },
];

type OutreachEntry = (typeof MOCK_OUTREACH)[0];

function MailRequestModal({
  isOpen,
  onClose,
  company,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: string;
}) {
  const [type, setType] = useState<"template" | "custom">("template");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Send Mail — ${company}`}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            <Send size={14} />
            Send to Queue
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Mail Type
          </label>
          <div className="flex gap-3">
            {(["template", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  type === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "template" ? "Template Invite" : "Custom Mail"}
              </button>
            ))}
          </div>
        </div>

        {type === "template" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Template
            </label>
            <select className="input-base">
              <option>Placement Invitation 2025-26</option>
              <option>Internship Invitation 2025</option>
              <option>Follow-up Template</option>
            </select>
          </div>
        )}

        {type === "custom" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject
              </label>
              <input className="input-base" placeholder="Email subject line" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message
              </label>
              <textarea
                rows={5}
                className="input-base"
                placeholder="Write your email content..."
              />
            </div>
          </>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex gap-2 text-xs text-amber-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Mail will be sent to the mailing queue for approval before dispatch.
          </span>
        </div>
      </div>
    </Modal>
  );
}

function QuickLogModal({
  isOpen,
  onClose,
  company,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: string;
}) {
  const [action, setAction] = useState<"call" | "email" | "note">("call");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction — ${company}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Log
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["call", "email", "note"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                action === a
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Summary *
          </label>
          <textarea
            rows={3}
            className="input-base"
            placeholder="What happened during this interaction?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Outcome
          </label>
          <select className="input-base">
            <option value="">-- Select Outcome --</option>
            <option>Interested — will share JD</option>
            <option>Not interested this cycle</option>
            <option>Callback requested</option>
            <option>No answer</option>
            <option>Needs follow-up</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Next Follow-up Date
          </label>
          <input type="date" className="input-base" />
        </div>
      </div>
    </Modal>
  );
}

function OutreachCard({
  entry,
  isMyCompany,
}: {
  entry: OutreachEntry;
  isMyCompany: boolean;
}) {
  const [showMailModal, setShowMailModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  if (!isMyCompany) {
    return (
      <div className="card p-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0">
          {entry.companyName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/companies/${entry.companyId}`}
            className="font-medium text-slate-900 hover:text-indigo-600 transition-colors text-sm truncate block"
          >
            {entry.companyName}
          </Link>
          <p className="text-xs text-slate-400">{entry.industry}</p>
        </div>
        <StatusBadge status={entry.status} size="sm" />
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold">
            {entry.assignedTo
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span className="hidden sm:inline">{entry.assignedTo}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card p-4 space-y-3 hover:shadow-sm transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
              {entry.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/companies/${entry.companyId}`}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-sm truncate block"
              >
                {entry.companyName}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge size="sm" variant="gray">
                  {entry.industry}
                </Badge>
                <Badge size="sm" variant="purple">
                  {entry.season}
                </Badge>
              </div>
            </div>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Contact info */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {entry.contact.name}
              </p>
              <p className="text-xs text-slate-500">
                {entry.contact.designation}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={`tel:${entry.contact.phone}`}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 group"
            >
              <Phone
                size={12}
                className="text-slate-400 group-hover:text-indigo-500 shrink-0"
              />
              <span className="truncate">{entry.contact.phone}</span>
            </a>
            <a
              href={`mailto:${entry.contact.email}`}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 group"
            >
              <Mail
                size={12}
                className="text-slate-400 group-hover:text-indigo-500 shrink-0"
              />
              <span className="truncate">{entry.contact.email}</span>
            </a>
            <a
              href={`https://${entry.contact.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 group"
            >
              <Linkedin size={12} className="shrink-0" />
              <span className="truncate">LinkedIn</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {entry.lastContacted ? (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Last:{" "}
                {new Date(entry.lastContacted).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle size={11} />
                Never contacted
              </span>
            )}
            {entry.nextFollowUp && (
              <span className="flex items-center gap-1 text-indigo-600">
                <CheckCircle2 size={11} />
                Follow-up:{" "}
                {new Date(entry.nextFollowUp).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogModal(true)}
              className="btn btn-secondary btn-sm gap-1"
            >
              <MessageSquare size={13} />
              Log
            </button>
            <a
              href={`tel:${entry.contact.phone}`}
              className="btn btn-success btn-sm gap-1"
            >
              <Phone size={13} />
              Call
            </a>
            <button
              onClick={() => setShowMailModal(true)}
              className="btn btn-primary btn-sm gap-1"
            >
              <Mail size={13} />
              Mail
            </button>
          </div>
        </div>
      </div>

      <MailRequestModal
        isOpen={showMailModal}
        onClose={() => setShowMailModal(false)}
        company={entry.companyName}
      />
      <QuickLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        company={entry.companyName}
      />
    </>
  );
}

export default function OutreachPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "mine" | "others">("all");
  const [showFilters, setShowFilters] = useState(false);

  const myEntries = useMemo(
    () => MOCK_OUTREACH.filter((e) => e.assignedId === MY_ID),
    [],
  );
  const otherEntries = useMemo(
    () => MOCK_OUTREACH.filter((e) => e.assignedId !== MY_ID),
    [],
  );

  const filtered = useMemo(() => {
    let data =
      viewMode === "mine"
        ? myEntries
        : viewMode === "others"
          ? otherEntries
          : MOCK_OUTREACH;
    if (statusFilter) data = data.filter((e) => e.status === statusFilter);
    if (coordinatorFilter)
      data = data.filter((e) => e.assignedTo === coordinatorFilter);
    if (seasonFilter) data = data.filter((e) => e.season === seasonFilter);
    return data;
  }, [
    viewMode,
    statusFilter,
    coordinatorFilter,
    seasonFilter,
    myEntries,
    otherEntries,
  ]);

  const stats = useMemo(
    () => ({
      total: MOCK_OUTREACH.length,
      mine: myEntries.length,
      called: myEntries.filter((e) => e.lastContacted).length,
      pending: myEntries.filter((e) => e.status === "not_contacted").length,
    }),
    [myEntries],
  );

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total This Season"
          value={stats.total}
          icon={Building2}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          subtitle="Companies in cycle"
        />
        <StatCard
          title="My Companies"
          value={stats.mine}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Assigned to me"
        />
        <StatCard
          title="Contacted"
          value={stats.called}
          icon={PhoneCall}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="From my list"
        />
        <StatCard
          title="Pending Outreach"
          value={stats.pending}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Not yet contacted"
        />
      </div>

      {/* Filter bar */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
              {(["all", "mine", "others"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-4 py-2 text-sm font-medium transition-all capitalize ${
                    viewMode === v
                      ? "bg-indigo-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v === "mine"
                    ? "My Companies"
                    : v === "others"
                      ? "Others"
                      : "All"}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <button
              className={`btn btn-secondary btn-sm ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter size={14} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                placeholder="All Statuses"
                className="w-40"
              />
              <FilterSelect
                value={coordinatorFilter}
                onChange={setCoordinatorFilter}
                options={COORDINATOR_OPTIONS}
                placeholder="All Coordinators"
                className="w-44"
              />
              <FilterSelect
                value={seasonFilter}
                onChange={setSeasonFilter}
                options={SEASON_OPTIONS}
                placeholder="All Seasons"
                className="w-48"
              />
              {(statusFilter || coordinatorFilter || seasonFilter) && (
                <button
                  className="btn btn-ghost btn-sm text-red-500"
                  onClick={() => {
                    setStatusFilter("");
                    setCoordinatorFilter("");
                    setSeasonFilter("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* My assigned companies section */}
          {(viewMode === "all" || viewMode === "mine") && (
            <div className="space-y-3">
              {viewMode === "all" && (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    My Assigned Companies
                  </h3>
                  <Badge variant="purple" size="sm">
                    {myEntries.length}
                  </Badge>
                </div>
              )}
              {filtered.filter((e) => e.assignedId === MY_ID).length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No companies assigned"
                  description="Contact your representative to get assigned companies."
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filtered
                    .filter((e) => e.assignedId === MY_ID)
                    .map((entry) => (
                      <OutreachCard
                        key={entry.id}
                        entry={entry}
                        isMyCompany={true}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Other companies section */}
          {(viewMode === "all" || viewMode === "others") && (
            <div className="space-y-3">
              {viewMode === "all" && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Other Companies
                  </h3>
                  <Badge variant="gray" size="sm">
                    {otherEntries.length}
                  </Badge>
                </div>
              )}
              <div className="space-y-2">
                {filtered
                  .filter((e) => e.assignedId !== MY_ID)
                  .map((entry) => (
                    <OutreachCard
                      key={entry.id}
                      entry={entry}
                      isMyCompany={false}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
