import { CLINICS } from "@/features/landing/landingData";

export default function ClinicsSection() {
  return (
    <section id="clinics" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-500">Departments</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Our Clinics</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Specialized departments staffed by board-certified physicians, equipped with the latest diagnostic and therapeutic technology.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLINICS.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ClinicCard({ clinic }) {
  return (
    <div className="group flex gap-4 rounded-xl bg-white p-6 transition hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-lg text-sky-600">
        {clinic.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{clinic.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{clinic.description}</p>
        <p className="mt-2 text-xs font-medium text-sky-600">{clinic.patients} patients served</p>
      </div>
    </div>
  );
}