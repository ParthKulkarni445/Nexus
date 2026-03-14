export default function Loading() {
  return (
    <div className="space-y-5 animate-fade-in p-4 lg:p-6 xl:h-full xl:overflow-y-auto">
      <div className="card inline-flex w-fit items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="shimmer h-4 w-24 rounded-full" />
          <div className="shimmer h-4 w-4 rounded-full" />
          <div className="shimmer h-4 w-36 rounded-full" />
        </div>
      </div>

        <div className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="shimmer h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="shimmer h-8 w-56 rounded-full" />
                <div className="shimmer h-8 w-28 rounded-full" />
                <div className="shimmer h-8 w-24 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="shimmer h-5 w-20 rounded-full" />
                <div className="shimmer h-5 w-40 rounded-full" />
                <div className="shimmer h-5 w-28 rounded-full" />
              </div>
              <div className="shimmer h-18 w-full rounded-2xl" />
            </div>
            <div className="shimmer h-9 w-24 rounded-xl" />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex gap-4 border-b border-slate-100 px-5 py-4">
            <div className="shimmer h-5 w-24 rounded-full" />
            <div className="shimmer h-5 w-28 rounded-full" />
            <div className="shimmer h-5 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shimmer h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <div className="shimmer h-4 w-28 rounded-full" />
                      <div className="shimmer h-3 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="shimmer h-7 w-14 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="shimmer h-4 w-40 rounded-full" />
                  <div className="shimmer h-4 w-32 rounded-full" />
                  <div className="shimmer h-4 w-36 rounded-full" />
                </div>
                <div className="shimmer h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
