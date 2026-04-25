import PatientActionsMenu from "./PatientActionsMenu";
import { useNavigate } from "react-router-dom";

/**
 * @param {object} props
 * @param {object[]} props.patients
 * @param {boolean} [props.canRegister]
 * @param {boolean} [props.canUpdate]
 * @param {boolean} [props.canDelete]
 * @param {(id: number) => void} [props.onDelete]
 * @param {(id: number) => void} [props.onOpenContacts]
 */
export default function PatientTable({
  patients,
  canUpdate,
  canDelete,
  onDelete,
  onOpenContacts,
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 sm:px-4">Patient</th>
            <th className="px-3 py-2 sm:px-4">Number</th>
            <th className="px-3 py-2 sm:px-4">Phone</th>
            <th className="px-3 py-2 sm:px-4">Account email</th>
            <th className="w-0 px-3 py-2 text-right sm:px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-800">
          {patients.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                <span className="font-medium">
                  {p.lastName}, {p.firstName}
                </span>
              </td>
              <td className="px-3 py-2.5 sm:px-4">{p.patientNumber}</td>
              <td className="max-w-[10rem] truncate px-3 py-2.5 sm:px-4">
                {p.phone || "—"}
              </td>
              <td className="max-w-[12rem] truncate px-3 py-2.5 text-slate-600 sm:px-4">
                {p.email || "—"}
              </td>
              <td className="pr-1 text-right sm:pr-2">
                <PatientActionsMenu
                  onView={() => navigate(`/patients/${p.id}`)}
                  onEdit={
                    canUpdate
                      ? () => navigate(`/patients/${p.id}/edit`)
                      : undefined
                  }
                  onDelete={canDelete ? () => onDelete(p.id) : undefined}
                  onModifyContact={
                    canUpdate && onOpenContacts
                      ? () => onOpenContacts(p.id)
                      : undefined
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
