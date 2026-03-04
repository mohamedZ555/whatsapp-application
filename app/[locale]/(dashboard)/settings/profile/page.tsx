"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import SettingsTabs from "@/components/layout/settings-tabs";

export default function SettingsProfilePage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [form, setForm] = useState({ profile_name: "", profile_email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) =>
        setForm({
          profile_name: data.profile_name ?? "",
          profile_email: data.profile_email ?? "",
        }),
      )
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
  }

  return (
    <>
      <SettingsTabs activeTab="profile" className="mb-6" />
      <div className="w-full bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("profile")}
        </h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("businessName")}
            </label>
            <input
              value={form.profile_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, profile_name: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("businessEmail")}
            </label>
            <input
              type="email"
              value={form.profile_email}
              onChange={(e) =>
                setForm((s) => ({ ...s, profile_email: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? tc("saving") : tc("save")}
          </button>
        </form>
      </div>
    </>
  );
}
