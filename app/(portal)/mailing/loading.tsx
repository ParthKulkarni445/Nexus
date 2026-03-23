function SegmentSkeleton() {
  return (
    <div className="flex overflow-x-auto rounded-2xl bg-slate-100 p-1">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="shimmer h-10 w-28 rounded-xl" />
      ))}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]">
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="w-full rounded-2xl border border-[#DBEAFE] bg-white p-4"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="mt-1 shrink-0">
                  <div className="shimmer h-4 w-4 rounded" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <div className="shimmer h-5 w-40 rounded-full" />
                        <div className="shimmer h-5 w-20 rounded-full" />
                        <div className="shimmer h-5 w-16 rounded-full" />
                      </div>
                      <div className="shimmer h-4 w-full rounded-full" />
                      <div className="shimmer h-4 w-10/12 rounded-full" />
                    </div>
                    <div className="shimmer h-6 w-24 rounded-full" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="shimmer h-4 w-24 rounded-full" />
                    <div className="shimmer h-4 w-36 rounded-full" />
                    <div className="shimmer h-4 w-28 rounded-full" />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 xl:w-auto xl:justify-end">
                    <div className="shimmer h-8 w-16 rounded-lg" />
                    <div className="shimmer h-8 w-20 rounded-lg" />
                    <div className="shimmer h-8 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#DBEAFE] bg-white p-5">
        <div className="space-y-3">
          <div className="shimmer h-5 w-40 rounded-full" />
          <div className="shimmer h-4 w-full rounded-full" />
          <div className="shimmer h-4 w-5/6 rounded-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="shimmer h-3 w-20 rounded-full" />
                <div className="shimmer mt-2 h-4 w-24 rounded-full" />
              </div>
            ))}
          </div>
          <div className="shimmer h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="-mt-6 space-y-5 px-4 pb-6 pt-0 xl:mt-0 xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="card overflow-hidden relative z-0 mt-10">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <SegmentSkeleton />
            <div className="shimmer h-9 w-28 rounded-xl" />
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="shimmer h-10 flex-1 rounded-xl" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
              <div className="shimmer h-10 w-full rounded-xl xl:w-36" />
              <div className="shimmer h-10 w-full rounded-xl xl:w-44" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#DBEAFE] bg-white px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="shimmer h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <div className="shimmer h-3 w-16 rounded-full" />
                <div className="shimmer h-6 w-10 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <PanelSkeleton />
      </div>
    </div>
  );
}
