"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import SearchBar from "@/components/ui/SearchBar";
import {
  BarChart3,
  Building2,
  CalendarClock,
  History,
  IndianRupee,
  Mail,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { getDrivesData } from "./actions";

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
  lastContacted: string | null;
};

type PastDrive = {
  date: string | null;
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

type RecruitmentSeason = {
  id: string;
  name: string;
  seasonType: string;
  academicYear: string;
};

function formatDate(value: string | null) {
  if (!value) return "N/A";
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

export default function DrivesClient({
  seasons,
  initialSeasonId,
  initialDrivesData,
}: {
  seasons: RecruitmentSeason[];
  initialSeasonId: string;
  initialDrivesData: HistoryCompany[];
}) {
  const [search, setSearch] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId);
  const [companiesData, setCompaniesData] = useState<HistoryCompany[]>(initialDrivesData);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    initialDrivesData.length > 0 ? initialDrivesData[0].id : null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (selectedSeasonId && selectedSeasonId !== initialSeasonId) {
      startTransition(async () => {
        try {
          const data = await getDrivesData(selectedSeasonId);
          setCompaniesData(data);
          if (data.length > 0) {
            setSelectedCompanyId(data[0].id);
          } else {
            setSelectedCompanyId(null);
          }
        } catch (err) {
          console.error("Error fetching drives data:", err);
        }
      });
    } else if (selectedSeasonId === initialSeasonId) {
      setCompaniesData(initialDrivesData);
      if (initialDrivesData.length > 0) {
        setSelectedCompanyId(initialDrivesData[0].id);
      } else {
        setSelectedCompanyId(null);
      }
    }
  }, [selectedSeasonId, initialSeasonId, initialDrivesData]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return companiesData.filter((company) => {
      if (!term) return true;
      return (
        company.name.toLowerCase().includes(term) ||
        company.industry.toLowerCase().includes(term)
      );
    });
  }, [search, companiesData]);

  const selectedCompany =
    filteredCompanies.find((company) => company.id === selectedCompanyId) ??
    filteredCompanies[0] ??
    null;

  const summary = useMemo(() => {
    const totalCompanies = companiesData.length;
    let totalHired = 0;
    let totalPackage = 0;
    let maxYear = 0;

    companiesData.forEach((company) => {
      totalHired += company.totalHired;
      totalPackage += company.avgPackage;
      if (company.lastVisitedYear > maxYear) {
        maxYear = company.lastVisitedYear;
      }
    });

    const avgPackage = totalCompanies > 0 ? totalPackage / totalCompanies : 0;

    return {
      totalCompanies,
      totalHired,
      avgPackage,
      maxYear: maxYear || new Date().getFullYear(),
    };
  }, [companiesData]);

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                Drive History
              </p>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Placement Intelligence Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Explore company-wise yearly outcomes, contact history, and linked interview experiences based on Season Cycle.
              </p>
            </div>
            
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarClock size={16} className="text-[#2563EB]" />
                Active Season Cycle
              </label>
              <select 
                className="w-full cursor-pointer appearance-none rounded-lg border border-blue-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all hover:border-blue-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                disabled={isPending}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231D4ED8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.2em 1.2em'
                }}
              >
                {seasons.length === 0 ? (
                  <option value="">No Seasons Available</option>
                ) : (
                  seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.academicYear})
                    </option>
                  ))
                )}
              </select>
            </div>

          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 pt-0 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="card p-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search companies by name or industry"
        />
      </div>

      <div className={`grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-stretch transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <section className="card p-4 h-full">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Company Overview</h2>
            <Badge variant="info" size="sm">
              {filteredCompanies.length} results
            </Badge>
          </div>

          <div className="space-y-3">
            {filteredCompanies.length === 0 ? (
               <div className="text-sm text-slate-500 text-center py-6">No companies found for this season.</div>
            ) : (
                filteredCompanies.map((company) => {
                const selected = selectedCompany?.id === company.id;
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
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 flex flex-col items-center">
                        <p className="text-slate-500">Years</p>
                        <p className="font-semibold text-slate-900">{company.totalYears}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 flex flex-col items-center">
                        <p className="text-slate-500">Avg CTC</p>
                        <p className="font-semibold text-slate-900">{company.avgPackage > 0 ? company.avgPackage.toFixed(1) : "N/A"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 flex flex-col items-center">
                        <p className="text-slate-500">Hired</p>
                        <p className="font-semibold text-slate-900">{company.totalHired > 0 ? company.totalHired : "N/A"}</p>
                        </div>
                    </div>
                    </button>
                );
                })
            )}
          </div>
        </section>

        {selectedCompany && (
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
                    {selectedCompany.stats && selectedCompany.stats.length > 0 ? (
                        selectedCompany.stats.map((row) => (
                        <div
                            key={row.year}
                            className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"
                        >
                            <p className="font-semibold text-slate-900">{row.year}</p>
                            <p className="text-slate-600">{row.selected} selected</p>
                            <p className="text-right font-medium text-[#1D4ED8]">{row.avgPackage.toFixed(1)} LPA</p>
                        </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500">No structured stats found in DB.</p>
                    )}
                </div>
                </div>



                <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <UserRound size={15} className="text-[#2563EB]" />
                    Contact History
                </h3>
                <div className="space-y-2">
                    {selectedCompany.contacts.length > 0 ? (
                        selectedCompany.contacts.map((contact, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                            <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                            <p className="text-xs text-slate-500">{contact.role}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                            {contact.email && (
                                <span className="inline-flex items-center gap-1 break-all">
                                    <Mail size={12} className="shrink-0" /> {contact.email}
                                </span>
                            )}
                            {contact.phone && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                    <Phone size={12} className="shrink-0" /> {contact.phone}
                                </span>
                            )}
                            </div>
                            <p className="mt-1 text-xs text-[#1D4ED8]">
                            Last contacted: {formatDate(contact.lastContacted)}
                            </p>
                        </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500">No contacts available.</p>
                    )}
                </div>
                </div>


            </div>
            </section>
        )}
          </div>
        </div>

        {/* Right side stats */}
        <div className="w-full space-y-5 xl:sticky xl:top-4 xl:w-[300px] shrink-0">
          <div className="card overflow-hidden border border-[#DBEAFE]">
            <div className="flex items-center gap-2 border-b border-[#DBEAFE] px-4 py-3 bg-[#F8FAFC]">
              <BarChart3 size={15} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">Season Summary</h3>
            </div>
            
            <div className={`p-4 space-y-3 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'} bg-white`}>
              <div className="group relative overflow-hidden rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-4 py-3 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-500/50 p-1.5 transition-transform group-hover:scale-110">
                    <Building2 size={16} />
                  </span>
                  <p className="text-sm font-medium text-blue-50">Companies</p>
                </div>
                <p className="text-xl font-bold">{summary.totalCompanies}</p>
                <div className="absolute -right-4 -top-4 opacity-10 transition-transform group-hover:rotate-12 group-hover:scale-125">
                  <Building2 size={64} />
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 transition-all hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#DBEAFE] hover:shadow-sm cursor-default flex items-center justify-between">
                <div className="flex items-center gap-2 z-10">
                  <span className="rounded-lg bg-blue-100 p-1.5 text-[#2563EB] transition-transform group-hover:scale-110">
                    <Users size={16} />
                  </span>
                  <p className="text-sm font-medium text-[#1D4ED8]">Hired</p>
                </div>
                <p className="text-xl font-bold text-slate-900 z-10">{summary.totalHired > 0 ? summary.totalHired : "N/A"}</p>
                <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform group-hover:rotate-12 group-hover:scale-125 text-[#2563EB]">
                  <Users size={64} />
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 transition-all hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#DBEAFE] hover:shadow-sm cursor-default flex items-center justify-between">
                <div className="flex items-center gap-2 z-10">
                  <span className="rounded-lg bg-blue-100 p-1.5 text-[#2563EB] transition-transform group-hover:scale-110">
                    <IndianRupee size={16} />
                  </span>
                  <p className="text-sm font-medium text-[#1D4ED8]">Avg Package</p>
                </div>
                <p className="text-xl font-bold text-slate-900 z-10">{summary.avgPackage > 0 ? `${summary.avgPackage.toFixed(1)} LPA` : "N/A"}</p>
                <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform group-hover:rotate-12 group-hover:scale-125 text-[#2563EB]">
                  <IndianRupee size={64} />
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 transition-all hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#DBEAFE] hover:shadow-sm cursor-default flex items-center justify-between">
                <div className="flex items-center gap-2 z-10">
                  <span className="rounded-lg bg-blue-100 p-1.5 text-[#2563EB] transition-transform group-hover:scale-110">
                    <History size={16} />
                  </span>
                  <p className="text-sm font-medium text-[#1D4ED8]">Last Visit</p>
                </div>
                <p className="text-xl font-bold text-slate-900 z-10">{summary.totalCompanies > 0 ? summary.maxYear : "N/A"}</p>
                <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform group-hover:-rotate-12 group-hover:scale-125 text-[#2563EB]">
                  <History size={64} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
