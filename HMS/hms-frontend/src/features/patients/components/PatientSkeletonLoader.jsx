const SKELETON_HEADERS = [
  "Patient #",
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "City",
  "Country",
  "Blood Type",
  "Primary Doctor",
  "Actions",
];

export function PatientTableSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="scrollbar-none h-full min-h-[12rem] overflow-x-auto overflow-y-auto">
          <table className="min-w-[70rem] w-full sm:min-w-[76rem]">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                {SKELETON_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-2 py-3 text-left text-xs font-medium uppercase text-slate-500 sm:px-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-20 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-40 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-12 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-20 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-20 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-10 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <div className="h-4 w-28 rounded bg-slate-200" />
                  </td>
                  <td className="px-2 py-3 pr-3 text-right sm:pr-4">
                    <div className="ml-auto h-8 w-8 rounded bg-slate-200" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
