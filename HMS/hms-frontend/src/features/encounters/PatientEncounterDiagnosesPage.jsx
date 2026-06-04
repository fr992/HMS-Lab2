import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DiagnosesSection from "./components/DiagnosesSection";
import PrescriptionsSection from "./components/PrescriptionsSection";
import { encountersApi } from "./api/encountersApi";

export default function PatientEncounterDiagnosesPage() {
  const { encounterId } = useParams();

  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await encountersApi.getPatientEncounterPanel(encounterId);
        setPanel(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load encounter data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [encounterId]);

  if (loading) return <div className="p-6">Loading encounter details...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!panel) return <div className="p-6">No encounter data found.</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">My Encounter Details</h1>
        <p className="text-sm text-muted-foreground">
          Diagnoses and prescriptions recorded during this visit.
        </p>
      </div>

      <DiagnosesSection
        encounterId={encounterId}
        diagnoses={panel.diagnoses}
        isOpen={false}
        saving={false}
      />

      <PrescriptionsSection prescriptions={panel.prescriptions} />
    </div>
  );
}
