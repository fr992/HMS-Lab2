import { ClipboardList, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrescriptionsSection({ prescriptions }) {
  const prescriptionItems = Array.isArray(prescriptions) ? prescriptions : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescriptions</CardTitle>
        <p className="mt-1 text-sm text-slate-500">
          Medications prescribed during this encounter.
        </p>
      </CardHeader>
      <CardContent>
        {prescriptionItems.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <div>
              <ClipboardList className="mx-auto size-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-900">No prescriptions recorded</p>
              <p className="mt-1 text-sm text-slate-500">
                Prescriptions for this visit will appear here after your care team records them.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptionItems.map((prescription) => (
              <article key={prescription.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      Prescription #{prescription.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Doctor: {prescription.doctorName || "Unknown"}
                    </p>
                  </div>
                  {prescription.status && <Badge>{prescription.status}</Badge>}
                </div>

                {prescription.notes && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {prescription.notes}
                  </p>
                )}

                <div className="mt-3 grid gap-3">
                  {(prescription.items ?? []).map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
                          <Pill className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-950">
                            {item.medicationName || "Medication"}
                          </p>
                          <dl className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                            <Info label="Dosage" value={formatDosage(item)} />
                            <Info label="Frequency" value={item.frequency} />
                            <Info label="Duration" value={item.duration} />
                          </dl>
                          {item.instructions && (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {item.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{value || "-"}</dd>
    </div>
  );
}

function formatDosage(item) {
  return [item.dosage, item.unit].filter(Boolean).join(" ");
}
