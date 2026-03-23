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

      <div className="mt-4 flex items-center gap-2">
        <div className="shimmer h-8 w-24 rounded-lg" />
        <div className="shimmer h-8 w-26 rounded-lg" />
      </div>
    </article>
  );
}

function QueueCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="shimmer h-4 w-44 rounded-full" />
      <div className="shimmer h-3 w-32 rounded-full" />
      <div className="shimmer h-9 rounded-lg" />
      <div className="flex justify-end">
        <div className="shimmer h-7 w-18 rounded-lg" />
      </div>
    </div>
  );
}

export default function BlogsLoadingView() {
  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 pt-6 xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] items-stretch">
        <div className="min-w-0 space-y-4">
          <div className="card overflow-visible flex flex-col">
            <div className="px-4 py-3 border-b border-(--card-border)">
              <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
                <div className="shimmer h-10 min-w-0 flex-1 rounded-xl xl:min-w-[320px] xl:flex-[1.2]" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0">
                  <div className="shimmer h-9 w-full rounded-xl xl:w-44" />
                  <div className="shimmer h-9 w-full rounded-xl xl:w-44" />
                </div>
              </div>
            </div>
          </div>

          <section className="card overflow-hidden">
            <div className="border-b border-(--card-border) px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="shimmer h-4 w-24 rounded-full" />
                <div className="shimmer h-9 w-28 rounded-xl" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <BlogCardSkeleton key={index} />
              ))}
            </div>
          </section>
        </div>

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
  );
}
