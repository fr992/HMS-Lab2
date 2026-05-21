import { Edit3 } from "lucide-react";
import BedStatusBadge from "./BedStatusBadge";
import { bedLocation } from "./bedUtils";

export default function BedsTable({ beds, canUpdate, onEdit }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Beds</h2>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Floor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {beds.map((bed) => (
              <tr key={bed.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-950">{bedLocation(bed) || `Bed #${bed.id}`}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{bed.departmentName || "No department"}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{bed.floor || "-"}</td>
                <td className="px-4 py-3">
                  <BedStatusBadge status={bed.status} isActive={bed.isActive} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {bed.currentAssignment?.patientName || "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{bed.notes || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => onEdit(bed)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 className="size-3.5" aria-hidden />
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
