export default function AdminTranslationsPage() {
  return (
    <div className="max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Translations</h1>
      <p className="text-sm text-gray-600 mb-3">
        Translation keys are stored in <code className="bg-slate-100 rounded px-1.5 py-0.5">messages/en.json</code> and
        <code className="bg-slate-100 rounded px-1.5 py-0.5 ms-1">messages/ar.json</code>.
      </p>
      <p className="text-sm text-gray-600">Use those files to add or update translated content for dashboard and landing pages.</p>
    </div>
  );
}
