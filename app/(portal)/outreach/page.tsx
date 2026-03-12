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
import SearchBar from "@/components/ui/SearchBar";

// --- Types & Mock Data --------------------------------------------------------
const MY_ID = "coordinator_ananya";
const CURRENT_USER_NAME = "Ananya Mehta";

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
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
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
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
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
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
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
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
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
    assignedTo: "Ananya Mehta",
    assignedId: MY_ID,
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
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
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
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
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

function OutreachCard({ entry }: { entry: OutreachEntry }) {
  const [showMailModal, setShowMailModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  return (
    <>
      <div className="card p-4 space-y-3 hover:shadow-sm transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] font-semibold text-sm shrink-0">
              {entry.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/companies/${entry.companyId}`}
                className="font-semibold text-slate-900 hover:text-[#2563EB] transition-colors text-sm truncate block"
              >
                {entry.companyName}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge size="sm" variant="gray">
                  {entry.industry}
                </Badge>
                <Badge size="sm" variant="danger">
                  {entry.season}
                </Badge>
              </div>
            </div>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Contact info */}
        <div className="bg-slate-100 rounded-lg p-3 space-y-2 border border-slate-300">
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
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#2563EB] group"
            >
              <Phone
                size={12}
                className="text-slate-400 group-hover:text-[#2563EB] shrink-0"
              />
              <span className="truncate">{entry.contact.phone}</span>
            </a>
            <a
              href={`mailto:${entry.contact.email}`}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#2563EB] group"
            >
              <Mail
                size={12}
                className="text-slate-400 group-hover:text-[#2563EB] shrink-0"
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
              <span className="flex items-center gap-1 text-[#2563EB]">
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
              className="btn btn-primary btn-sm gap-1"
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const myEntries = useMemo(
    () => MOCK_OUTREACH.filter((e) => e.assignedId === MY_ID),
    [],
  );

  const filtered = useMemo(() => {
    let data = myEntries;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.companyName.toLowerCase().includes(q) ||
          e.industry.toLowerCase().includes(q) ||
          e.contact.name.toLowerCase().includes(q),
      );
    }
    if (statusFilter.length > 0)
      data = data.filter((e) => statusFilter.includes(e.status));
    if (seasonFilter.length > 0)
      data = data.filter((e) => seasonFilter.includes(e.season));
    return data;
  }, [search, statusFilter, seasonFilter, myEntries]);

  const followUpsDue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myEntries.filter((e) => {
      if (!e.nextFollowUp) return false;
      const followUpDate = new Date(e.nextFollowUp);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate <= today;
    }).length;
  }, [myEntries]);

  const stats = useMemo(
    () => ({
      assigned: myEntries.length,
      contacted: myEntries.filter((e) => e.lastContacted).length,
      pending: myEntries.filter((e) => e.status === "not_contacted").length,
      followUpsDue,
    }),
    [myEntries, followUpsDue],
  );

  const activeFilterCount = statusFilter.length + seasonFilter.length;

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 pl-4 pr-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0  pt-10 ">
        <div
          className="card relative overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
          style={{
            // background: "#2563EB",
            background: "#FFFFFF",
            borderColor: "#DBEAFE",
          }}
        >
          {/* <div className="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-[#2563EB]/12 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-8 w-36 h-36 rounded-full bg-[#BFDBFE]/30 blur-2xl" /> */}

          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">
              Personal Outreach Desk
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hello {CURRENT_USER_NAME}, check the tasks lined up for you.
            </h1>
            <p className="mt-1.5 text-sm font-bold text-[#2563EB]">
              This page shows your assigned companies for calls, mails, and follow-ups.
            </p>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Queue Size",
                  value: stats.assigned,
                  icon: Building2,
                },
                {
                  title: "Contacted",
                  value: stats.contacted,
                  icon: PhoneCall,
                },
                {
                  title: "Pending",
                  value: stats.pending,
                  icon: Clock,
                },
                {
                  title: "Follow-ups Due",
                  value: stats.followUpsDue,
                  icon: CheckCircle2,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-white uppercase tracking-wide">
                        {item.title}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-black leading-none">
                        {item.value}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#DBEAFE] flex items-center justify-center shrink-0">
                      <item.icon size={20} color="#2563EB" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-visible flex flex-col">
        <div className="px-4 py-3 border-b border-(--card-border) space-y-3">
          <div className="flex items-center gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by company, industry, or contact..."
              className="flex-1 min-w-0"
            />
            <button
              className={`btn btn-secondary btn-sm gap-1 shrink-0 ${
                showFilters
                  ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                  : ""
              }`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2 pt-1 pb-0.5 w-full">
              <FilterSelect
                multiple
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="flex-1 min-w-0"
              />
              <FilterSelect
                multiple
                value={seasonFilter}
                onChange={setSeasonFilter}
                options={SEASON_OPTIONS}
                placeholder="Season"
                className="flex-1 min-w-0"
              />
              {activeFilterCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 shrink-0"
                  onClick={() => {
                    setStatusFilter([]);
                    setSeasonFilter([]);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Task List</h3>
          </div>

          {myEntries.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies assigned yet"
              description="Once assignments are made to you, they will appear here for outreach actions."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="No companies match these filters"
              description="Try clearing filters to see your complete outreach queue."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((entry) => (
                <OutreachCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
