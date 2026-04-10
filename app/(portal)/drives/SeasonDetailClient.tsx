"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronRight, Mail, Phone, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/ui/SearchBar";
import StatusBadge from "@/components/ui/StatusBadge";
import DrivesLoadingView from "./DrivesLoadingView";

type CycleStatus = "not_contacted" | "contacted" | "positive" | "accepted" | "rejected";
type CompanyFilter = "accepted" | "rejected" | "applied" | "all";
type ApiResponse<T> = { data?: T; error?: { message?: string } };
type SeasonSummary = {
  season: { id: string; name: string; seasonType: "intern" | "placement"; academicYear: string };
  companiesInSeason: number;
  placementSummary: {
    offers: number;
    studentsPlaced: number;
    avgPackage: number;
    medianPackage: number;
    minPackage: number;
    maxPackage: number;
  };
  branchStats: Array<{ branch: string; offers: number; averagePackage: number }>;
  packageBands: Array<{ label: string; count: number }>;
  topHiringCompanies: Array<{ companyId: string; companyName: string; offers: number }>;
};
type CompanyRow = {
  companyId: string;
  companyName: string;
  industry: string | null;
  seasonStatus: CycleStatus;
  drives: { total: number; confirmed: number; completed: number };
  lastActivityAt: string | null;
  contactsCount: number;
  conflictFlagged: boolean;
};
type CompanyDetail = {
  company: { id: string; name: string; industry: string | null; website: string | null };
  cycle: { status: CycleStatus; lastContactedAt: string | null; nextFollowUpAt: string | null; updatedAt: string };
  recentDrives: Array<{ id: string; title: string; status: string; startAt: string | null }>;
  contacts: Array<{ name: string; role: string; email: string; phone: string }>;
  placementSummary: { studentsPlaced: number; avgPackage: number; medianPackage: number; maxPackage: number };
};

async function requestJson<T>(url: string) {
  const response = await fetch(url, { credentials: "include" });
  const text = await response.text();
  let body: ApiResponse<T> = {};
  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T>;
    } catch {}
  }
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed");
  return body;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatMoney(value: number, label: "stipend" | "package") {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return label === "stipend" ? `${value.toFixed(2)} stipend` : `${value.toFixed(2)} LPA`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function SeasonDetailClient({ seasonId }: { seasonId: string }) {
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("accepted");
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [detailKey, setDetailKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      requestJson<SeasonSummary>(`/api/v1/drives/stats/season/${seasonId}/summary`),
      requestJson<CompanyRow[]>(`/api/v1/drives/stats/season/${seasonId}/companies?page=1&limit=500`),
    ])
      .then(([summaryRes, companiesRes]) => {
        if (!active) return;
        setSummary(summaryRes.data ?? null);
        setCompanies(companiesRes.data ?? []);
        setSummaryLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        setSummaryLoaded(true);
        setError(err instanceof Error ? err.message : "Unable to load season");
      });
    return () => {
      active = false;
    };
  }, [seasonId]);

  const visibleCompanies = useMemo(() => {
    const search = companySearch.trim().toLowerCase();
    return companies.filter((company) => {
      const applied = company.seasonStatus === "not_contacted" || company.seasonStatus === "contacted" || company.seasonStatus === "positive";
      const matchesStatus =
        companyFilter === "all" ||
        (companyFilter === "accepted" && company.seasonStatus === "accepted") ||
        (companyFilter === "rejected" && company.seasonStatus === "rejected") ||
        (companyFilter === "applied" && applied);
      const matchesSearch = !search || [company.companyName, company.industry ?? ""].join(" ").toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [companies, companyFilter, companySearch]);

  const effectiveSelectedCompanyId = useMemo(() => {
    if (!visibleCompanies.length) return "";
    if (visibleCompanies.some((company) => company.companyId === selectedCompanyId)) return selectedCompanyId;
    return visibleCompanies[0].companyId;
  }, [selectedCompanyId, visibleCompanies]);

  useEffect(() => {
    if (!effectiveSelectedCompanyId) return;
    let active = true;
    void requestJson<CompanyDetail>(`/api/v1/drives/stats/season/${seasonId}/company/${effectiveSelectedCompanyId}`)
      .then((res) => {
        if (!active) return;
        setCompanyDetail(res.data ?? null);
        setDetailKey(effectiveSelectedCompanyId);
      })
      .catch(() => {
        if (!active) return;
        setCompanyDetail(null);
        setDetailKey(effectiveSelectedCompanyId);
      });
    return () => {
      active = false;
    };
  }, [effectiveSelectedCompanyId, seasonId]);

  const detailLoading = Boolean(effectiveSelectedCompanyId) && detailKey !== effectiveSelectedCompanyId;

  if (!summaryLoaded) {
    return <DrivesLoadingView compact />;
  }

  if (!summary) {
    return <EmptyState icon={Building2} title="Season not found" description={error || "Unable to load this season."} />;
  }

  const compLabel = summary.season.seasonType === "intern" ? "Avg Stipend" : "Avg Package";
  const moneyMode = summary.season.seasonType === "intern" ? "stipend" : "package";
  const maxBranchOffers = Math.max(...(summary.branchStats.map((item) => item.offers) ?? [1]), 1);
  const maxBandCount = Math.max(...(summary.packageBands.map((item) => item.count) ?? [1]), 1);

  return (
    <div className="space-y-6 px-4 pb-6 pt-6 xl:h-full xl:overflow-y-auto hide-scrollbar">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/drives" className="hover:text-slate-900">
                Drives
              </Link>
              <ChevronRight size={14} />
              <span className="text-slate-900">{summary.season.name}</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">{summary.season.name}</h1>
            <p className="text-sm text-slate-600">
              {summary.season.academicYear} {" | "} {summary.season.seasonType === "intern" ? "Intern" : "Placement"}
            </p>
          </div>
          <Badge variant="gray" size="sm">
            {summary.companiesInSeason} companies
          </Badge>
        </div>
      </section>

      {error ? <EmptyState icon={Building2} title="Unable to load season detail" description={error} /> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students Placed" value={summary.placementSummary.studentsPlaced} />
          <StatCard label={compLabel} value={formatMoney(summary.placementSummary.avgPackage, moneyMode)} />
          <StatCard label="Median" value={formatMoney(summary.placementSummary.medianPackage, moneyMode)} />
          <StatCard label="Highest" value={formatMoney(summary.placementSummary.maxPackage, moneyMode)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Branch-wise stats</h3>
            <div className="mt-4 space-y-4">
              {summary.branchStats.length === 0 ? (
                <p className="text-sm text-slate-500">No branch stats available yet.</p>
              ) : (
                summary.branchStats.slice(0, 6).map((item) => (
                  <div key={item.branch} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{item.branch}</p>
                      <p className="text-xs text-slate-500">
                        {item.offers} offers {" | "} avg {formatMoney(item.averagePackage, moneyMode)}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.max(10, (item.offers / maxBranchOffers) * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Offers vs Compensation</h3>
            <div className="mt-4 space-y-4">
              {summary.packageBands.length === 0 ? (
                <p className="text-sm text-slate-500">No offer bands available yet.</p>
              ) : (
                summary.packageBands.map((band) => (
                  <div key={band.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{band.label}</p>
                      <p className="text-xs text-slate-500">{band.count} offers</p>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(8, (band.count / maxBandCount) * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Offers" value={summary.placementSummary.offers} />
          <StatCard label="Companies Visited" value={summary.companiesInSeason} />
          <StatCard label="Most Hiring Company" value={summary.topHiringCompanies[0]?.companyName ?? "-"} sub={summary.topHiringCompanies[0] ? `${summary.topHiringCompanies[0].offers} offers` : undefined} />
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Companies</h3>
          </div>
          <div className="w-full max-w-sm">
            <SearchBar value={companySearch} onChange={setCompanySearch} placeholder="Search company or industry" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["accepted", "rejected", "applied", "all"] as CompanyFilter[]).map((filter) => {
            const active = companyFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setCompanyFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${active ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {filter[0].toUpperCase() + filter.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-3">
            {visibleCompanies.length === 0 ? (
              <EmptyState icon={Building2} title="No companies in this filter" description="Try changing the company filter or search." />
            ) : (
              visibleCompanies.map((company) => {
                const active = company.companyId === effectiveSelectedCompanyId;
                return (
                  <button
                    key={company.companyId}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.companyId)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${active ? "border-[#93C5FD] bg-[#F8FBFF] shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold">{company.companyName}</h4>
                        <p className="mt-1 text-sm text-slate-500">{company.industry || "General"}</p>
                      </div>
                      <StatusBadge status={company.seasonStatus} size="sm" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className={`rounded-2xl p-3 ${active ? "bg-white" : "bg-slate-50"}`}>
                        <p className="text-[11px] text-slate-500">Contacts</p>
                        <p className="mt-1 text-lg font-semibold">{company.contactsCount}</p>
                      </div>
                      <div className={`rounded-2xl p-3 ${active ? "bg-white" : "bg-slate-50"}`}>
                        <p className="text-[11px] text-slate-500">Drives</p>
                        <p className="mt-1 text-lg font-semibold">{company.drives.total}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
            {detailLoading ? (
              <div className="space-y-4">
                <div className="shimmer h-6 w-56 rounded-full" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="shimmer h-28 rounded-2xl" />
                  <div className="shimmer h-28 rounded-2xl" />
                </div>
                <div className="shimmer h-44 rounded-3xl" />
              </div>
            ) : companyDetail ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold text-slate-900">{companyDetail.company.name}</h3>
                    <StatusBadge status={companyDetail.cycle.status} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {companyDetail.company.industry || "General"} {" | "} Updated {formatDate(companyDetail.cycle.updatedAt)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Basic Info</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>Status: {companyDetail.cycle.status}</p>
                      <p>JD: Not available in current records</p>
                      <p>Eligibility: Not available in current records</p>
                      <p>Last contacted: {formatDate(companyDetail.cycle.lastContactedAt)}</p>
                      <p>Next follow-up: {formatDate(companyDetail.cycle.nextFollowUpAt)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Details</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
                      <div>
                        <p className="text-slate-500">Offers</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{companyDetail.placementSummary.studentsPlaced}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Highest</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(companyDetail.placementSummary.maxPackage, moneyMode)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{compLabel}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(companyDetail.placementSummary.avgPackage, moneyMode)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Median</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(companyDetail.placementSummary.medianPackage, moneyMode)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visit Dates</p>
                    <div className="mt-3 space-y-2">
                      {companyDetail.recentDrives.length > 0 ? (
                        companyDetail.recentDrives.map((drive) => (
                          <div key={drive.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-slate-800">{drive.title}</p>
                              <StatusBadge status={drive.status} size="sm" />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(drive.startAt)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No visit dates recorded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">HR Contacts</p>
                    <div className="mt-3 space-y-3">
                      {companyDetail.contacts.length > 0 ? (
                        companyDetail.contacts.map((contact) => (
                          <div key={`${contact.name}-${contact.email}-${contact.phone}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="font-medium text-slate-900">{contact.name}</p>
                            <p className="text-xs text-slate-500">{contact.role}</p>
                            <div className="mt-2 space-y-1 text-sm text-slate-700">
                              <p className="flex items-center gap-2">
                                <Mail size={13} />
                                {contact.email || "No email"}
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone size={13} />
                                {contact.phone || "No phone"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No HR contacts mapped yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState icon={Users} title="Select a company" description="Pick a company from the season list to view detailed information." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
