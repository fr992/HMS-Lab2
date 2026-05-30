import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  AlertCircle,
  AtSign,
  BadgeCheck,
  BriefcaseMedical,
  CalendarDays,
  Eye,
  EyeOff,
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
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function formatDate(value, withTime = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
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

function displayValue(value) {
  return hasValue(value) ? value : null;
}

function hasAnyValue(items) {
  return items.some((item) => hasValue(item.value));
}

export default function ProfilePage() {
  const auth = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

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
  const profileEmail = profile?.email || auth.userEmail || "";
  const profileUsername = auth.userName || profileEmail || "";
  const accountStatus = profile?.employmentStatus || "Active";
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
      { icon: UserRound, label: "Full name", value: profile?.name },
      { icon: IdCard, label: "Personal number", value: profile?.personalNumber },
      { icon: CalendarDays, label: "Date of birth", value: formatDate(profile?.dateOfBirth) },
      { icon: BadgeCheck, label: "Gender", value: profile?.gender },
    ],
    [profile]
  );

  const contactItems = useMemo(
    () => [
      { icon: Mail, label: "Email", value: profileEmail },
      { icon: Phone, label: "Phone", value: profile?.phoneNumber },
      { icon: MapPin, label: "Address", value: profile?.fullAddress, wide: true },
    ],
    [profile, profileEmail]
  );

  const accountItems = useMemo(
    () => [
      { icon: AtSign, label: "Username", value: profileUsername },
      { icon: ShieldCheck, label: "Assigned roles", value: profile?.role },
      { icon: BadgeCheck, label: "Account status", value: accountStatus },
    ],
    [profile, profileUsername, accountStatus]
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

  const hasPatientProfile = hasAnyValue(patientItems);
  const hasStaffProfile = hasAnyValue(staffItems);
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
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
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
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-sky-600 text-2xl font-bold text-white shadow-sm">
              {initials(profile?.name || profileEmail)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold leading-tight text-slate-950">
                {displayValue(profile?.name) || "Unnamed profile"}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {displayValue(profile?.role) || "Role unavailable"}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                <span className="truncate">{displayValue(profileEmail) || "Email unavailable"}</span>
                <span className="text-slate-300" aria-hidden>|</span>
                <span className="truncate">{displayValue(profileUsername) || "Username unavailable"}</span>
                <span className="text-slate-300" aria-hidden>|</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                  {displayValue(accountStatus) || "Status unavailable"}
                </span>
                <span className="text-slate-300" aria-hidden>|</span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-slate-400" aria-hidden />
                  Last login: {displayValue(formatDate(profile?.lastLoginAt, true)) || "Not provided"}
                </span>
              </div>
            </div>
          </div>
            <button
              type="button"
              onClick={() => void loadProfile({ silent: true })}
              disabled={refreshing}
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InformationCard icon={UserRound} title="Personal Information" items={identityItems} />
        <InformationCard icon={Phone} title="Contact Information" items={contactItems} />
        <InformationCard icon={ShieldCheck} title="Role & Account Information" items={accountItems} />
        {hasPatientProfile && (
          <ProfileSection icon={UserRound} title="Patient Profile">
            <InfoGrid items={patientItems} compact />
          </ProfileSection>
        )}
        {hasStaffProfile && (
          <ProfileSection icon={BriefcaseMedical} title="Employment Information">
            <InfoGrid items={staffItems} compact />
          </ProfileSection>
        )}
      </section>

      {contacts.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ProfileSection icon={UsersRound} title="Emergency Contacts">
            <div className="divide-y divide-slate-100">
              {contacts.map((contact, index) => (
                <div
                  key={`${contact.name || "contact"}-${contact.phone || index}`}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">
                        {displayValue(contact.name) || "Not provided"}
                      </p>
                      {contact.isPrimary && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {displayValue(contact.relationship) || "Relationship not provided"}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold text-slate-800">
                      {displayValue(contact.phone) || "Phone not provided"}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {displayValue(contact.email) || "Email not provided"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>
        </section>
      )}

      <section>
        <form
          id="account-settings"
          onSubmit={handleSave}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <SectionTitle icon={KeyRound} title="Account Settings" />
          <p className="mt-2 text-sm text-slate-500">
            Update your display name or set a new password.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
              <span className="relative mt-1.5 block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  disabled={saving}
                  placeholder="Leave blank to keep current"
                  className={`${inputClass} pr-11 ${
                    passwordError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </span>
              {passwordError && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{passwordError}</p>
              )}
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Save className="size-4" aria-hidden />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function InformationCard({ icon, title, items }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={icon} title={title} />
      <div className="mt-4">
        <InfoGrid items={items} compact />
      </div>
    </section>
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
    <dl className={compact ? "grid gap-3" : "grid gap-4 p-5 md:grid-cols-2"}>
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
  const visibleValue = displayValue(value);

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 ${wide ? "md:col-span-2" : ""}`}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <IconComponent className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd
        className={[
          "mt-1 text-sm font-semibold",
          visibleValue ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {visibleValue || "Not provided"}
      </dd>
    </div>
  );
}
