function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="shimmer h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <div className="shimmer h-4 w-32 rounded-full" />
          <div className="flex gap-2">
            <div className="shimmer h-5 w-16 rounded-full" />
            <div className="shimmer h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="shimmer h-3 w-20 rounded-full" />
            <div className="shimmer mt-2 h-4 w-24 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-8 w-20 rounded-lg" />
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
            <div className="shimmer h-3 w-32 rounded-full" />
            <div className="shimmer h-8 w-72 max-w-full rounded-full" />
            <div className="shimmer h-4 w-80 max-w-full rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="shimmer h-3 w-16 rounded-full bg-white/30" />
                      <div className="shimmer h-7 w-10 rounded-full bg-white/30" />
                    </div>
                    <div className="shimmer h-8 w-8 rounded-lg bg-white/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="shimmer h-10 flex-1 rounded-xl" />
            <div className="grid grid-cols-2 gap-2 md:flex">
              <div className="shimmer h-10 w-full rounded-xl md:w-32" />
              <div className="shimmer h-10 w-full rounded-xl md:w-36" />
            </div>
          </div>
        </div>
      </div>
      <div className="card p-4">
        <div className="shimmer mb-4 h-5 w-24 rounded-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
