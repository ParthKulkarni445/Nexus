"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, GraduationCap, TrendingDown, TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import DrivesLoadingView from "./DrivesLoadingView";

type SeasonType = "intern" | "placement";
type ApiResponse<T> = { data?: T; error?: { message?: string } };
type SeasonCard = {
  id: string;
  name: string;
  seasonType: SeasonType;
  academicYear: string;
  companiesInSeason: number;
  studentsPlaced: number;
  avgCompensation: number;
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

function formatMoney(value: number, mode: SeasonType) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return mode === "intern" ? `${value.toFixed(2)} stipend` : `${value.toFixed(2)}`;
}

function getInsight(current: SeasonCard, previous?: SeasonCard | null) {
  if (!previous) return { text: "First tracked season", up: true };
  const delta = current.studentsPlaced - previous.studentsPlaced;
  return { text: `${delta > 0 ? "+" : ""}${delta} students placed vs previous`, up: delta >= 0 };
}

function CompareChart({
  title,
  data,
  suffix,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  suffix?: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="px-2 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 28, left: 20, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              padding={{ left: 24, right: 24 }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={44}
            />
            <Tooltip
              formatter={(value: number | string | undefined) => [
                `${value ?? "-"}${suffix ? ` ${suffix}` : ""}`,
                title,
              ]}
              contentStyle={{ borderRadius: "12px", border: "1px solid #DBEAFE", fontSize: "12px" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2563EB", stroke: "#DBEAFE", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#1D4ED8", stroke: "#DBEAFE", strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DrivesPage() {
  const [seasonType, setSeasonType] = useState<SeasonType>("placement");
  const [seasons, setSeasons] = useState<SeasonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void requestJson<SeasonCard[]>("/api/v1/drives/stats/seasons")
      .then((res) => {
        if (!active) return;
        setSeasons(res.data ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load seasons");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const seasonsOfType = useMemo(() => seasons.filter((season) => season.seasonType === seasonType), [seasonType, seasons]);
  const compareSeasons = seasonsOfType.slice(0, 3).reverse();

  const compareCompanies = compareSeasons.map((season) => ({
    label: season.academicYear,
    value: season.companiesInSeason,
  }));
  const comparePlaced = compareSeasons.map((season) => ({
    label: season.academicYear,
    value: season.studentsPlaced,
  }));
  const compareComp = compareSeasons.map((season) => ({
    label: season.academicYear,
    value: Number(season.avgCompensation.toFixed(2)),
  }));
  const showCompareCharts = compareSeasons.length > 1;

  if (loading) return <DrivesLoadingView />;

  return (
    <div className="h-full overflow-y-auto px-4 pt-6 hide-scrollbar xl:h-full">
      <div className="space-y-6 pb-0">
      {error ? <EmptyState icon={Building2} title="Unable to load drives page" description={error} /> : null}

      {seasonsOfType.length === 0 ? (
        <EmptyState icon={Users} title="No seasons found" description="No seasons are available in this stream yet." />
      ) : (
        <>
          <section className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f8fbff_48%,#eef5ff_100%)] p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Drives Overview</p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                      Choose a season type to view details
                    </h1>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
                    {[
                      { key: "intern" as const, label: "Intern", icon: GraduationCap },
                      { key: "placement" as const, label: "Placement", icon: Briefcase },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = seasonType === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSeasonType(item.key)}
                          className={`rounded-[22px] border p-4 text-left transition ${
                            active
                              ? "border-[#BFDBFE] bg-white shadow-sm"
                              : "border-slate-200 bg-white/70 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-2xl p-2 ${active ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-slate-100 text-slate-600"}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{item.label}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
            </section>

            {showCompareCharts ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Trend Analysis
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <CompareChart title="Companies Visited" data={compareCompanies} />
                  <CompareChart title="Students Placed" data={comparePlaced} />
                  <CompareChart
                    title={seasonType === "intern" ? "Average Stipend" : "Average Package"}
                    data={compareComp}
                    suffix={seasonType === "intern" ? "" : ""}
                  />
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Seasons
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    Browse by season
                  </h2>
                </div>
                <Badge variant="gray" size="sm">
                  {seasonsOfType.length} seasons
                </Badge>
              </div>

              <div className="grid gap-4">
                {seasonsOfType.map((season, index) => {
                  const previous = seasonsOfType[index + 1] ?? null;
                  const insight = getInsight(season, previous);
                  return (
                    <Link
                      key={season.id}
                      href={`/drives/${season.id}`}
                      className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#fbfdff)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{season.academicYear}</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{season.name}</h3>
                        </div>
                        <Badge variant="info" size="sm">
                          {seasonType}
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Companies</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{season.companiesInSeason}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Placed</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{season.studentsPlaced}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">{seasonType === "intern" ? "Avg Stipend" : "Avg Package"}</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{formatMoney(season.avgCompensation, seasonType)}</p>
                        </div>
                      </div>

                      <div className={`mt-4 flex items-center gap-2 text-sm ${insight.up ? "text-emerald-700" : "text-amber-700"}`}>
                        {insight.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{insight.text}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </section>
        </>
      )}
      </div>
    </div>
  );
}
