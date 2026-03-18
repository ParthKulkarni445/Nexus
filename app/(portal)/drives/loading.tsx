function CompanyItemSkeleton() {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="shimmer h-4 w-32 rounded-full" />
          <div className="shimmer h-3 w-20 rounded-full" />
        </div>
        <div className="shimmer h-6 w-14 rounded-full" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="shimmer h-3 w-10 rounded-full" />
            <div className="shimmer mt-1 h-4 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanelSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 h-full">
      <div className="mb-2 flex items-center gap-2">
        <div className="shimmer h-4 w-28 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="shimmer h-3 w-full rounded-full" />
            <div className="shimmer mt-1 h-3 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            <div className="shimmer h-3 w-28 rounded-full" />
            <div className="shimmer h-8 w-80 max-w-full rounded-full" />
            <div className="shimmer h-4 w-[30rem] max-w-full rounded-full" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                  <div className="shimmer h-3 w-20 rounded-full" />
                  <div className="shimmer mt-2 h-7 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="shimmer h-10 w-full rounded-xl" />
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-3 h-full"
            >
              <div className="shimmer h-4 w-32 rounded-full" />
              <div className="shimmer mt-3 h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-stretch">
        <section className="card p-4 h-full">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="shimmer h-4 w-32 rounded-full" />
            <div className="shimmer h-6 w-16 rounded-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <CompanyItemSkeleton key={index} />
            ))}
          </div>
        </section>

        <section className="card p-4 h-full">
          <div className="flex items-center justify-between gap-2 border-b border-(--card-border) pb-3">
            <div className="space-y-2">
              <div className="shimmer h-5 w-32 rounded-full" />
              <div className="shimmer h-3 w-40 rounded-full" />
            </div>
            <div className="shimmer h-6 w-24 rounded-full" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
            {Array.from({ length: 4 }, (_, index) => (
              <DetailPanelSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
