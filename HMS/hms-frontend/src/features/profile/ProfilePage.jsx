import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseMedical,
  CalendarDays,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchUserProfile,
  getApiErrorMessage,
  updateUserProfile,
} from "@/features/profile/profileApi";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function formatDate(value, withTime = false) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function initials(value) {
  return String(value || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function hasValue(value) {
  return value != null && String(value).trim() !== "";
}

function valueOrDash(value) {
  return hasValue(value) ? value : "Not provided";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setForm({ name: data?.name || "", password: "" });
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      if (silent) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const profileName = profile?.name || "";
  const trimmedName = form.name.trim();
  const trimmedPassword = form.password.trim();
  const passwordError =
    trimmedPassword && trimmedPassword.length < 8
      ? "Password must be at least 8 characters."
      : null;
  const hasNameChange = trimmedName !== profileName;
  const hasPasswordChange = trimmedPassword.length > 0;
  const canSave = !saving && !passwordError && (hasNameChange || hasPasswordChange);

  const contacts = useMemo(
    () => (Array.isArray(profile?.contacts) ? profile.contacts : []),
    [profile]
  );

  const identityItems = useMemo(
    () => [
      { icon: IdCard, label: "Personal number", value: profile?.personalNumber },
      { icon: CalendarDays, label: "Date of birth", value: formatDate(profile?.dateOfBirth) },
      { icon: BadgeCheck, label: "Gender", value: profile?.gender },
      { icon: Phone, label: "Phone", value: profile?.phoneNumber },
      { icon: MapPin, label: "Address", value: profile?.fullAddress, wide: true },
      {
        icon: CalendarDays,
        label: "Last login",
        value: formatDate(profile?.lastLoginAt, true),
      },
    ],
    [profile]
  );

  const patientItems = useMemo(
    () => [
      { icon: IdCard, label: "Patient number", value: profile?.patientId },
      { icon: BriefcaseMedical, label: "Insurance", value: profile?.insuranceNumber },
      { icon: BadgeCheck, label: "Blood type", value: profile?.bloodType },
      { icon: Stethoscope, label: "Primary doctor", value: profile?.primaryDoctor },
    ],
    [profile]
  );

  const staffItems = useMemo(
    () => [
      { icon: IdCard, label: "Staff number", value: profile?.staffNumber },
      { icon: MapPin, label: "Department", value: profile?.department },
      { icon: BadgeCheck, label: "Employment", value: profile?.employmentStatus },
      { icon: IdCard, label: "License", value: profile?.licenseNumber },
      { icon: Stethoscope, label: "Specialization", value: profile?.specialization, wide: true },
    ],
    [profile]
  );

  const visiblePatientItems = patientItems.filter((item) => hasValue(item.value));
  const visibleStaffItems = staffItems.filter((item) => hasValue(item.value));
  const completeness = [
    { label: "Identity", done: hasValue(profile?.name) && hasValue(profile?.email) },
    { label: "Contact", done: hasValue(profile?.phoneNumber) || hasValue(profile?.fullAddress) },
    { label: "Role data", done: visiblePatientItems.length > 0 || visibleStaffItems.length > 0 },
  ];

  async function handleSave(event) {
    event.preventDefault();

    if (!canSave) return;

    const payload = {};
    if (hasNameChange) payload.name = trimmedName;
    if (hasPasswordChange) payload.password = trimmedPassword;

    setSaving(true);
    try {
      const updated = await updateUserProfile(payload);
      setProfile(updated);
      setForm({ name: updated?.name || "", password: "" });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Unable to load profile.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <RefreshCw className="size-4" aria-hidden />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-5 py-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-lg bg-sky-600 text-xl font-semibold text-white shadow-sm">
                {initials(profile?.name || profile?.email)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-slate-950">
                    {valueOrDash(profile?.name)}
                  </h2>
                  {profile?.role && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {profile.role}
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="size-4" aria-hidden />
                  {valueOrDash(profile?.email)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadProfile({ silent: true })}
                disabled={refreshing}
                className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh
              </button>
            </div>
          </div>

          <InfoGrid items={identityItems} />
        </section>

        {visiblePatientItems.length > 0 && (
          <ProfileSection icon={UserRound} title="Patient Profile">
            <InfoGrid items={visiblePatientItems} compact />
          </ProfileSection>
        )}

        {visibleStaffItems.length > 0 && (
          <ProfileSection icon={BriefcaseMedical} title="Staff Profile">
            <InfoGrid items={visibleStaffItems} compact />
          </ProfileSection>
        )}

        {contacts.length > 0 && (
          <ProfileSection icon={UsersRound} title="Emergency Contacts">
            <div className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <div
                  key={`${contact.name}-${contact.phone}`}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{contact.name}</p>
                      {contact.isPrimary && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{contact.relationship}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold text-slate-800">{contact.phone}</p>
                    {contact.email && <p className="mt-1 text-slate-500">{contact.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>
        )}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-0 xl:self-start">
        <form
          onSubmit={handleSave}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <SectionTitle icon={KeyRound} title="Account Settings" />
          <p className="mt-2 text-sm text-slate-500">
            Update your display name or set a new password.
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={labelClass}>Display name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={saving}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>New password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                disabled={saving}
                placeholder="Leave blank to keep current"
                className={`${inputClass} mt-1.5 ${passwordError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : ""}`}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{passwordError}</p>
              )}
            </label>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="size-4" aria-hidden />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle icon={ShieldCheck} title="Profile Checks" />
          <div className="mt-4 space-y-3">
            {completeness.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                    item.done
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-slate-50 text-slate-500 ring-slate-200",
                  ].join(" ")}
                >
                  {item.done ? "Ready" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function ProfileSection({ icon, title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={icon} title={title} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SectionTitle({ icon, title }) {
  const IconComponent = icon;

  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
        <IconComponent className="size-4" aria-hidden />
      </span>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

function InfoGrid({ items, compact = false }) {
  return (
    <dl className={compact ? "grid gap-4 md:grid-cols-2" : "grid gap-4 p-5 md:grid-cols-2"}>
      {items.map((item) => (
        <InfoItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          value={item.value}
          wide={item.wide}
        />
      ))}
    </dl>
  );
}

function InfoItem({ icon, label, value, wide }) {
  const IconComponent = icon;

  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <IconComponent className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">
        {valueOrDash(value)}
      </dd>
    </div>
  );
}
