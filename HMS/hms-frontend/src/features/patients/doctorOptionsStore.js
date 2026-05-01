import { create } from "zustand";
import { fetchDoctorsList, getApiErrorMessage } from "@/features/patients/patientsApi";

/**
 * @typedef {{
 *  id: number,
 *  fullName: string,
 *  specializationName?: string | null,
 *  departmentName?: string | null
 * }} DoctorItem
 */

/**
 * Normalizes `GET /api/doctors` response for selects.
 * @param {unknown} data
 * @returns {DoctorItem[]}
 */
function normalizeDoctorsResponse(data) {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray(data.items)
      ? data.items
      : [];
  /** @type {DoctorItem[]} */
  const out = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const id = Number(d.id ?? d.doctorProfileId);
    if (!Number.isFinite(id)) continue;
    const fullName =
      (typeof d.fullName === "string" ? d.fullName.trim() : "") ||
      [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
      `Doctor #${id}`;
    out.push({
      id,
      fullName,
      specializationName:
        typeof d.specializationName === "string" ? d.specializationName : null,
      departmentName:
        typeof d.departmentName === "string" ? d.departmentName : null,
    });
  }
  return out;
}

/**
 * @returns {Promise<{ items: DoctorItem[], error: string | null }>}
 */
export async function loadDoctorListForForm() {
  try {
    const data = await fetchDoctorsList();
    return { items: normalizeDoctorsResponse(data), error: null };
  } catch (e) {
    return { items: [], error: getApiErrorMessage(e) };
  }
}

let inFlight = null;

export const useDoctorOptionsStore = create((set, get) => ({
  /** @type {DoctorItem[]} */
  items: [],
  status: "idle",
  error: null,

  load: async () => {
    if (get().status === "ready" && get().items.length > 0) return;
    if (inFlight) {
      await inFlight;
      return;
    }
    set({ status: "loading", error: null });
    inFlight = (async () => {
      try {
        const { items, error } = await loadDoctorListForForm();
        if (error) {
          set({ items: [], status: "error", error });
        } else {
          set({ items, status: "ready", error: null });
        }
      } catch (e) {
        set({ items: [], status: "error", error: String(e?.message ?? e) });
      } finally {
        inFlight = null;
      }
    })();
    await inFlight;
  },
}));
