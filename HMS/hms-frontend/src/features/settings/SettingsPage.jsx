import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  ImagePlus,
  Globe2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchSettingsUntilKeys,
  getApiErrorMessage,
  updateSetting,
  uploadLogoSetting,
} from "@/features/settings/api/settingsApi";
import { getPagedItems } from "@/lib/pagination.jsx";

const SETTING_SECTIONS = [
  {
    id: "general",
    title: "General",
    subtitle: "Manage hospital-wide configuration",
    icon: Building2,
    keys: [
      "hospital.name",
      "hospital.logoUrl",
      "hospital.email",
      "hospital.phone",
      "hospital.address",
      "hospital.emergencyPhone",
      "hospital.workingHours",
    ],
  },
  {
    id: "website",
    title: "Website Content",
    subtitle: "Manage public landing page copy",
    icon: Globe2,
    keys: [
      "landing.heroTitle",
      "landing.heroSubtitle",
      "landing.aboutText",
      "landing.emergencyContactText",
      "landing.footerText",
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Control patient and staff notifications",
    icon: Bell,
    keys: [
      "notifications.emailEnabled",
      "notifications.smsEnabled",
      "notifications.systemAlertsEnabled",
      "pharmacy.lowStockAlertsEnabled",
    ],
  },
  {
    id: "security",
    title: "Security",
    subtitle: "Configure session and access behavior",
    icon: ShieldCheck,
    keys: ["security.sessionTimeoutMinutes"],
  },
  {
    id: "appointments",
    title: "Appointments",
    subtitle: "Set scheduling defaults and request access",
    icon: CalendarDays,
    keys: ["appointments.defaultDurationMinutes", "appointments.allowOnlineRequests"],
  },
  {
    id: "billing",
    title: "Billing",
    subtitle: "Manage invoice and payment defaults",
    icon: CreditCard,
    keys: ["billing.currency"],
  },
  {
    id: "system",
    title: "System",
    subtitle: "Adjust platform-level operating settings",
    icon: Settings,
    keys: ["system.maintenanceMode", "system.auditRetentionDays"],
  },
];

const SETTING_META = {
  "hospital.name": {
    label: "Hospital name",
    description: "Shown across the portal and public-facing pages.",
    type: "text",
  },
  "hospital.logoUrl": {
    label: "Hospital logo URL",
    description: "Logo shown on public pages and supported print views.",
    type: "image",
  },
  "hospital.email": {
    label: "Hospital email",
    description: "Primary address used for hospital communication.",
    type: "text",
    inputType: "email",
  },
  "hospital.phone": {
    label: "Hospital phone",
    description: "Primary hospital contact phone number.",
    type: "text",
    inputType: "tel",
  },
  "hospital.address": {
    label: "Hospital address",
    description: "Primary hospital address.",
    type: "textarea",
  },
  "hospital.emergencyPhone": {
    label: "Emergency phone",
    description: "Public emergency contact phone number.",
    type: "text",
    inputType: "tel",
  },
  "hospital.workingHours": {
    label: "Working hours",
    description: "Public working hours summary.",
    type: "textarea",
  },
  "landing.heroTitle": {
    label: "Hero title",
    description: "Main headline on the public landing page.",
    type: "textarea",
  },
  "landing.heroSubtitle": {
    label: "Hero description",
    description: "Supporting copy under the public landing page headline.",
    type: "textarea",
  },
  "landing.aboutText": {
    label: "About text",
    description: "Copy shown in the public website services section.",
    type: "textarea",
  },
  "landing.emergencyContactText": {
    label: "Emergency contact text",
    description: "Short label shown beside the emergency number.",
    type: "text",
  },
  "landing.footerText": {
    label: "Footer text",
    description: "Small public website footer notice.",
    type: "text",
  },
  "notifications.emailEnabled": {
    label: "Email notifications",
    description: "Send patient and staff updates by email.",
    type: "boolean",
  },
  "notifications.smsEnabled": {
    label: "SMS notifications",
    description: "Send operational updates by text message.",
    type: "boolean",
  },
  "notifications.systemAlertsEnabled": {
    label: "System alerts",
    description: "Notify admins about important platform events.",
    type: "boolean",
  },
  "pharmacy.lowStockAlertsEnabled": {
    label: "Pharmacy low-stock alerts",
    description: "Warn pharmacy staff when stock falls below threshold.",
    type: "boolean",
  },
  "appointments.defaultDurationMinutes": {
    label: "Default appointment duration",
    description: "Default length used when scheduling appointments.",
    type: "number",
    min: 5,
    step: 5,
    suffix: "minutes",
  },
  "appointments.allowOnlineRequests": {
    label: "Online appointment requests",
    description: "Allow patients to submit appointment requests from the portal.",
    type: "boolean",
  },
  "security.sessionTimeoutMinutes": {
    label: "Session timeout",
    description: "Automatically sign out inactive users after this time.",
    type: "number",
    min: 5,
    step: 5,
    suffix: "minutes",
  },
  "billing.currency": {
    label: "Billing currency",
    description: "Default currency used for invoices and payments.",
    type: "select",
    options: ["USD", "EUR", "GBP", "HUF"],
  },
  "system.maintenanceMode": {
    label: "Maintenance mode",
    description: "Restrict normal portal use during maintenance windows.",
    type: "boolean",
  },
  "system.auditRetentionDays": {
    label: "Audit retention",
    description: "How long audit logs remain available.",
    type: "number",
    min: 30,
    step: 30,
    suffix: "days",
  },
};

const PREDEFINED_SETTING_KEYS = SETTING_SECTIONS.flatMap((section) => section.keys);

function normalizeBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function controlValue(setting, draftValues) {
  return draftValues[setting.key] ?? setting.value ?? "";
}

function isDirty(setting, draftValues) {
  return Object.prototype.hasOwnProperty.call(draftValues, setting.key)
    && String(draftValues[setting.key]) !== String(setting.value ?? "");
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [draftValues, setDraftValues] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSettingsUntilKeys(PREDEFINED_SETTING_KEYS, {
        page: 1,
        pageSize: 100,
      });
      setItems(getPagedItems(data));
      setDraftValues({});
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const settingsByKey = useMemo(() => {
    return new Map(items.map((item) => [item.key, item]));
  }, [items]);

  const visibleSections = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return SETTING_SECTIONS.map((section) => {
      const sectionSettings = section.keys
        .map((key) => settingsByKey.get(key))
        .filter(Boolean)
        .filter((setting) => {
          if (!needle) return true;
          const meta = SETTING_META[setting.key];
          return [
            setting.key,
            setting.value,
            setting.description,
            meta?.label,
            meta?.description,
            section.title,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle));
        });

      return {
        ...section,
        settings: sectionSettings,
      };
    }).filter((section) => section.settings.length > 0);
  }, [search, settingsByKey]);

  const missingPredefinedCount = useMemo(() => {
    return PREDEFINED_SETTING_KEYS.filter((key) => !settingsByKey.has(key)).length;
  }, [settingsByKey]);

  useEffect(() => {
    if (!loading && !search.trim() && missingPredefinedCount > 0) {
      showToast(
        `${missingPredefinedCount} predefined setting${missingPredefinedCount === 1 ? "" : "s"} are missing. Restart the API to run the settings seeder.`,
        "warning"
      );
    }
  }, [loading, missingPredefinedCount, search, showToast]);

  const dirtySettings = useMemo(() => {
    return items.filter((item) => isDirty(item, draftValues));
  }, [draftValues, items]);

  function updateDraft(key, value) {
    setDraftValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function cancelChanges() {
    setDraftValues({});
  }

  async function saveChanges() {
    if (saving || dirtySettings.length === 0) return;

    const invalid = dirtySettings.find((setting) => {
      const value = String(draftValues[setting.key] ?? "").trim();
      return !value;
    });

    if (invalid) {
      showToast("Value is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const updatedSettings = await Promise.all(
        dirtySettings.map((setting) =>
          updateSetting(setting.id, {
            key: setting.key,
            value: String(draftValues[setting.key] ?? "").trim(),
            description: setting.description,
          })
        )
      );
      const updatedById = new Map(updatedSettings.map((setting) => [setting.id, setting]));

      setItems((previous) =>
        previous.map((item) => updatedById.get(item.id) ?? item)
      );
      setDraftValues({});
      showToast(
        dirtySettings.length === 1
          ? "Setting saved."
          : `${dirtySettings.length} settings saved.`
      );
      await queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file) {
    if (!file || uploadingLogo) return;

    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file for the logo.", "error");
      return;
    }

    setUploadingLogo(true);
    try {
      const updatedSetting = await uploadLogoSetting(file);
      setItems((previous) =>
        previous.map((item) =>
          item.key === updatedSetting.key || item.id === updatedSetting.id
            ? updatedSetting
            : item
        )
      );
      setDraftValues((previous) => {
        const next = { ...previous };
        delete next[updatedSetting.key];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      showToast("Logo uploaded.");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage predefined system configuration values
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <span className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
              <Search className="size-4 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Setting, section, or value"
                className="h-full min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <button
            type="button"
            onClick={() => setSearch("")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Clear
          </button>
        </div>
      </section>

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto pb-20">
        {loading ? (
          <SettingsSkeleton />
        ) : visibleSections.length === 0 ? (
          <EmptySettingsState search={search} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleSections.map((section) => (
              section.id === "general" ? (
                <HospitalInformationCard
                  key={section.id}
                  section={section}
                  draftValues={draftValues}
                  saving={saving}
                  uploadingLogo={uploadingLogo}
                  onChange={updateDraft}
                  onUploadLogo={uploadLogo}
                />
              ) : (
                <SettingsSectionCard
                  key={section.id}
                  section={section}
                  draftValues={draftValues}
                  saving={saving}
                  uploadingLogo={uploadingLogo}
                  onChange={updateDraft}
                  onUploadLogo={uploadLogo}
                />
              )
            ))}
          </div>
        )}
      </div>

      {dirtySettings.length > 0 && (
        <div className="sticky bottom-0 z-20 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                You have unsaved changes
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {dirtySettings.length} setting{dirtySettings.length === 1 ? "" : "s"} changed
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelChanges}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveChanges()}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
              >
                <Save className="size-4" aria-hidden />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HospitalInformationCard({
  section,
  draftValues,
  saving,
  uploadingLogo,
  onChange,
  onUploadLogo,
}) {
  const Icon = section.icon;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-2">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Hospital Information
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Basic public hospital details used across the portal.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {section.settings.length} settings
        </span>
      </div>

      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {section.settings.map((setting) => (
            <HospitalFormField
              key={setting.key}
              setting={setting}
              draftValues={draftValues}
              disabled={saving || uploadingLogo}
              onChange={onChange}
              onUploadLogo={onUploadLogo}
              className={SETTING_META[setting.key]?.type === "textarea" ? "md:col-span-2" : ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HospitalFormField({
  setting,
  draftValues,
  disabled,
  onChange,
  onUploadLogo,
  className = "",
}) {
  const meta = SETTING_META[setting.key] ?? {
    label: setting.key,
    description: setting.description,
    type: "text",
  };

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">
        {meta.label}
      </span>
      <SettingInput
        setting={setting}
        meta={meta}
        value={controlValue(setting, draftValues)}
        disabled={disabled}
        onChange={onChange}
        onUploadLogo={onUploadLogo}
        variant="form"
      />
    </label>
  );
}

function SettingsSectionCard({
  section,
  draftValues,
  saving,
  uploadingLogo,
  onChange,
  onUploadLogo,
}) {
  const Icon = section.icon;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              {section.title} Settings
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{section.subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {section.settings.length} settings
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {section.settings.map((setting) => (
          <SettingControlRow
            key={setting.key}
            setting={setting}
            draftValues={draftValues}
            disabled={saving || uploadingLogo}
            onChange={onChange}
            onUploadLogo={onUploadLogo}
          />
        ))}
      </div>
    </section>
  );
}

function SettingControlRow({
  setting,
  draftValues,
  disabled,
  onChange,
  onUploadLogo,
}) {
  const meta = SETTING_META[setting.key] ?? {
    label: setting.key,
    description: setting.description,
    type: "text",
  };
  const value = controlValue(setting, draftValues);

  return (
    <div className="grid gap-3 px-4 py-3.5 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-center">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-slate-900">{meta.label}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          {meta.description || setting.description || setting.key}
        </p>
      </div>

      <div className="flex min-w-0 items-center justify-start lg:justify-end">
        <SettingInput
          setting={setting}
          meta={meta}
          value={value}
          disabled={disabled}
          onChange={onChange}
          onUploadLogo={onUploadLogo}
        />
      </div>
    </div>
  );
}

function SettingInput({ setting, meta, value, disabled, onChange, onUploadLogo, variant = "row" }) {
  const isForm = variant === "form";

  if (meta.type === "image") {
    const inputId = `setting-file-${setting.key.replaceAll(".", "-")}`;
    const handleFiles = (files) => {
      const file = files?.[0];
      if (file) void onUploadLogo?.(file);
    };

    return (
      <div className="w-full min-w-0">
        <label
          htmlFor={inputId}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!disabled) handleFiles(event.dataTransfer.files);
          }}
          className={[
            "flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm transition hover:border-sky-300 hover:bg-sky-50/60",
            disabled ? "pointer-events-none opacity-60" : "",
            isForm ? "" : "lg:w-80",
          ].join(" ")}
        >
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
            {value ? (
              <img src={value} alt="" className="size-full object-contain" />
            ) : (
              <ImagePlus className="size-5 text-slate-400" aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-slate-900">Upload logo</span>
            <span className="mt-1 block text-slate-500">Drop an image here or choose a file.</span>
            <span className="mt-2 block truncate text-xs font-medium text-slate-400">
              PNG, JPG, WebP, or GIF up to 2 MB
            </span>
          </span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    );
  }

  if (meta.type === "boolean") {
    const checked = normalizeBoolean(value);
    return (
      <button
        type="button"
        onClick={() => onChange(setting.key, checked ? "false" : "true")}
        disabled={disabled}
        className={[
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:opacity-60",
          checked
            ? "border-sky-600 bg-sky-600"
            : "border-slate-200 bg-slate-200",
        ].join(" ")}
        aria-pressed={checked}
        aria-label={meta.label}
      >
        <span
          className={[
            "inline-block size-5 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    );
  }

  if (meta.type === "select") {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(setting.key, event.target.value)}
        className={[
          "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60",
          isForm ? "" : "lg:w-56",
        ].join(" ")}
      >
        {meta.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (meta.type === "number") {
    return (
      <div className="flex w-full items-center gap-2 lg:w-auto">
        <input
          type="number"
          value={value}
          min={meta.min}
          step={meta.step}
          disabled={disabled}
          onChange={(event) => onChange(setting.key, event.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60 lg:w-28"
        />
        {meta.suffix && <span className="text-sm text-slate-500">{meta.suffix}</span>}
      </div>
    );
  }

  if (meta.type === "textarea") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        rows={2}
        onChange={(event) => onChange(setting.key, event.target.value)}
        className={[
          "min-h-16 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60",
          isForm ? "" : "lg:w-80",
        ].join(" ")}
      />
    );
  }

  return (
    <input
      type={meta.inputType ?? "text"}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(setting.key, event.target.value)}
      className={[
        "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60",
        isForm ? "" : "lg:w-80",
      ].join(" ")}
    />
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, sectionIndex) => (
        <section
          key={sectionIndex}
          className="rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="size-9 animate-pulse rounded-lg bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 2 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] lg:items-center"
              >
                <div className="space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EmptySettingsState({ search }) {
  return (
    <section className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div>
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <Settings className="size-6" aria-hidden />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">No settings found.</p>
        <p className="mt-1 text-sm text-slate-500">
          {search
            ? "No predefined settings match the current search."
            : "No predefined settings are available yet."}
        </p>
      </div>
    </section>
  );
}
