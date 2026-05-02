import { create } from "zustand";
import { encountersApi } from "./api/encountersApi";

export const useEncounterPanelStore = create((set) => ({
    panel: null,
    loading: false, 
    error: "",

    loadPanel: async (encounterId) => {
  try {
    set({ loading: true, error: "" });

    const response = await encountersApi.getPanel(encounterId);

    set({
      panel: response.data,
      loading: false,
    });

    return response.data;
  } catch (err) {
    console.error(err);

    set({
      error: "Failed to load encounter panel.",
      loading: false,
    });

    throw err;
  }
},

createDiagnosis: async (encounterId, payload) => {
  try {
    set({ saving: true, error: "" });

    await encountersApi.createDiagnosis(encounterId, payload);

    const response = await encountersApi.getPanel(encounterId);

    set({
      panel: response.data,
      saving: false,
    });
  } catch (err) {
    console.error("Create diagnosis error:", err);

    set({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        `Failed to create diagnosis. Status: ${err?.response?.status}`,
      saving: false,
    });
  }
},

updateEncounter: async (encounterId, payload) => {
  try {
    set({ saving: true, error: "" });

    await encountersApi.updateEncounter(encounterId, payload);

    const response = await encountersApi.getPanel(encounterId);

    set({
      panel: response.data,
      saving: false,
    });
  } catch (err) {
    console.error("Update encounter error:", err);

    set({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        `Failed to update encounter. Status: ${err?.response?.status}`,
      saving: false,
    });

    throw err;
  }
},

createPrescription: async (encounterId, payload) => {
  try {
    set({ saving: true, error: "" });

    await encountersApi.createPrescription(encounterId, payload);

    const response = await encountersApi.getPanel(encounterId);

    set({
      panel: response.data,
      saving: false,
    });
  } catch (err) {
    console.error("Create prescription error:", err);

    set({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        `Failed to create prescription. Status: ${err?.response?.status}`,
      saving: false,
    });
  }
},
closeEncounter: async (encounterId) => {
  try {
    set({ saving: true, error: "" });

    await encountersApi.closeEncounter(encounterId);

    const response = await encountersApi.getPanel(encounterId);

    set({
      panel: response.data,
      saving: false,
    });

    return response.data;
  } catch (err) {
    console.error("Close encounter error:", err);

    set({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        `Failed to close encounter. Status: ${err?.response?.status}`,
      saving: false,
    });

    throw err;
  }
},
}));
