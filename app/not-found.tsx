import Link from 'next/link';

export default function RootNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
          404
        </div>
        <h1 className="text-2xl font-bold text-emerald-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page may have moved, been deleted, or the URL is not correct.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/en"
            className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Go to Home
          </Link>
          <Link
            href="/en/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

