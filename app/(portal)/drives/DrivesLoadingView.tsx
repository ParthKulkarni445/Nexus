function ToolbarSkeleton() {
  return (
    <div className="card p-4 lg:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="shimmer h-9 w-52 rounded-xl" />
        <div className="shimmer h-8 w-24 rounded-full" />
        <div className="shimmer h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
        <div className="shimmer h-10 rounded-xl xl:col-span-2" />
        <div className="shimmer h-10 rounded-xl" />
        <div className="shimmer h-10 rounded-xl" />
        <div className="shimmer h-10 rounded-xl" />
        <div className="shimmer h-10 rounded-xl" />
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="card p-4 space-y-2">
          <div className="shimmer h-3 w-28 rounded-full" />
          <div className="shimmer h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-4 lg:p-5 space-y-3 min-h-65">
      <div className="shimmer h-4 w-40 rounded-full" />
      <div className="shimmer h-50 w-full rounded-2xl" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-(--card-border) px-4 py-3 flex items-center justify-between gap-3">
        <div className="shimmer h-4 w-44 rounded-full" />
        <div className="shimmer h-8 w-20 rounded-xl" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_0.8fr] items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3"
          >
            <div className="space-y-2">
              <div className="shimmer h-4 w-32 rounded-full" />
              <div className="shimmer h-3 w-20 rounded-full" />
            </div>
            <div className="shimmer h-6 w-24 rounded-full" />
            <div className="shimmer h-4 w-20 rounded-full" />
            <div className="shimmer h-4 w-20 rounded-full" />
            <div className="shimmer h-4 w-24 rounded-full" />
            <div className="shimmer h-8 w-8 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="card p-4 lg:p-5 space-y-4">
      <div className="space-y-2">
        <div className="shimmer h-5 w-40 rounded-full" />
        <div className="shimmer h-4 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-100 p-3">
            <div className="shimmer h-3 w-20 rounded-full" />
            <div className="shimmer h-6 w-14 rounded-full mt-2" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="shimmer h-4 w-32 rounded-full" />
        <div className="shimmer h-16 w-full rounded-xl" />
        <div className="shimmer h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function DrivesLoadingView() {
  return (
    <div className="p-4 lg:p-6 animate-fade-in space-y-5 xl:h-full xl:overflow-y-auto hide-scrollbar">
      <ToolbarSkeleton />
      <KpiSkeleton />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <TableSkeleton />
        <div className="hidden xl:block">
          <DetailSkeleton />
        </div>
      </div>
    </div>
  );
}
