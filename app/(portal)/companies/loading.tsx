function SummaryCardSkeleton() {
  return (
    <div className="rounded-[18px] border border-white/70 bg-white/85 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="shimmer h-4 w-24 rounded-full" />
          <div className="shimmer h-8 w-16 rounded-full" />
        </div>
        <div className="shimmer h-10 w-10 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="p-4 lg:p-6 animate-fade-in xl:h-full xl:overflow-hidden">
      <div className="flex h-full flex-col gap-5 xl:flex-row">
        <div className="w-full xl:max-w-[360px] space-y-4">
          <div className="shimmer h-10 w-40 rounded-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {Array.from({ length: 4 }, (_, index) => (
              <SummaryCardSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="card flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="space-y-3 border-b border-(--card-border) px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="shimmer h-10 flex-1 rounded-xl" />
              <div className="shimmer h-9 w-24 rounded-xl" />
              <div className="shimmer h-9 w-20 rounded-xl" />
              <div className="shimmer h-9 w-20 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <div className="shimmer h-9 flex-1 rounded-xl" />
              <div className="shimmer h-9 flex-1 rounded-xl" />
              <div className="shimmer h-9 flex-1 rounded-xl" />
              <div className="shimmer h-9 flex-1 rounded-xl" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-3 min-w-160">
              {Array.from({ length: 7 }, (_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_0.9fr_1fr_1.1fr_0.9fr] items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shimmer h-8 w-8 rounded-lg shrink-0" />
                    <div className="space-y-2">
                      <div className="shimmer h-4 w-32 rounded-full" />
                      <div className="shimmer h-3 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="shimmer h-4 w-20 rounded-full" />
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-24 rounded-full" />
                  <div className="shimmer h-4 w-24 rounded-full" />
                  <div className="flex justify-center">
                    <div className="shimmer h-4 w-24 rounded-full" />
                  </div>
                  <div className="flex justify-center gap-2">
                    <div className="shimmer h-8 w-8 rounded-lg" />
                    <div className="shimmer h-8 w-8 rounded-lg" />
                    <div className="shimmer h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
