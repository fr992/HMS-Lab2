import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EncountersListPage() {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get("/encounters");
        setEncounters(res.data);
      } catch (err) {
        console.error("Failed to load encounters", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Encounters</h1>

      {encounters.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No encounters found.
        </p>
      )}

      {encounters.map((e) => (
        <Card key={e.id}>
          <CardHeader>
            <CardTitle>
              {e.encounterNumber} — {e.patientName}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Doctor: {e.doctorName} | Status: {e.status}
            </div>

            <Link to={`/doctor/encounters/${e.id}`}>
              <Button size="sm">Open Panel</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}