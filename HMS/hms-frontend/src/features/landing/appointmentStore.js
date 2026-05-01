import { create } from "zustand";

export const useAppointmentStore = create((set) => ({
  submitted: false,
  setSubmitted: (v) => set({ submitted: v }),
  reset: () => set({ submitted: false }),
}));
