import { Activity, BadgeCheck, Cpu, Microscope, ScanLine } from "lucide-react";
import { EQUIPMENT } from "@/features/landing/landingData";

const CATEGORY_STYLES = {
  Imaging: "bg-sky-50 text-sky-700 ring-sky-100",
  Surgery: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Oncology: "bg-rose-50 text-rose-700 ring-rose-100",
  Radiation: "bg-amber-50 text-amber-700 ring-amber-100",
};

const CATEGORY_ICONS = {
  Imaging: ScanLine,
  Surgery: Cpu,
  Oncology: Microscope,
  Radiation: Activity,
};

export default function EquipmentSection() {
  return (
    <section id="equipment" className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.4fr] lg:px-8">
        <div className="landing-reveal">
          <p className="text-sm font-semibold text-blue-600">Technology</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-cyan-950 sm:text-4xl">
            Equipment selected for precision and speed.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-cyan-800/75">
            High-value diagnostic and surgical systems support the care teams
            across imaging, oncology, surgery, and radiation therapy.
          </p>

          <div className="mt-8 rounded-md border border-cyan-100 bg-cyan-50/70 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-600 text-white">
                <BadgeCheck className="size-4" />
              </span>
              <div>
                <p className="text-3xl font-semibold leading-none text-cyan-950">{EQUIPMENT.length}</p>
                <p className="mt-1 text-xs font-semibold text-blue-600">Advanced systems listed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-reveal landing-delay-2 overflow-hidden rounded-md border border-cyan-100 bg-white shadow-sm shadow-cyan-950/[0.04]">
          {EQUIPMENT.map((item, index) => (
            <EquipmentRow key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EquipmentRow({ item, index }) {
  const Icon = CATEGORY_ICONS[item.category] ?? Activity;
  const categoryStyle = CATEGORY_STYLES[item.category] ?? "bg-cyan-50 text-cyan-700 ring-cyan-100";

  return (
    <div className="grid gap-4 border-b border-cyan-100 p-5 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-cyan-950">{item.name}</h3>
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${categoryStyle}`}>
            <Icon className="size-3.5" />
            {item.category}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-cyan-800/75">{item.detail}</p>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-xs font-semibold text-blue-600">In service</p>
        <p className="mt-1 text-sm font-semibold text-cyan-950">{item.year}</p>
      </div>
    </div>
  );
}
