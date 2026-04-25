export function PatientTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            {["Patient", "ID", "Contact", "Status", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-4 py-3">
                <div className="h-4 w-32 rounded bg-slate-200" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 rounded bg-slate-200" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-40 rounded bg-slate-200" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-16 rounded bg-slate-200" />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="ml-auto h-8 w-8 rounded bg-slate-200" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
