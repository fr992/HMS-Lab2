import { create } from "zustand";
import { fetchDoctorsList, getApiErrorMessage } from "@/patients/patientsApi";
/**
 * @typedef {{ id: number, fullName: string }} DoctorItem
 */

let inFlight = null;

export const useDoctorOptionsStore = create((set, get) => ({
  /** @type {DoctorItem[]} */
  items: [],
  status: "idle",
  error: null,

  load: async () => {
    if (get().status === "ready") return;
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
