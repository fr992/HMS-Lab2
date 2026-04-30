import { EQUIPMENT } from "@/features/landing/landingData";

const CATEGORY_STYLES = {
  Imaging: "bg-sky-50 text-sky-700",
  Surgery: "bg-violet-50 text-violet-700",
  Oncology: "bg-rose-50 text-rose-700",
  Radiation: "bg-amber-50 text-amber-700",
};

export default function EquipmentSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-24">
          <div className="max-w-sm shrink-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-500">Technology</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Advanced Equipment</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              We invest continuously in medical technology so our clinicians can diagnose faster and treat more precisely.
            </p>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {EQUIPMENT.map((item) => (
              <EquipmentRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EquipmentRow({ item }) {
  const categoryStyle = CATEGORY_STYLES[item.category] ?? "bg-slate-100 text-slate-600";
  return (
    <div className="flex items-start justify-between gap-4 py-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
        <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyle}`}>
          {item.category}
        </span>
        <span className="text-xs text-slate-400">Since {item.year}</span>
      </div>
    </div>
  );
}