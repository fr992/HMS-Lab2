import { statusMeta } from "./bedUtils";

export default function BedStatusBadge({ status, isActive }) {
  const meta = statusMeta(status, isActive);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.badge}`}>
      {meta.label}
    </span>
  );
}
