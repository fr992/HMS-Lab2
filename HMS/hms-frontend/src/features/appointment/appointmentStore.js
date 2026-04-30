import { create } from "zustand";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  clinic: "",
  preferredDate: "",
  notes: "",
};

export const useAppointmentStore = create((set, get) => ({
  form: { ...INITIAL_FORM },
  submitting: false,
  submitted: false,
  error: null,

  setField: (field, value) =>
    set((s) => ({ form: { ...s.form, [field]: value } })),

  reset: () =>
    set({ form: { ...INITIAL_FORM }, submitted: false, error: null }),

  submit: async () => {
    set({ submitting: true, error: null });
    try {
      // Replace with real API call: await apiClient.post("/appointments", get().form)
      await new Promise((r) => setTimeout(r, 1200));
      set({ submitted: true, submitting: false });
    } catch {
      set({ error: "Something went wrong. Please try again.", submitting: false });
    }
  },
}));