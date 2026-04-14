function CompaniesTableLoadingSkeleton() {
  return (
    <table className="w-full min-w-160 table-fixed text-sm">
      <thead>
        <tr className="bg-slate-100 border-b border-slate-100">
          <th className="w-[28%] px-4 py-3 text-left">
            <div className="shimmer h-3 w-20 rounded-full" />
          </th>
          <th className="w-[33%] px-4 py-3 text-left">
            <div className="shimmer h-3 w-16 rounded-full" />
          </th>
          <th className="w-[12%] px-4 py-3 text-left">
            <div className="shimmer h-3 w-16 rounded-full" />
          </th>
          <th className="w-[17%] px-4 py-3 text-center">
            <div className="mx-auto shimmer h-3 w-24 rounded-full" />
          </th>
          <th className="w-[10%] px-4 py-3 text-center">
            <div className="mx-auto shimmer h-3 w-16 rounded-full" />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 bg-white">
        {Array.from({ length: 7 }, (_, index) => (
          <tr key={index}>
            <td className="px-4 py-3 align-middle">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shimmer h-10 w-10 rounded-xl shrink-0" />
                <div className="min-w-0 space-y-2">
                  <div className="shimmer h-4 w-44 rounded-full" />
                  <div className="shimmer h-3 w-20 rounded-full" />
                </div>
              </div>
            </td>
            <td className="px-4 py-3 align-middle">
              <div className="shimmer h-4 w-full max-w-[340px] rounded-full" />
            </td>
            <td className="px-4 py-3 align-middle">
              <div className="shimmer h-7 w-16 rounded-full" />
            </td>
            <td className="px-4 py-3 align-middle">
              <div className="flex items-center justify-center gap-2">
                <div className="shimmer h-5 w-32 rounded-full" />
                <div className="shimmer h-6 w-6 rounded-md" />
              </div>
            </td>
            <td className="px-4 py-3 align-middle">
              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                <div className="shimmer h-8 w-8 rounded-lg" />
                <div className="shimmer h-8 w-8 rounded-lg" />
                <div className="shimmer h-8 w-8 rounded-lg" />
                <div className="shimmer h-8 w-8 rounded-lg" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Loading() {
  return (
    <div className="animate-fade-in xl:h-full pb-6 pt-6">
      <div className="card flex min-w-0 flex-col overflow-hidden xl:h-full">
        <div className="space-y-3 border-b border-(--card-border) px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="shimmer h-10 flex-1 rounded-xl" />
            <div className="shimmer h-9 w-24 rounded-xl" />
            <div className="shimmer h-9 w-20 rounded-xl" />
            <div className="shimmer h-9 w-20 rounded-xl" />
            <div className="shimmer h-9 w-20 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <div className="shimmer h-9 flex-1 rounded-xl" />
            <div className="shimmer h-9 flex-1 rounded-xl" />
            <div className="shimmer h-9 w-24 rounded-xl" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <CompaniesTableLoadingSkeleton />
        </div>
      </div>
    </div>
  );
}
