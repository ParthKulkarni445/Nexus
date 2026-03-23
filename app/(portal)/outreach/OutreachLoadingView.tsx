function TaskRowSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="shimmer h-10 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="shimmer h-4 w-40 rounded-full" />
              <div className="shimmer h-3 w-20 rounded-full" />
            </div>
            <div className="shimmer h-6 w-20 rounded-full" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <div className="shimmer h-3 w-20 rounded-full" />
                <div className="shimmer mt-2 h-4 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCardSkeleton() {
  return (
    <div className="rounded-xl border border-white bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="shimmer h-4 w-32 rounded-full" />
          <div className="shimmer h-3 w-24 rounded-full" />
        </div>
        <div className="shimmer h-4 w-14 rounded-full" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="shimmer h-3 w-14 rounded-full" />
            <div className="shimmer h-4 w-32 rounded-full" />
            <div className="shimmer h-4 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineItemSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center">
        <div className="shimmer h-8 w-8 rounded-full" />
        <div className="my-1 h-12 w-0.5 bg-slate-100" />
      </div>
      <div className="flex-1 pb-5">
        <div className="flex items-center gap-2">
          <div className="shimmer h-5 w-14 rounded-full" />
          <div className="shimmer h-3 w-28 rounded-full" />
        </div>
        <div className="mt-2 shimmer h-4 w-56 rounded-full" />
        <div className="mt-2 flex gap-2">
          <div className="shimmer h-6 w-20 rounded-full" />
          <div className="shimmer h-6 w-24 rounded-full" />
        </div>
        <div className="mt-2 shimmer h-3 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function OutreachLoadingView() {
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
                <div
                  key={index}
                  className="rounded-xl border border-slate-50 bg-slate-200 px-3 py-2.5 shadow-sm"
                >
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
              <div className="shimmer h-10 w-full rounded-xl sm:w-40 md:w-44" />
              <div className="shimmer h-10 w-full rounded-xl sm:w-44 md:w-52" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[1040px] grid-cols-[420px_minmax(0,1fr)] items-start gap-4">
            <div className="card flex h-[calc(100vh-9.5rem)] min-h-0 flex-col overflow-hidden">
              <div className="border-b border-(--card-border) px-4 py-3">
                <div className="shimmer h-4 w-16 rounded-full" />
              </div>
              <div className="min-h-0 flex-1 p-2">
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <TaskRowSkeleton key={index} />
                  ))}
                </div>
              </div>
            </div>

            <div className="card self-start p-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shimmer h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-5 w-56 rounded-full" />
                    <div className="flex gap-2">
                      <div className="shimmer h-6 w-20 rounded-full" />
                      <div className="shimmer h-6 w-24 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="shimmer h-3 w-20 rounded-full" />
                      <div className="shimmer mt-2 h-4 w-24 rounded-full" />
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="shimmer h-4 w-16 rounded-full" />
                        <div className="shimmer h-6 w-14 rounded-full" />
                      </div>
                      <div className="mt-3 space-y-3">
                        {Array.from({ length: 3 }, (_, index) => (
                          <ContactCardSkeleton key={index} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                      <div className="space-y-2">
                        <div className="shimmer h-4 w-28 rounded-full" />
                        <div className="shimmer h-3 w-56 rounded-full" />
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="shimmer h-3 w-20 rounded-full" />
                        <div className="mt-3 space-y-2">
                          {Array.from({ length: 2 }, (_, index) => (
                            <div key={index} className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_36px] gap-2">
                              <div className="shimmer h-10 rounded-lg" />
                              <div className="shimmer h-10 rounded-lg" />
                              <div className="shimmer h-10 rounded-lg" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        {Array.from({ length: 3 }, (_, index) => (
                          <div key={index} className="shimmer h-9 w-20 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="shimmer h-4 w-28 rounded-full" />
                        <div className="shimmer h-3 w-56 rounded-full" />
                      </div>
                      <div className="shimmer h-6 w-12 rounded-full" />
                    </div>
                    <div className="mt-4 space-y-0">
                      {Array.from({ length: 4 }, (_, index) => (
                        <TimelineItemSkeleton key={index} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
