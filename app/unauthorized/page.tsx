import Link from "next/link";

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const from = searchParams?.from;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2563EB]">
          Access Control
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to open this page.
          {from ? ` Requested path: ${from}` : ""}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/companies" className="btn btn-primary btn-sm">
            Go to Companies
          </Link>
          <Link href="/login" className="btn btn-secondary btn-sm">
            Switch account
          </Link>
        </div>
      </div>
    </main>
  );
}
