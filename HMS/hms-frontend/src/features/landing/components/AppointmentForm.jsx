import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useAppointmentStore } from "@/features/landing/appointmentStore";
import { createAppointmentRequest } from "@/features/landing/api/appointmentRequestApi";
import { appointmentRequestSchema } from "@/features/landing/schemas/appointmentRequestSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  preferredDate: "",
  reasonForVisit: "",
};

export default function AppointmentForm() {
  const { submitted, setSubmitted, reset: resetSubmitted } = useAppointmentStore();
  const form = useForm({
    resolver: zodResolver(appointmentRequestSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: createAppointmentRequest,
    onSuccess: () => {
      toast.success("Request received. Our team will contact you shortly.");
      form.reset(defaultValues);
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error ?? "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <section id="appointment" className="bg-slate-900 py-24">
      <div className="mx-auto max-w-3xl px-6">
        {submitted ? (
          <div className="mb-6 flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p>Request received. Our team will contact you shortly.</p>
            <button
              type="button"
              onClick={resetSubmitted}
              className="text-emerald-700 transition hover:text-emerald-900"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First Name" autoComplete="given-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last Name" autoComplete="family-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+383..." autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <input type="date" className="border-input flex h-8 w-full rounded-lg border px-3 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Appointment Date</FormLabel>
                    <FormControl>
                      <input type="date" className="border-input flex h-8 w-full rounded-lg border px-3 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reasonForVisit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Textarea rows={4} maxLength={300} placeholder="Briefly describe your concern" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Request Appointment"}
            </Button>
            <p className="text-center text-xs text-slate-500">
              We'll review your request and contact you within one business day.
            </p>
          </form>
        </Form>
      </div>
    </section>
  );
}