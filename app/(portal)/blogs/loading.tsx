function BlogCardSkeleton() {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 min-w-0">
          <div className="shimmer h-4 w-56 max-w-full rounded-full" />
          <div className="shimmer h-3 w-40 rounded-full" />
        </div>
        <div className="shimmer h-6 w-20 rounded-full" />
      </div>

      <div className="mt-3 space-y-2">
        <div className="shimmer h-3 w-full rounded-full" />
        <div className="shimmer h-3 w-10/12 rounded-full" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-6 w-18 rounded-full" />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-8 rounded-lg" />
        ))}
      </div>
    </article>
  );
}

function QueueCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="shimmer h-4 w-44 rounded-full" />
      <div className="shimmer h-3 w-32 rounded-full" />
      <div className="flex gap-2">
        <div className="shimmer h-5 w-20 rounded-full" />
        <div className="shimmer h-5 w-24 rounded-full" />
      </div>
      <div className="shimmer h-9 rounded-lg" />
      <div className="flex justify-end gap-2">
        <div className="shimmer h-7 w-18 rounded-lg" />
        <div className="shimmer h-7 w-18 rounded-lg" />
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
            <div className="shimmer h-3 w-24 rounded-full" />
            <div className="shimmer h-8 w-80 max-w-full rounded-full" />
            <div className="shimmer h-4 w-[28rem] max-w-full rounded-full" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                  <div className="shimmer h-3 w-20 rounded-full" />
                  <div className="shimmer mt-2 h-7 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="shimmer h-10 flex-1 rounded-xl" />
            <div className="grid grid-cols-2 gap-2 lg:flex">
              <div className="shimmer h-10 w-full rounded-xl lg:w-40" />
              <div className="shimmer h-10 w-full rounded-xl lg:w-44" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] items-stretch">
          <section className="space-y-3 h-full">
            {Array.from({ length: 4 }, (_, index) => (
              <BlogCardSkeleton key={index} />
            ))}
          </section>

          <aside className="card p-4 h-full">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="shimmer h-4 w-32 rounded-full" />
              <div className="shimmer h-6 w-20 rounded-full" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <QueueCardSkeleton key={index} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
