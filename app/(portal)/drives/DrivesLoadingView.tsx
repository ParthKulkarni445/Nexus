type DrivesLoadingViewProps = {
  compact?: boolean;
};

function OverviewSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="shimmer h-3 w-28 rounded-full" />
            <div className="shimmer h-10 w-full max-w-2xl rounded-2xl" />
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
            <div className="shimmer h-20 rounded-[22px]" />
            <div className="shimmer h-20 rounded-[22px]" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="shimmer h-3 w-20 rounded-full" />
              <div className="mt-3 shimmer h-9 w-24 rounded-2xl" />
              <div className="mt-2 shimmer h-4 w-32 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompareSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="shimmer h-5 w-36 rounded-full" />
          <div className="mt-4 shimmer h-56 w-full rounded-2xl" />
        </div>
      ))}
    </section>
  );
}

function SeasonsSkeleton() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="shimmer h-8 w-28 rounded-full" />
        <div className="shimmer h-7 w-24 rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="shimmer h-3 w-24 rounded-full" />
                <div className="shimmer h-8 w-40 rounded-2xl" />
              </div>
              <div className="shimmer h-7 w-20 rounded-full" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="shimmer h-[80px] rounded-2xl" />
              <div className="shimmer h-[80px] rounded-2xl" />
              <div className="shimmer h-[80px] rounded-2xl" />
            </div>
            <div className="mt-4 shimmer h-5 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailHeaderSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div className="shimmer h-4 w-40 rounded-full" />
        <div className="shimmer h-8 w-56 rounded-2xl" />
        <div className="shimmer h-4 w-32 rounded-full" />
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="shimmer h-3 w-24 rounded-full" />
            <div className="mt-3 shimmer h-8 w-20 rounded-full" />
            <div className="mt-2 shimmer h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="shimmer h-72 rounded-[26px]" />
        <div className="shimmer h-72 rounded-[26px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-28 rounded-[24px]" />
        ))}
      </div>
    </section>
  );
}

function CompanySectionSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="shimmer h-8 w-28 rounded-full" />
        <div className="shimmer h-11 w-full rounded-2xl lg:max-w-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="shimmer h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="shimmer h-5 w-40 rounded-full" />
                  <div className="shimmer h-4 w-24 rounded-full" />
                </div>
                <div className="shimmer h-6 w-20 rounded-full" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="shimmer h-[72px] rounded-2xl" />
                <div className="shimmer h-[72px] rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="shimmer h-8 w-56 rounded-2xl" />
              <div className="shimmer h-4 w-40 rounded-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="shimmer h-32 rounded-2xl" />
              <div className="shimmer h-32 rounded-2xl" />
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="shimmer h-52 rounded-2xl" />
              <div className="shimmer h-52 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DrivesLoadingView({ compact = false }: DrivesLoadingViewProps) {
  return (
    <div className="space-y-6 px-4 pb-6 pt-6 xl:h-full xl:overflow-y-auto hide-scrollbar">
      {compact ? (
        <>
          <DetailHeaderSkeleton />
          <StatsSkeleton />
          <CompanySectionSkeleton />
        </>
      ) : (
        <>
          <OverviewSkeleton />
          <CompareSkeleton />
          <SeasonsSkeleton />
        </>
      )}
    </div>
  );
}
