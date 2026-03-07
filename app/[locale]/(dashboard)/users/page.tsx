"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { USER_ROLES, VENDOR_PERMISSIONS } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber?: string | null;
  vendorId?: string | null;
  roleId: number;
  status: number;
  createdAt: string;
  vendor?: { id: string; title: string | null; uid: string } | null;
  vendorUserDetail?: {
    permissions: string[] | null;
    jobCategory?: { id: string; name: string; color: string } | null;
  } | null;
};

type VendorOption = { id: string; title: string | null; uid: string };

type UserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  password: string;
  roleId: number;
  vendorId: string;
  vendorTitle: string;
  permissions: string[];
  jobCategoryId: string;
};

type UserEditState = {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  roleId: number;
  status: number;
  vendorId: string;
  permissions: string[];
  password: string;
  jobCategoryId: string;
  // Extra for UI context:
  adminName?: string;
  adminPermissions?: string[]; // undefined = no restriction (super admin editing admin), [] = admin has none
  planDisabledPerms?: string[]; // permissions disabled by plan
};

type ExtendedSessionUser = {
  id: string;
  roleId?: number;
  vendorId?: string | null;
  planDisabledPerms?: string[];
  permissionsRestricted?: boolean;
};
type RoleFilter = "all" | "admins" | "employees";

// ─── Constants ────────────────────────────────────────────────────────────────

// PERMISSION_LABELS is now built inside components using useTranslations
const PERM_KEY_MAP: Record<string, string> = {
  manage_contacts: "permContactsLabel",
  manage_campaigns: "permCampaignsLabel",
  manage_templates: "permTemplatesLabel",
  manage_bot_replies: "permBotRepliesLabel",
  manage_chat: "permChatLabel",
  view_message_log: "permMessageLogLabel",
  manage_users: "permUsersLabel",
};

// STATUS_MAP and ROLE_CONFIG labels are now built inside components using useTranslations
function getStatusMapEntry(
  status: number,
  t: (k: string) => string,
): { label: string; cls: string; dot: string } {
  const map: Record<number, { label: string; cls: string; dot: string }> = {
    1: {
      label: t("statusActive"),
      cls: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    2: {
      label: t("statusInactive"),
      cls: "bg-slate-100 text-slate-500",
      dot: "bg-slate-400",
    },
    3: {
      label: t("statusSuspended"),
      cls: "bg-orange-100 text-orange-600",
      dot: "bg-orange-500",
    },
    4: {
      label: t("statusPending"),
      cls: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    5: {
      label: t("statusDeleted"),
      cls: "bg-slate-100 text-slate-400",
      dot: "bg-slate-300",
    },
    6: {
      label: t("statusBanned"),
      cls: "bg-red-100 text-red-700",
      dot: "bg-red-500",
    },
  };
  return (
    map[status] ?? {
      label: t("statusUnknown"),
      cls: "bg-slate-100 text-slate-500",
      dot: "bg-slate-300",
    }
  );
}

function getRoleConfig(
  roleId: number,
  t: (k: string) => string,
): { label: string; cls: string; icon: string } | undefined {
  const map: Record<number, { label: string; cls: string; icon: string }> = {
    [USER_ROLES.SUPER_ADMIN]: {
      label: t("superAdminRole"),
      cls: "bg-purple-100 text-purple-700 border-purple-200",
      icon: "⚡",
    },
    [USER_ROLES.VENDOR]: {
      label: t("adminRole"),
      cls: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "🏢",
    },
    [USER_ROLES.VENDOR_USER]: {
      label: t("employeeRole"),
      cls: "bg-slate-100 text-slate-700 border-slate-200",
      icon: "👤",
    },
  };
  return map[roleId];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const t = useTranslations("users");
  const s = getStatusMapEntry(status, t as any);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PermsBadges({
  perms,
  variant = "default",
}: {
  perms: string[];
  variant?: "default" | "compact";
}) {
  const t = useTranslations("users");
  if (!perms.length) return <span className="text-slate-300 text-xs">—</span>;
  const colorCls =
    variant === "compact"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className="flex flex-wrap gap-1">
      {perms.map((p) => (
        <span
          key={p}
          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${colorCls}`}
        >
          {t(PERM_KEY_MAP[p] as any) ?? p}
        </span>
      ))}
    </div>
  );
}

/**
 * Scoped permission checkboxes.
 * - allowedPerms: the admin's current permissions. If undefined → no restriction (super admin editing admin).
 * - Permissions the admin doesn't have are rendered as locked/grayed with a tooltip.
 */
function PermCheckboxes({
  selected,
  onChange,
  allowedPerms,
  planDisabledPerms = [],
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
  allowedPerms?: string[];
  planDisabledPerms?: string[];
}) {
  const t = useTranslations("users");
  const permLabel = (perm: string) => t(PERM_KEY_MAP[perm] as any) ?? perm;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {VENDOR_PERMISSIONS.map((perm) => {
          const checked = selected.includes(perm);
          const isPlanLocked = planDisabledPerms.includes(perm);
          const adminHas =
            allowedPerms === undefined || allowedPerms.includes(perm);
          const isAdminLocked = !adminHas;
          const locked = isPlanLocked || isAdminLocked;

          return (
            <div key={perm} className="relative group">
              <label
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
                  ${
                    isPlanLocked
                      ? "cursor-not-allowed border-amber-100 bg-amber-50 text-amber-400 opacity-70"
                      : isAdminLocked
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60"
                        : checked
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-emerald-600"
                  checked={checked && !locked}
                  disabled={locked}
                  onChange={(e) => {
                    if (locked) return;
                    onChange(
                      e.target.checked
                        ? [...selected, perm]
                        : selected.filter((p) => p !== perm),
                    );
                  }}
                />
                {isPlanLocked && <span className="text-[10px]">📋</span>}
                {!isPlanLocked && isAdminLocked && (
                  <span className="text-[10px]">🔒</span>
                )}
                {permLabel(perm)}
              </label>
              {locked && (
                <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 whitespace-nowrap">
                  {isPlanLocked ? t("lockedByPlan") : t("lockedByAdmin")}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {planDisabledPerms.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <span className="text-sm">📋</span>
          <div>
            <p className="font-semibold">{t("planLockedWarning")}</p>
            <p className="mt-0.5">
              {t("planLockedUpgrade")}{" "}
              {planDisabledPerms.map((p) => permLabel(p)).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {allowedPerms !== undefined &&
        allowedPerms.filter((p) => !planDisabledPerms.includes(p)).length ===
          0 &&
        allowedPerms.length === 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <span className="text-sm">⚠️</span>
            <div>
              <p className="font-semibold">{t("adminNoPerms")}</p>
              <p className="mt-0.5">{t("adminNoPermsDesc")}</p>
            </div>
          </div>
        )}

      {allowedPerms !== undefined &&
        allowedPerms.length > 0 &&
        VENDOR_PERMISSIONS.some(
          (p) => !allowedPerms.includes(p) && !planDisabledPerms.includes(p),
        ) && (
          <p className="text-[11px] text-slate-400">
            🔒 {t("lockedByAdminHint")}
          </p>
        )}
    </div>
  );
}

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data && "error" in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === "string" && e.trim()) return e;
  }
  return fallback;
}

function Avatar({ user }: { user: UserRow }) {
  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const color = colors[(user.firstName?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}
    >
      {initial}
    </div>
  );
}

function AvatarSmall({
  name,
  color = "bg-blue-500",
}: {
  name: string;
  color?: string;
}) {
  return (
    <div
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${color}`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
  sessionVendorId,
  isSuperAdmin,
  vendors,
  adminPermsMap,
}: {
  onClose: () => void;
  onCreated: () => void;
  sessionVendorId: string | undefined;
  isSuperAdmin: boolean;
  vendors: VendorOption[];
  adminPermsMap: Map<string, string[]>;
}) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const PERMISSION_LABELS = Object.fromEntries(
    Object.entries(PERM_KEY_MAP).map(([perm, key]) => [perm, t(key as any)]),
  );
  const [form, setForm] = useState<UserFormState>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    mobileNumber: "",
    password: "",
    roleId: USER_ROLES.VENDOR_USER,
    vendorId: sessionVendorId ?? "",
    vendorTitle: "",
    permissions: ["manage_chat"],
    jobCategoryId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createPlanPerms, setCreatePlanPerms] = useState<string[]>([]);
  const [jobCategories, setJobCategories] = useState<
    { id: string; name: string }[]
  >([]);

  // Fetch plan-disabled perms and job categories when vendor selection changes
  useEffect(() => {
    const targetVendorId = form.vendorId || sessionVendorId;
    if (!targetVendorId) return;

    // Fetch plan permissions
    fetch(
      `/api/subscription/plan-perms?vendorId=${encodeURIComponent(targetVendorId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setCreatePlanPerms(
          Array.isArray(d?.planDisabledPerms) ? d.planDisabledPerms : [],
        ),
      )
      .catch(() => setCreatePlanPerms([]));

    // Fetch job categories
    fetch(`/api/job-categories?vendorId=${encodeURIComponent(targetVendorId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setJobCategories(Array.isArray(d?.categories) ? d.categories : []);
      })
      .catch(() => setJobCategories([]));
  }, [form.vendorId, sessionVendorId]);

  function set<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  // When vendor changes for an employee, strip any perms the admin doesn't have
  function handleVendorChange(vendorId: string) {
    const adminPerms = adminPermsMap.get(vendorId);
    const filtered = adminPerms
      ? form.permissions.filter((p) => adminPerms.includes(p))
      : form.permissions;
    // Also strip plan-locked perms (will be re-filtered after fetch)
    setForm((s) => ({ ...s, vendorId, permissions: filtered }));
  }

  // Determine the allowed permissions for the selected vendor's admin
  const isEmployee = form.roleId === USER_ROLES.VENDOR_USER;
  const isAdminRole = form.roleId === USER_ROLES.VENDOR;
  const allowedPerms =
    isEmployee && isSuperAdmin && form.vendorId
      ? adminPermsMap.get(form.vendorId)
      : isEmployee && !isSuperAdmin
        ? adminPermsMap.get(sessionVendorId ?? "")
        : undefined; // no restriction for admin role

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(getApiError(data, t("failedCreateUser")));
      return;
    }
    onCreated();
    onClose();
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
          <h2 className="text-base font-semibold text-white">
            ➕ {t("createUser")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        >
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <FieldGroup label={t("firstNamePlaceholder")}>
            <input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("lastNamePlaceholder")}>
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("username")}>
            <input
              required
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("email")}>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("mobile")}>
            <input
              value={form.mobileNumber}
              onChange={(e) => set("mobileNumber", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("password")}>
            <input
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("role")}>
            <select
              value={form.roleId}
              onChange={(e) => set("roleId", Number(e.target.value))}
              className={inputCls}
            >
              {isSuperAdmin && (
                <option value={USER_ROLES.VENDOR}>{t("adminRole")}</option>
              )}
              <option value={USER_ROLES.VENDOR_USER}>
                {t("employeeRole")}
              </option>
            </select>
          </FieldGroup>
          {isSuperAdmin && isAdminRole && (
            <FieldGroup label={t("workspaceName")}>
              <input
                value={form.vendorTitle}
                onChange={(e) => set("vendorTitle", e.target.value)}
                placeholder={t("workspacePlaceholder")}
                className={inputCls}
              />
            </FieldGroup>
          )}
          {isSuperAdmin && isEmployee && (
            <FieldGroup label={t("assignToAdminWorkspace")}>
              <select
                value={form.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                className={inputCls}
              >
                <option value={sessionVendorId ?? ""}>
                  {t("myWorkspace")}
                </option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title ?? v.uid}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}
          {isEmployee && jobCategories.length > 0 && (
            <FieldGroup label={t("jobCategory", { default: "Job Category" })}>
              <select
                value={form.jobCategoryId}
                onChange={(e) => set("jobCategoryId", e.target.value)}
                className={inputCls}
              >
                <option value="">{tc("none", { default: "None" })}</option>
                {jobCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}
          {(isEmployee || isAdminRole) && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {t("permissions")}
                {isAdminRole && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {t("adminLevelHint")}
                  </span>
                )}
              </label>
              <PermCheckboxes
                selected={form.permissions}
                onChange={(perms) =>
                  set(
                    "permissions",
                    perms.filter((p) => !createPlanPerms.includes(p)),
                  )
                }
                allowedPerms={isEmployee ? allowedPerms : undefined}
                planDisabledPerms={createPlanPerms}
              />
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? tc("saving") : tc("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  initial,
  isSuperAdmin,
  sessionUserId,
  onClose,
  onUpdated,
}: {
  initial: UserEditState;
  isSuperAdmin: boolean;
  sessionUserId: string | undefined;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const PERMISSION_LABELS = Object.fromEntries(
    Object.entries(PERM_KEY_MAP).map(([perm, key]) => [perm, t(key as any)]),
  );
  const [form, setForm] = useState<UserEditState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [permWarn, setPermWarn] = useState(""); // out-of-scope warning from API
  const [outOfScope, setOutOfScope] = useState<string[]>([]);
  const [jobCategories, setJobCategories] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!initial.vendorId) return;
    fetch(
      `/api/job-categories?vendorId=${encodeURIComponent(initial.vendorId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setJobCategories(Array.isArray(d?.categories) ? d.categories : []);
      })
      .catch(() => setJobCategories([]));
  }, [initial.vendorId]);

  function set<K extends keyof UserEditState>(key: K, value: UserEditState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    // Clear warnings when permissions change
    if (key === "permissions") {
      setPermWarn("");
      setOutOfScope([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setPermWarn("");
    setOutOfScope([]);

    const payload: Record<string, unknown> = {
      userId: form.userId,
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      mobileNumber: form.mobileNumber,
      status: form.status,
      permissions: form.permissions,
      jobCategoryId: form.jobCategoryId,
    };
    if (form.password.trim()) payload.password = form.password;

    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.status === 422 && (data as any).outOfScopePermissions) {
      // Backend rejected: out-of-scope permissions
      const d = data as {
        error: string;
        outOfScopePermissions: string[];
        adminPermissions: string[];
      };
      setOutOfScope(d.outOfScopePermissions);
      setPermWarn(d.error);
      return;
    }
    if (!res.ok) {
      setError(getApiError(data, t("failedUpdateUser")));
      return;
    }
    onUpdated();
    onClose();
  }

  const isOwnAccount = form.userId === sessionUserId;
  const isEmployee = form.roleId === USER_ROLES.VENDOR_USER;
  const isAdmin = form.roleId === USER_ROLES.VENDOR;
  const showPerms = isEmployee || (isSuperAdmin && isAdmin) || isAdmin;

  // For employees: only allow permissions the admin has
  // For admins: no admin-scope restriction (they can get any non-plan-locked perm)
  const allowedPerms = isEmployee ? initial.adminPermissions : undefined;

  // Strip planDisabledPerms from selected permissions on render to prevent stale state
  const planDisabledPerms = initial.planDisabledPerms ?? [];
  const effectivePermissions = form.permissions.filter(
    (p) => !planDisabledPerms.includes(p),
  );

  const statusOptions = [
    { value: 1, label: t("statusActive") },
    { value: 2, label: t("statusInactive") },
    { value: 3, label: t("statusSuspended") },
    { value: 4, label: t("statusPending") },
    { value: 6, label: t("statusBanned") },
  ];

  const roleCfg = getRoleConfig(form.roleId, t as any);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-slate-100 px-6 py-4 rounded-t-2xl bg-gradient-to-r ${isAdmin ? "from-blue-600 to-indigo-600" : "from-slate-600 to-slate-700"}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white font-bold text-sm">
              {(form.firstName?.[0] ?? "").toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {form.firstName} {form.lastName}
              </h2>
              <p className="text-xs text-white/70">
                {roleCfg?.icon} {roleCfg?.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Reports-to banner for employees */}
        {isEmployee && (form.adminName || allowedPerms !== undefined) && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white flex-shrink-0">
              {form.adminName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-900">
                {t("reportsToAdmin")}
              </p>
              <p className="text-sm font-bold text-blue-700">
                {form.adminName ?? t("unknownAdmin")}
              </p>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-blue-400 font-semibold">
                {t("adminHasPermissions", { count: allowedPerms?.length ?? 0 })}
              </p>
              <div className="mt-0.5 flex flex-wrap justify-end gap-1">
                {(allowedPerms ?? []).slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-600"
                  >
                    {PERMISSION_LABELS[p] ?? p}
                  </span>
                ))}
                {(allowedPerms?.length ?? 0) > 3 && (
                  <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-600">
                    +{(allowedPerms?.length ?? 0) - 3}
                  </span>
                )}
                {(allowedPerms?.length ?? 0) === 0 && (
                  <span className="text-[10px] text-blue-400 italic">
                    {t("noPermissions")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        >
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          {permWarn && (
            <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p className="font-semibold">⚠️ {t("permConflict")}</p>
              <p className="mt-0.5">{permWarn}</p>
              {outOfScope.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {outOfScope.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900"
                    >
                      {PERMISSION_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-amber-600">
                {t("permConflictHint")}
              </p>
            </div>
          )}
          <FieldGroup label={t("firstNamePlaceholder")}>
            <input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("lastNamePlaceholder")}>
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("username")}>
            <input
              required
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("email")}>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label={t("mobile")}>
            <input
              value={form.mobileNumber}
              onChange={(e) => set("mobileNumber", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          {!isOwnAccount && (
            <FieldGroup label={t("status")}>
              <select
                value={form.status}
                onChange={(e) => set("status", Number(e.target.value))}
                className={inputCls}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}
          {isEmployee && jobCategories.length > 0 && (
            <FieldGroup label={t("jobCategory", { default: "Job Category" })}>
              <select
                value={form.jobCategoryId}
                onChange={(e) => set("jobCategoryId", e.target.value)}
                className={inputCls}
              >
                <option value="">{tc("none", { default: "None" })}</option>
                {jobCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}
          <FieldGroup label={`${t("password")} (${t("leaveBlankPassword")})`}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={inputCls}
            />
          </FieldGroup>

          {showPerms && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {t("permissions")}
                {isAdmin && (
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-normal text-blue-600 border border-blue-200">
                    {t("adminLevelCascade")}
                  </span>
                )}
              </label>
              <PermCheckboxes
                selected={form.permissions}
                onChange={(perms) =>
                  set(
                    "permissions",
                    perms.filter((p) => !planDisabledPerms.includes(p)),
                  )
                }
                allowedPerms={isEmployee ? allowedPerms : undefined}
                planDisabledPerms={planDisabledPerms}
              />
              {isAdmin &&
                effectivePermissions.length <
                  (initial.permissions?.filter(
                    (p) => !planDisabledPerms.includes(p),
                  ).length ?? 0) && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                    <span>⚠️</span>
                    <span>{t("removingAdminPermsWarning")}</span>
                  </p>
                )}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-60 ${isAdmin ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {saving ? tc("saving") : tc("update")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const PERMISSION_LABELS = Object.fromEntries(
    Object.entries(PERM_KEY_MAP).map(([perm, key]) => [perm, t(key as any)]),
  );
  const { data: session } = useSession();
  const sessionUser = session?.user as ExtendedSessionUser | undefined;

  const roleId = sessionUser?.roleId;
  const sessionUserId = sessionUser?.id;
  const sessionVendorId = sessionUser?.vendorId ?? undefined;
  const sessionPlanDisabledPerms = sessionUser?.planDisabledPerms ?? [];
  const isSuperAdmin = roleId === USER_ROLES.SUPER_ADMIN;
  const isVendorAdmin = roleId === USER_ROLES.VENDOR;
  const canManageUsers = isSuperAdmin || isVendorAdmin;

  const [rows, setRows] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [actionError, setActionError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserEditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const query = isSuperAdmin
      ? ""
      : sessionVendorId
        ? `?vendorId=${encodeURIComponent(sessionVendorId)}`
        : "";
    const res = await fetch(`/api/users${query}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [isSuperAdmin, sessionVendorId]);

  const fetchVendors = useCallback(async () => {
    if (!isSuperAdmin) return;
    const adminUsers = await fetch("/api/users?roleId=2").then((r) => r.json());
    const found = new Map<string, VendorOption>();
    for (const user of Array.isArray(adminUsers) ? adminUsers : []) {
      if (user?.vendor?.id) found.set(user.vendor.id, user.vendor);
    }
    setVendors(Array.from(found.values()));
  }, [isSuperAdmin]);

  useEffect(() => {
    void fetchUsers();
    void fetchVendors();
  }, [fetchUsers, fetchVendors]);

  function canManageRow(row: UserRow): boolean {
    if (isSuperAdmin) return true;
    if (isVendorAdmin)
      return (
        row.roleId === USER_ROLES.VENDOR_USER &&
        row.vendorId === sessionVendorId
      );
    return false;
  }

  // ── Admin permissions map: vendorId → admin's permissions ────────────────
  const adminByVendorId = useMemo(() => {
    const map = new Map<string, UserRow>();
    for (const row of rows) {
      if (row.roleId === USER_ROLES.VENDOR && row.vendorId) {
        map.set(row.vendorId, row);
      }
    }
    return map;
  }, [rows]);

  // vendorId → admin permissions array
  const adminPermsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [vendorId, adminRow] of adminByVendorId.entries()) {
      map.set(
        vendorId,
        (adminRow.vendorUserDetail?.permissions ?? []) as string[],
      );
    }
    return map;
  }, [adminByVendorId]);

  async function openEdit(row: UserRow) {
    setActionError("");

    let adminPermissions: string[] | undefined = undefined;
    let adminName: string | undefined = undefined;
    let planDisabledPerms: string[] = [];

    // For employees, find their admin's permissions
    if (row.roleId === USER_ROLES.VENDOR_USER && row.vendorId) {
      const adminRow = adminByVendorId.get(row.vendorId);
      if (adminRow) {
        adminPermissions = (adminRow.vendorUserDetail?.permissions ??
          []) as string[];
        adminName = `${adminRow.firstName} ${adminRow.lastName}`;
      }
      // If no admin found (edge case), leave undefined = no restriction
    }

    // Determine plan-disabled perms for the target vendor
    const targetVendorId = row.vendorId ?? row.vendor?.id ?? "";
    if (targetVendorId) {
      if (isSuperAdmin) {
        // Super admin: fetch the vendor's actual plan-disabled perms dynamically
        try {
          const res = await fetch(
            `/api/subscription/plan-perms?vendorId=${encodeURIComponent(targetVendorId)}`,
          );
          if (res.ok) {
            const data = await res.json();
            planDisabledPerms = Array.isArray(data.planDisabledPerms)
              ? data.planDisabledPerms
              : [];
          }
        } catch {
          planDisabledPerms = [];
        }
      } else if (targetVendorId === sessionVendorId) {
        // Vendor admin: use session plan-disabled perms (already in session)
        planDisabledPerms = sessionPlanDisabledPerms;
      }
    }

    setEditing({
      userId: row.id,
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      username: row.username ?? "",
      email: row.email ?? "",
      mobileNumber: row.mobileNumber ?? "",
      roleId: row.roleId,
      status: row.status,
      vendorId: targetVendorId,
      permissions: row.vendorUserDetail?.permissions ?? [],
      password: "",
      jobCategoryId: row.vendorUserDetail?.jobCategory?.id ?? "",
      adminPermissions,
      adminName,
      planDisabledPerms,
    });
  }

  async function banUser(id: string) {
    if (!confirm("Ban this user? They will not be able to login.")) return;
    setBusyId(id);
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, status: 6 }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setActionError(getApiError(data, "Failed to ban user."));
      return;
    }
    void fetchUsers();
  }

  async function unbanUser(id: string) {
    if (!confirm("Unban this user?")) return;
    setBusyId(id);
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, status: 1 }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setActionError(getApiError(data, "Failed to unban user."));
      return;
    }
    void fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm(tc("confirmDelete"))) return;
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/users?userId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setActionError(getApiError(data, "Failed to delete user."));
      return;
    }
    void fetchUsers();
    void fetchVendors();
  }

  async function loginAsEmployee(userId: string) {
    if (!confirm(t("loginAsEmployeeConfirm"))) return;
    setImpersonatingId(userId);
    try {
      const res = await fetch("/api/vendor/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(getApiError(data, "Failed to login as employee."));
        setImpersonatingId(null);
        return;
      }
      // Redirect to dashboard as employee
      window.location.href = "/dashboard";
    } catch {
      setActionError("Failed to login as employee.");
      setImpersonatingId(null);
    }
  }

  // ── Filtered rows ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = rows;
    if (roleFilter === "admins")
      result = result.filter((r) => r.roleId === USER_ROLES.VENDOR);
    if (roleFilter === "employees")
      result = result.filter((r) => r.roleId === USER_ROLES.VENDOR_USER);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.username?.toLowerCase().includes(q) ||
          r.mobileNumber?.toLowerCase().includes(q) ||
          r.vendor?.title?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, search, roleFilter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      admins: rows.filter((r) => r.roleId === USER_ROLES.VENDOR).length,
      employees: rows.filter((r) => r.roleId === USER_ROLES.VENDOR_USER).length,
      active: rows.filter((r) => r.status === 1).length,
    }),
    [rows],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {stats.total} {t("name")} · {stats.admins} {t("adminRole")} ·{" "}
            {stats.employees} {t("employeeRole")} · {stats.active}{" "}
            {t("statusActive")}
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => {
              setActionError("");
              setShowCreate(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm"
          >
            <span className="text-base leading-none">+</span> {t("createUser")}
          </button>
        )}
      </div>

      {/* Stats cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: t("name"),
              value: stats.total,
              cls: "bg-slate-50 border-slate-200",
              text: "text-slate-700",
            },
            {
              label: t("adminRole"),
              value: stats.admins,
              cls: "bg-blue-50 border-blue-200",
              text: "text-blue-700",
            },
            {
              label: t("employeeRole"),
              value: stats.employees,
              cls: "bg-emerald-50 border-emerald-200",
              text: "text-emerald-700",
            },
            {
              label: t("statusActive"),
              value: stats.active,
              cls: "bg-green-50 border-green-200",
              text: "text-green-700",
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-sm">
          {(
            [
              { key: "all", label: `${tc("filter")} (${stats.total})` },
              { key: "admins", label: `${t("adminRole")} (${stats.admins})` },
              {
                key: "employees",
                label: `${t("employeeRole")} (${stats.employees})`,
              },
            ] as { key: RoleFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${roleFilter === key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <svg
            className="absolute left-3 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc("search") + "…"}
            className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <p className="ml-auto text-xs text-slate-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-[13px] text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-3.5 text-start font-semibold">
                  {t("name")}
                </th>
                <th className="px-4 py-3.5 text-start font-semibold">
                  {t("role")}
                </th>
                {isSuperAdmin && (
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {t("adminRole")} / {t("workspaceName")}
                  </th>
                )}
                <th className="px-4 py-3.5 text-start font-semibold">
                  {t("permissions")}
                </th>
                <th className="px-4 py-3.5 text-start font-semibold">
                  {tc("status")}
                </th>
                {canManageUsers && (
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {tc("actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {tc("loading")}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="py-12 text-center text-slate-400"
                  >
                    <p className="text-3xl mb-2">👥</p>
                    <p>{tc("noData")}</p>
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const perms = (row.vendorUserDetail?.permissions ??
                  []) as string[];
                const canManage = canManageRow(row);
                const isCurrentUser = row.id === sessionUserId;
                const busy = busyId === row.id;
                const roleCfg = getRoleConfig(row.roleId, t as any);
                const adminRow =
                  row.roleId === USER_ROLES.VENDOR_USER && row.vendorId
                    ? (adminByVendorId.get(row.vendorId) ?? null)
                    : null;
                const workspaceLabel =
                  row.vendor?.title ?? row.vendor?.uid ?? null;

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-slate-50/60 ${isCurrentUser ? "bg-emerald-50/20" : ""}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={row} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 truncate">
                              {row.firstName} {row.lastName}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-400 truncate">
                            @{row.username} · {row.email}
                          </div>
                          {row.mobileNumber && (
                            <div className="text-[11px] text-slate-400">
                              {row.mobileNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      {roleCfg ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${roleCfg.cls}`}
                        >
                          {roleCfg.icon} {roleCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Admin / Workspace (super admin view only) */}
                    {isSuperAdmin && (
                      <td className="px-4 py-3.5">
                        {row.roleId === USER_ROLES.SUPER_ADMIN ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : row.roleId === USER_ROLES.VENDOR ? (
                          // Admin row: show workspace + their own permission count
                          <div>
                            {workspaceLabel && (
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-400" />
                                <span className="text-xs font-medium text-slate-700">
                                  {workspaceLabel}
                                </span>
                              </div>
                            )}
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {perms.length === 0
                                ? t("noPermissions")
                                : `${perms.length} ${t("permissions")}`}
                            </p>
                          </div>
                        ) : // Employee row: show admin info card
                        adminRow ? (
                          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 max-w-[180px]">
                            <AvatarSmall name={adminRow.firstName} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-blue-800">
                                {adminRow.firstName} {adminRow.lastName}
                              </p>
                              {workspaceLabel && (
                                <p className="truncate text-[10px] text-blue-500">
                                  {workspaceLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : workspaceLabel ? (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-slate-300" />
                            <span className="text-xs text-slate-500">
                              {workspaceLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {t("myWorkspace")}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Permissions */}
                    <td className="px-4 py-3.5 max-w-[260px]">
                      {row.roleId === USER_ROLES.SUPER_ADMIN ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                          Full Access
                        </span>
                      ) : perms.length > 0 ? (
                        <PermsBadges
                          perms={perms}
                          variant={
                            row.roleId === USER_ROLES.VENDOR
                              ? "compact"
                              : "default"
                          }
                        />
                      ) : (
                        <span className="text-[11px] italic text-slate-300">
                          {t("noPermissions")}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Actions */}
                    {canManageUsers && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => openEdit(row)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 transition-colors"
                          >
                            {tc("edit")}
                          </button>
                          {canManage && row.status === 1 && !isCurrentUser && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => banUser(row.id)}
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition-colors"
                            >
                              {t("statusBanned")}
                            </button>
                          )}
                          {canManage && row.status === 6 && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => unbanUser(row.id)}
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                            >
                              {t("statusActive")}
                            </button>
                          )}
                          {canManage && !isCurrentUser && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteUser(row.id)}
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                            >
                              {busy ? "…" : tc("delete")}
                            </button>
                          )}
                          {/* Login as Employee — only for vendor admins managing active employees */}
                          {isVendorAdmin &&
                            canManage &&
                            row.roleId === USER_ROLES.VENDOR_USER &&
                            row.status === 1 &&
                            !isCurrentUser && (
                              <button
                                type="button"
                                disabled={impersonatingId === row.id}
                                onClick={() => loginAsEmployee(row.id)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-40 transition-colors flex items-center gap-1"
                              >
                                {impersonatingId === row.id ? (
                                  <>
                                    <svg
                                      className="animate-spin h-3 w-3"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                      />
                                    </svg>
                                    …
                                  </>
                                ) : (
                                  <>
                                    <span>👤</span>
                                    {t("loginAsEmployee")}
                                  </>
                                )}
                              </button>
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission inheritance legend */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
            🔗 {t("permissions")}
          </h3>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>
              • <strong>Employee permissions ⊆ Admin permissions</strong> —
              employees can only have permissions their admin has.
            </li>
            <li>
              • <strong>Automatic cascade</strong> — if you reduce an admin's
              permissions, those permissions are <em>instantly revoked</em> from
              all their employees.
            </li>
            <li>
              • <strong>Locked checkboxes 🔒</strong> — when editing an
              employee, permissions the admin doesn't have are shown locked.
            </li>
            <li>
              • <strong>Plan-locked checkboxes 📋</strong> — permissions
              disabled by the vendor's subscription plan cannot be assigned to
              any user.
            </li>
          </ul>
        </div>
      )}

      {/* Modals */}
      {mounted && showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            void fetchUsers();
            void fetchVendors();
          }}
          sessionVendorId={sessionVendorId}
          isSuperAdmin={isSuperAdmin}
          vendors={vendors}
          adminPermsMap={adminPermsMap}
        />
      )}
      {mounted && editing && (
        <EditModal
          initial={editing}
          isSuperAdmin={isSuperAdmin}
          sessionUserId={sessionUserId}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            void fetchUsers();
          }}
        />
      )}
    </div>
  );
}
