export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="h-8 w-48 shimmer rounded-lg mb-2" />
        <div className="h-4 w-96 shimmer rounded-lg" />
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="h-5 w-32 shimmer rounded-lg" />
        </div>

        <div className="p-6">
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
            {/* Calendar header skeleton */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 shimmer rounded" />
                <div className="h-8 w-32 shimmer rounded" />
                <div className="h-4 w-24 shimmer rounded" />
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-4 w-full shimmer rounded" />
                ))}
              </div>
            </div>

            {/* Calendar grid skeleton */}
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="aspect-square rounded border border-slate-200 bg-slate-50"
                    >
                      <div className="p-2 space-y-1">
                        <div className="h-3 w-5 shimmer rounded" />
                        <div className="h-2 w-full shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Sidebar skeleton */}
            <div className="border-t border-[#E2E8F0] p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full shimmer rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
