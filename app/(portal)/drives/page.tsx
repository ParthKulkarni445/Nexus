"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import SearchBar from "@/components/ui/SearchBar";
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  Mail,
  Phone,
  TrendingUp,
  UserRound,
} from "lucide-react";

type YearStats = {
  year: number;
  selected: number;
  avgPackage: number;
};

type Contact = {
  name: string;
  role: string;
  email: string;
  phone: string;
  lastContacted: string;
};

type PastDrive = {
  date: string;
  stage: string;
  status: "completed" | "in_progress" | "scheduled";
};

type HistoryCompany = {
  id: string;
  name: string;
  industry: string;
  totalYears: number;
  lastVisitedYear: number;
  avgPackage: number;
  totalHired: number;
  stats: YearStats[];
  contacts: Contact[];
  drives: PastDrive[];
  linkedBlogs: Array<{ title: string; date: string; source: "student" | "tpo" }>;
};

const HISTORY_COMPANIES: HistoryCompany[] = [
  {
    id: "c-1",
    name: "Amazon",
    industry: "Product",
    totalYears: 4,
    lastVisitedYear: 2025,
    avgPackage: 18.2,
    totalHired: 72,
    stats: [
      { year: 2025, selected: 25, avgPackage: 19.1 },
      { year: 2024, selected: 22, avgPackage: 18.4 },
      { year: 2023, selected: 15, avgPackage: 17.2 },
      { year: 2022, selected: 10, avgPackage: 16.4 },
    ],
    contacts: [
      {
        name: "Neha Suri",
        role: "Talent Acquisition",
        email: "neha.suri@amazon.com",
        phone: "+91 98XXXXXX31",
        lastContacted: "2026-02-05",
      },
      {
        name: "Rahul Kapoor",
        role: "University Relations",
        email: "rahul.kapoor@amazon.com",
        phone: "+91 98XXXXXX11",
        lastContacted: "2026-01-18",
      },
    ],
    drives: [
      { date: "2025-09-12", stage: "Final Interviews", status: "completed" },
      { date: "2025-09-08", stage: "Online Assessment", status: "completed" },
      { date: "2026-08-20", stage: "Campus Connect", status: "scheduled" },
    ],
    linkedBlogs: [
      { title: "Amazon SDE On-Campus: Round-by-Round Breakdown", date: "2026-02-14", source: "tpo" },
      { title: "Amazon OA Strategy That Worked for Me", date: "2025-11-05", source: "student" },
    ],
  },
  {
    id: "c-2",
    name: "Deloitte",
    industry: "Consulting",
    totalYears: 3,
    lastVisitedYear: 2025,
    avgPackage: 10.6,
    totalHired: 54,
    stats: [
      { year: 2025, selected: 21, avgPackage: 11.2 },
      { year: 2024, selected: 18, avgPackage: 10.4 },
      { year: 2023, selected: 15, avgPackage: 10.1 },
    ],
    contacts: [
      {
        name: "Ishita Rao",
        role: "Campus Recruiting",
        email: "ishita.rao@deloitte.com",
        phone: "+91 97XXXXXX42",
        lastContacted: "2026-02-02",
      },
    ],
    drives: [
      { date: "2025-10-01", stage: "Case Round", status: "completed" },
      { date: "2025-09-25", stage: "Aptitude Test", status: "completed" },
      { date: "2026-09-05", stage: "Pre-placement Talk", status: "scheduled" },
    ],
    linkedBlogs: [
      { title: "How I Prepared for Deloitte Consulting Case Round", date: "2026-02-08", source: "student" },
    ],
  },
  {
    id: "c-3",
    name: "Microsoft",
    industry: "Product",
    totalYears: 2,
    lastVisitedYear: 2024,
    avgPackage: 21.4,
    totalHired: 27,
    stats: [
      { year: 2024, selected: 16, avgPackage: 22.1 },
      { year: 2023, selected: 11, avgPackage: 20.7 },
    ],
    contacts: [
      {
        name: "Sanket Jain",
        role: "University Hiring",
        email: "sanket.jain@microsoft.com",
        phone: "+91 99XXXXXX29",
        lastContacted: "2025-12-28",
      },
    ],
    drives: [
      { date: "2024-10-09", stage: "Panel Interviews", status: "completed" },
      { date: "2024-10-02", stage: "Coding Round", status: "completed" },
      { date: "2026-09-12", stage: "Hiring Sync", status: "in_progress" },
    ],
    linkedBlogs: [
      { title: "Microsoft SWE Internship Interview Experience", date: "2026-01-30", source: "student" },
    ],
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function driveStatusBadge(status: PastDrive["status"]) {
  if (status === "completed") {
    return <Badge variant="success" size="sm">Completed</Badge>;
  }
  if (status === "in_progress") {
    return <Badge variant="warning" size="sm">In Progress</Badge>;
  }
  return <Badge variant="gray" size="sm">Scheduled</Badge>;
}

export default function DrivesPage() {
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(HISTORY_COMPANIES[0].id);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return HISTORY_COMPANIES.filter((company) => {
      if (!term) return true;
      return (
        company.name.toLowerCase().includes(term) ||
        company.industry.toLowerCase().includes(term)
      );
    });
  }, [search]);

  const selectedCompany =
    filteredCompanies.find((company) => company.id === selectedCompanyId) ??
    filteredCompanies[0] ??
    HISTORY_COMPANIES[0];

  const summary = useMemo(() => {
    const totalCompanies = HISTORY_COMPANIES.length;
    const totalHired = HISTORY_COMPANIES.reduce((sum, company) => sum + company.totalHired, 0);
    const avgPackage =
      HISTORY_COMPANIES.reduce((sum, company) => sum + company.avgPackage, 0) /
      Math.max(totalCompanies, 1);
    const maxYear = Math.max(...HISTORY_COMPANIES.map((company) => company.lastVisitedYear));

    return {
      totalCompanies,
      totalHired,
      avgPackage,
      maxYear,
    };
  }, []);

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
              Drive History
            </p>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Placement Intelligence Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Explore company-wise yearly outcomes, package trends, contact history, and linked interview experiences.
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 text-white shadow-sm">
                <p className="text-xs text-blue-100">Companies Tracked</p>
                <p className="mt-1 text-xl font-semibold">{summary.totalCompanies}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">Students Hired</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{summary.totalHired}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">Average Package</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{summary.avgPackage.toFixed(1)} LPA</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">Last Visit Window</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{summary.maxYear}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search companies by name or industry"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-stretch">
        <section className="card p-4 h-full">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Company Overview</h2>
            <Badge variant="info" size="sm">
              {filteredCompanies.length} results
            </Badge>
          </div>

          <div className="space-y-3">
            {filteredCompanies.map((company) => {
              const selected = selectedCompany.id === company.id;
              return (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
                      : "border-slate-200 bg-white hover:border-[#BFDBFE] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.industry}</p>
                    </div>
                    <Badge variant="gray" size="sm">
                      {company.lastVisitedYear}
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Years</p>
                      <p className="font-semibold text-slate-900">{company.totalYears}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Avg CTC</p>
                      <p className="font-semibold text-slate-900">{company.avgPackage.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Hired</p>
                      <p className="font-semibold text-slate-900">{company.totalHired}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card p-4 h-full">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--card-border) pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{selectedCompany.name}</h2>
              <p className="text-xs text-slate-500">
                Last visited in {selectedCompany.lastVisitedYear} • {selectedCompany.industry}
              </p>
            </div>
            <Badge variant="success" size="sm">
              History Profile
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
            <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BarChart3 size={15} className="text-[#2563EB]" />
                Year-wise Stats
              </h3>
              <div className="space-y-2">
                {selectedCompany.stats.map((row) => (
                  <div
                    key={row.year}
                    className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"
                  >
                    <p className="font-semibold text-slate-900">{row.year}</p>
                    <p className="text-slate-600">{row.selected} selected</p>
                    <p className="text-right font-medium text-[#1D4ED8]">{row.avgPackage.toFixed(1)} LPA</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrendingUp size={15} className="text-[#2563EB]" />
                Trend Snapshot
              </h3>
              <div className="space-y-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Hiring Trend</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedCompany.stats[0].selected >=
                    selectedCompany.stats[selectedCompany.stats.length - 1].selected
                      ? "Upward in recent cycles"
                      : "Fluctuating across cycles"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Package Trend</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedCompany.stats[0].avgPackage >=
                    selectedCompany.stats[selectedCompany.stats.length - 1].avgPackage
                      ? "Average package improving"
                      : "Stable package range"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound size={15} className="text-[#2563EB]" />
                Contact History
              </h3>
              <div className="space-y-2">
                {selectedCompany.contacts.map((contact) => (
                  <div key={contact.email} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                    <p className="text-xs text-slate-500">{contact.role}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {contact.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {contact.phone}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#1D4ED8]">
                      Last contacted: {formatDate(contact.lastContacted)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Briefcase size={15} className="text-[#2563EB]" />
                Past Drives and Linked Blogs
              </h3>

              <div className="space-y-2">
                {selectedCompany.drives.map((drive) => (
                  <div
                    key={`${drive.date}-${drive.stage}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-900">{drive.stage}</p>
                      {driveStatusBadge(drive.status)}
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                      <CalendarClock size={12} /> {formatDate(drive.date)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
                <p className="text-xs font-semibold text-[#1D4ED8]">Related Interview Experiences</p>
                <div className="mt-1 space-y-1">
                  {selectedCompany.linkedBlogs.map((blog) => (
                    <div key={blog.title} className="flex items-center justify-between gap-2 text-xs">
                      <p className="text-slate-700">{blog.title}</p>
                      <Badge variant={blog.source === "tpo" ? "success" : "warning"} size="sm">
                        {blog.source === "tpo" ? "TPO" : "Student"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
