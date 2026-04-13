import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { db } from "@/lib/db";

function formatDate(value: Date | null) {
  if (!value) return "Not set";
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ActiveSeasonsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "tpo_admin") {
    redirect("/unauthorized");
  }

  const activeSeasons = await db.recruitmentSeason.findMany({
    where: { isActive: true },
    orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      seasonType: true,
      academicYear: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
  });

  return (
    <div className="px-4 pb-8 pt-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Active Seasons</h1>
        <p className="text-sm text-slate-600">
          {activeSeasons.length} active season{activeSeasons.length === 1 ? "" : "s"}
        </p>
      </div>

      {activeSeasons.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No active seasons found.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeSeasons.map((season) => (
            <div key={season.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{season.name}</p>
              <p className="text-xs text-slate-600">
                {season.seasonType} • {season.academicYear}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Start: {formatDate(season.startDate)}
              </p>
              <p className="text-xs text-slate-500">End: {formatDate(season.endDate)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
