import { z } from "zod";

export const appointmentRequestSchema = z.object({
  firstName: z.string().min(2, "At least 2 characters"),
  lastName: z.string().min(2, "At least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  dateOfBirth: z.string().refine((val) => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }, "Enter a valid date of birth"),
  preferredDate: z.string().refine((val) => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  }, "Date must be today or in the future"),
  reasonForVisit: z
    .string()
    .min(10, "Please describe your reason for visiting (min 10 characters)")
    .max(300, "Maximum 300 characters"),
});
