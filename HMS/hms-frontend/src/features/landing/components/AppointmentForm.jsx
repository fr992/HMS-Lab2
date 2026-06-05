import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Phone,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAppointmentStore } from "@/features/landing/appointmentStore";
import {
  createAppointmentRequest,
  fetchPublicDoctors,
} from "@/features/landing/api/appointmentRequestApi";
import DoctorSearchSelect from "@/features/patients/components/DoctorSearchSelect";
import { appointmentRequestSchema } from "@/features/landing/schemas/appointmentRequestSchema";
import { useLandingLanguage } from "@/features/landing/landingLanguage";
import {
  getLocalizedPublicSetting,
  getPublicSetting,
  usePublicSettings,
} from "@/features/landing/publicSettings";
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
  doctorProfileId: "",
  dateOfBirth: "",
  preferredDate: "",
  reasonForVisit: "",
};

const dateInputClass =
  "flex h-10 w-full rounded-md border border-cyan-100 bg-white px-3 text-sm text-cyan-950 transition outline-none focus-visible:border-teal-300 focus-visible:ring-3 focus-visible:ring-teal-100";

export default function AppointmentForm() {
  const { language, t } = useLandingLanguage();
  const { submitted, setSubmitted, reset: resetSubmitted } = useAppointmentStore();
  const { settings } = usePublicSettings();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const workingHours = getPublicSetting(settings, "hospital.workingHours");
  const emergencyText = getLocalizedPublicSetting(settings, "landing.emergencyContactText", language);
  const emergencyPhone = getPublicSetting(settings, "hospital.emergencyPhone");
  const form = useForm({
    resolver: zodResolver(appointmentRequestSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: createAppointmentRequest,
    onSuccess: () => {
      toast.success(t("appointment.success"));
      form.reset(defaultValues);
      setSelectedDoctor(null);
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error ?? t("appointment.error"));
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <section id="appointment" className="bg-[#f7fbfd] py-20 text-cyan-950 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="landing-reveal">
          <p className="text-sm font-semibold text-blue-600">{t("appointment.eyebrow")}</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
            {t("appointment.title")}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-cyan-800/75">
            {t("appointment.description")}
          </p>

          <div className="mt-8 grid max-w-md gap-3">
            <ContactSignal icon={CalendarCheck} title={t("appointment.reviewTitle")} text={t("appointment.reviewText")} />
            <ContactSignal icon={Clock3} title={t("appointment.hoursTitle")} text={workingHours} />
            <ContactSignal icon={Phone} title={emergencyText} text={emergencyPhone} />
          </div>
        </div>

        <div className="landing-reveal landing-delay-2">
          {submitted ? (
            <div className="mb-4 flex items-start justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {t("appointment.success")}
              </span>
              <button
                type="button"
                onClick={resetSubmitted}
                className="text-emerald-700 transition hover:text-emerald-950"
                aria-label={t("appointment.dismissSuccess")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="rounded-md border border-cyan-100 bg-white p-5 text-cyan-950 shadow-2xl shadow-cyan-950/10 sm:p-7"
            >
              <div className="mb-6 flex items-start gap-3 border-b border-cyan-100 pb-5">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-cyan-950">{t("appointment.cardTitle")}</h3>
                  <p className="mt-1 text-sm text-cyan-800/70">{t("appointment.cardSubtitle")}</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("appointment.firstName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("appointment.firstName")} autoComplete="given-name" {...field} />
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
                      <FormLabel>{t("appointment.lastName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("appointment.lastName")} autoComplete="family-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("appointment.email")}</FormLabel>
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
                      <FormLabel>{t("appointment.phone")}</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+383 44 123 456" autoComplete="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("appointment.dateOfBirth")}</FormLabel>
                      <FormControl>
                        <input type="date" className={dateInputClass} {...field} />
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
                      <FormLabel>{t("appointment.preferredDate")}</FormLabel>
                      <FormControl>
                        <input type="date" className={dateInputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="doctorProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("appointment.preferredDoctor")}</FormLabel>
                      <FormControl>
                        <DoctorSearchSelect
                          value={field.value}
                          onValueChange={(nextValue, doctor) => {
                            field.onChange(nextValue);
                            setSelectedDoctor(doctor ?? null);
                          }}
                          fetchDoctors={fetchPublicDoctors}
                          queryKey="public-doctor-search"
                          selectedDoctor={selectedDoctor}
                          placeholder={t("appointment.doctorPlaceholder")}
                          emptyLabel={t("appointment.noPreference")}
                          inputClassName="rounded-md border-cyan-100 text-cyan-950 focus:border-teal-300 focus:ring-teal-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="reasonForVisit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("appointment.reason")}</FormLabel>
                      <FormControl>
                        <Textarea rows={4} maxLength={300} placeholder={t("appointment.reasonPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="mt-6 h-11 w-full rounded-md bg-blue-600 text-white shadow-lg shadow-blue-700/20 hover:bg-blue-500"
                disabled={mutation.isPending}
              >
                <Send className="size-4" />
                {mutation.isPending ? t("appointment.submitting") : t("appointment.submit")}
              </Button>
              <p className="mt-3 text-center text-xs text-cyan-800/65">
                {t("appointment.footnote")}
              </p>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}

function ContactSignal({ icon, title, text }) {
  const Icon = icon;

  return (
    <div className="flex gap-3 rounded-md border border-cyan-100 bg-white p-4 text-sm shadow-sm shadow-cyan-950/3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-semibold text-cyan-950">{title}</p>
        <p className="mt-1 leading-6 text-cyan-800/70">{text}</p>
      </div>
    </div>
  );
}
