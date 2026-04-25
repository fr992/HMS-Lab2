import { create } from "zustand";
import * as api from "./patientsApi";

export const usePatientsStore = create((set) => ({
  items: [],
  listStatus: "idle",
  listError: null,
  lastActionError: null,
  lastActionSuccess: null,

  clearFeedback: () => set({ lastActionError: null, lastActionSuccess: null }),

  loadList: async () => {
    set({ listStatus: "loading", listError: null });
    try {
      const items = await api.fetchPatients();
      set({ items, listStatus: "ready", listError: null });
    } catch (e) {
      set({
        listStatus: "error",
        listError: api.getApiErrorMessage(e),
        items: [],
      });
    }
  },

  createPatient: async (body) => {
    set({ lastActionError: null, lastActionSuccess: null });
    try {
      const created = await api.registerPatient(body);
      set((s) => ({
        items: [created, ...s.items],
        lastActionSuccess: "Patient registered successfully.",
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
