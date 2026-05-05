import { create } from "zustand";
import * as api from "./patientsApi";

export const usePatientsStore = create((set) => ({
  items: [],
  doctorGroups: { primaryPatients: [], interactedPatients: [] },
  listStatus: "idle",
  listError: null,
  lastActionError: null,
  lastActionSuccess: null,

  clearFeedback: () => set({ lastActionError: null, lastActionSuccess: null }),

  loadList: async (scope = "all") => {
    set({ listStatus: "loading", listError: null });
    try {
      if (scope === "doctor") {
        const grouped = await api.fetchDoctorPatientsGrouped();
        const primaryPatients = Array.isArray(grouped?.primaryPatients)
          ? grouped.primaryPatients
          : [];
        const interactedPatients = Array.isArray(grouped?.interactedPatients)
          ? grouped.interactedPatients
          : [];

        set({
          items: [...primaryPatients, ...interactedPatients],
          doctorGroups: { primaryPatients, interactedPatients },
          listStatus: "ready",
          listError: null,
        });
        return;
      }

      const items = await api.fetchPatients();
      set({
        items,
        doctorGroups: { primaryPatients: [], interactedPatients: [] },
        listStatus: "ready",
        listError: null,
      });
    } catch (e) {
      set({
        listStatus: "error",
        listError: api.getApiErrorMessage(e),
        items: [],
        doctorGroups: { primaryPatients: [], interactedPatients: [] },
      });
    }
  },

  createPatient: async (body) => {
    set({ lastActionError: null, lastActionSuccess: null });
    try {
      const created = await api.registerPatient(body);
      set((s) => ({
        items: [created, ...s.items],
        lastActionSuccess:
          created && !created.userId
            ? "Patient registered (no portal account)."
            : "Patient registered successfully.",
      }));
      return created;
    } catch (e) {
      set({ lastActionError: api.getApiErrorMessage(e) });
      return null;
    }
  },

  updatePatient: async (id, body) => {
    set({ lastActionError: null, lastActionSuccess: null });
    try {
      const updated = await api.updatePatient(id, body);
      set((s) => ({
        items: s.items.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        lastActionSuccess: "Patient updated successfully.",
      }));
      return updated;
    } catch (e) {
      set({ lastActionError: api.getApiErrorMessage(e) });
      return null;
    }
  },

  linkPortalAccount: async (id, body) => {
    set({ lastActionError: null, lastActionSuccess: null });
    try {
      const updated = await api.linkPatientPortal(id, body);
      set((s) => ({
        items: s.items.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        lastActionSuccess: "Portal access added. The patient can sign in with the new credentials.",
      }));
      return updated;
    } catch (e) {
      set({ lastActionError: api.getApiErrorMessage(e) });
      return null;
    }
  },

  removePatient: async (id) => {
    set({ lastActionError: null, lastActionSuccess: null });
    try {
      await api.deletePatient(id);
      set((s) => ({
        items: s.items.filter((p) => p.id !== id),
        lastActionSuccess: "Patient removed.",
      }));
      return true;
    } catch (e) {
      set({ lastActionError: api.getApiErrorMessage(e) });
      return false;
    }
  },

  patchInList: (id, partial) => {
    set((s) => ({
      items: s.items.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }));
  },
}));
