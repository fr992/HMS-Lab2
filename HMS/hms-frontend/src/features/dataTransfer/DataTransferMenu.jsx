import { useRef, useState } from "react";
import { ChevronDown, Database, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportModule, getDataTransferError, importModule } from "@/features/dataTransfer/dataTransferApi";

const FORMATS = [
  { value: "csv", label: "CSV", detail: ".csv", Icon: FileText },
  { value: "excel", label: "Excel", detail: ".xlsx", Icon: FileSpreadsheet },
  { value: "json", label: "JSON", detail: ".json", Icon: FileJson },
];

function extensionFor(format) {
  return format === "excel" ? ".xlsx" : `.${format}`;
}

function MenuLabel({ children }) {
  return (
    <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

function MenuItem({ icon, label, detail, disabled, onSelect }) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-800 outline-none transition focus:bg-slate-100 data-disabled:pointer-events-none data-disabled:opacity-50"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span className="text-xs text-slate-400">{detail}</span>
    </DropdownMenuPrimitive.Item>
  );
}

export default function DataTransferMenu({
  endpoint,
  exportParams,
  canExport = true,
  canImport,
  onExportFormat,
  onImportFormat,
  onImported,
  label = "Data",
  align = "end",
  className,
}) {
  const fileInputRef = useRef(null);
  const pendingImportFormatRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState([]);

  async function handleExport(format) {
    if (busy || !canExport) return;
    setOpen(false);
    setBusy(`export-${format}`);
    try {
      if (onExportFormat) {
        await onExportFormat(format);
      } else {
        await exportModule(endpoint, format, exportParams);
      }
      const item = FORMATS.find((candidate) => candidate.value === format);
      toast.success(`${item?.label ?? "Data"} export started.`);
    } catch (error) {
      toast.error(getDataTransferError(error));
    } finally {
      setBusy("");
    }
  }

  function openImportPicker(format) {
    setOpen(false);
    pendingImportFormatRef.current = format;
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const format = pendingImportFormatRef.current;
    pendingImportFormatRef.current = null;
    if (!file || !format || busy) return;

    const extension = extensionFor(format);
    if (!file.name.toLowerCase().endsWith(extension)) {
      toast.error(`Select a ${extension} file.`);
      return;
    }

    setBusy(`import-${format}`);
    setErrors([]);
    try {
      const result = onImportFormat
        ? await onImportFormat(format, file)
        : await importModule(endpoint, format, file);
      setErrors(result.errors ?? []);
      toast.success(`Imported ${result.imported} rows.`);
      await onImported?.(result);
    } catch (error) {
      const data = error?.response?.data;
      setErrors(data?.errors ?? []);
      toast.error(getDataTransferError(error));
    } finally {
      setBusy("");
    }
  }

  const disabled = Boolean(busy);

  return (
    <div className={cn("space-y-2", className)}>
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled || (!canExport && !canImport)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 disabled:opacity-60 sm:w-auto"
            aria-label="Import and export data"
          >
            <Database className="size-4 text-slate-500" aria-hidden />
            <span>{busy ? "Working..." : label}</span>
            <ChevronDown className="size-4 text-slate-500" aria-hidden />
          </button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align={align}
            sideOffset={8}
            collisionPadding={12}
            className="z-50 w-56 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl shadow-slate-950/10 outline-none data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95"
          >
            <MenuLabel>Export</MenuLabel>
            {FORMATS.map(({ value, label: itemLabel, detail }) => (
              <MenuItem
                key={`export-${value}`}
                icon={<Download className="size-4 text-slate-500" aria-hidden />}
                label={itemLabel}
                detail={detail}
                disabled={!canExport || disabled}
                onSelect={() => void handleExport(value)}
              />
            ))}

            {canImport && (
              <>
                <DropdownMenuPrimitive.Separator className="my-1 h-px bg-slate-200" />

                <MenuLabel>Import</MenuLabel>
                {FORMATS.map(({ value, label: itemLabel, detail, Icon }) => (
                  <MenuItem
                    key={`import-${value}`}
                    icon={<Icon className="size-4 text-slate-500" aria-hidden />}
                    label={itemLabel}
                    detail={detail}
                    disabled={disabled}
                    onSelect={() => {
                      openImportPicker(value);
                    }}
                  />
                ))}
              </>
            )}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.json"
        onChange={(event) => void handleFileChange(event)}
        className="hidden"
      />

      {errors.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {errors.slice(0, 3).map((error) => (
            <p key={`${error.rowNumber}-${error.error}`}>
              Row {error.rowNumber}: {error.error}
            </p>
          ))}
          {errors.length > 3 && <p>{errors.length - 3} more row errors.</p>}
        </div>
      )}
    </div>
  );
}
