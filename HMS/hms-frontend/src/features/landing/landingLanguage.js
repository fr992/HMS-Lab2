import { createContext, useContext } from "react";

export const STORAGE_KEY = "hms.landing.language";
export const DEFAULT_LANGUAGE = "sq";
export const LANGUAGES = ["sq", "en"];

export const LandingLanguageContext = createContext(null);

export const translations = {
  sq: {
    brandType: "Spital",
    nav: {
      services: "Shërbimet",
      departments: "Departamentet",
      technology: "Teknologjia",
      appointment: "Rezervo Vizitë",
    },
    login: "Hyr",
    heroBadge: "Kujdes modern, i organizuar rreth jush",
    heroCta: "Rezervo Termin",
    portalLogin: "Hyr në Portal",
    summaryStats: {
      patients: "Pacientë të shërbyer",
      doctors: "Specialistë",
      departments: "Departamente",
      equipment: "Sisteme të avancuara",
    },
    snapshot: {
      eyebrow: "Përmbledhja e sotme",
      title: "Pasqyra e Spitalit",
      patients: "Pacientë aktivë",
      doctors: "Mjekë aktivë",
      staff: "Staf mjekësor",
      equipment: "Sisteme të avancuara",
      refreshed: "Të dhënat e regjistrit u rifreskuan nga rekordet e Nexora.",
    },
    leadership: {
      eyebrow: "Udhëheqja",
      title: "Udhëheqje klinike me ritëm të qartë operativ.",
      signals: {
        registryLabel: "Të dhëna live",
        registryValue: "Numri i pacientëve",
        operationsLabel: "Operacione kujdesi",
        operationsValue: "Staf dhe specialitete",
      },
      cards: [
        {
          title: "Qeverisje Klinike",
          specialty: "Rishikim i udhëhequr nga mjekët për raste me rrezik të lartë, referime dhe cilësi të kujdesit.",
        },
        {
          title: "Koordinim i Specialiteteve",
          specialty: "Departamentet punojnë nga një rekord i përbashkët i pacientit dhe plan kujdesi.",
        },
        {
          title: "Operacione Infermierie",
          specialty: "Aktiviteti i reparteve, dorëzimet dhe detyrat pasuese mbeten të dukshme për ekipin.",
        },
        {
          title: "Përvoja e Pacientit",
          specialty: "Recepsioni, terminet dhe kërkesat e portalit menaxhohen në një rrjedhë të vetme.",
        },
      ],
    },
    clinics: {
      eyebrow: "Departamentet",
      title: "Klinika të organizuara për kujdes të shpejtë dhe të lidhur.",
      description: "Çdo klinikë lidh terminet, mjekët, diagnostikimin dhe ndjekjen në një rrugëtim të qartë për pacientin.",
      cta: "Kërko Vizitë",
      unavailable: "Departamentet nuk mund të ngarkohen tani.",
      empty: "Ende nuk ka departamente të disponueshme.",
      loading: "Duke ngarkuar...",
      seeAll: (count) => `Shiko të gjitha ${count} departamentet`,
      defaultName: "Klinikë",
      defaultDescription: "Kujdes i koordinuar i mbështetur nga terminet, specialistët dhe rekordet e lidhura.",
      services: ["Termine", "Specialistë", "Ndjekje"],
    },
    equipment: {
      eyebrow: "Teknologjia",
      title: "Pajisje të zgjedhura për saktësi dhe shpejtësi.",
      description: "Sisteme diagnostikuese dhe kirurgjikale me vlerë të lartë mbështesin ekipet e kujdesit në imazheri, onkologji, kirurgji dhe radioterapi.",
      countLabel: "Sisteme të avancuara të listuara",
      inService: "Në shërbim",
      categories: {
        Imaging: "Imazheri",
        Surgery: "Kirurgji",
        Oncology: "Onkologji",
        Radiation: "Radioterapi",
      },
      items: [
        { name: "Skaner MRI 3T", detail: "Imazheri me rezonancë magnetike 3 Tesla për gjithë trupin" },
        { name: "Sistemi Kirurgjikal Da Vinci", detail: "Kirurgji minimale invazive me asistencë robotike" },
        { name: "PET-CT Hibrid", detail: "Imazheri metabolike dhe strukturore njëkohësisht" },
        { name: "Akselerator Linear", detail: "Dhënie precize e radioterapisë" },
      ],
    },
    appointment: {
      eyebrow: "Termini",
      title: "Kërko kujdesin e duhur që në hapin e parë.",
      description: "Ndani të dhënat kryesore dhe ekipi i recepsionit do të koordinojë datën e preferuar, klinikën dhe specialistin e parë të lirë.",
      reviewTitle: "Rishikimi i terminit",
      reviewText: "Kërkesat kontrollohen nga rrjedha e punës së recepsionit.",
      hoursTitle: "Orari i punës",
      success: "Kërkesa u pranua. Ekipi ynë do t'ju kontaktojë së shpejti.",
      dismissSuccess: "Mbyll mesazhin e suksesit",
      cardTitle: "Kërkesë pacienti",
      cardSubtitle: "Përdorni emrin ligjor dhe të dhëna kontakti të arritshme.",
      firstName: "Emri",
      lastName: "Mbiemri",
      email: "Email",
      phone: "Numri i telefonit",
      dateOfBirth: "Data e lindjes",
      preferredDate: "Data e preferuar e terminit",
      preferredDoctor: "Mjeku i preferuar",
      doctorPlaceholder: "Kërko mjek sipas emrit ose specialitetit",
      noPreference: "Pa preferencë",
      reason: "Arsyeja e vizitës",
      reasonPlaceholder: "Përshkruani shkurt shqetësimin tuaj",
      submitting: "Duke dërguar...",
      submit: "Kërko Termin",
      footnote: "Do ta shqyrtojmë kërkesën dhe do t'ju kontaktojmë brenda një dite pune.",
      error: "Diçka shkoi keq. Ju lutemi provoni përsëri.",
    },
  },
  en: {
    brandType: "Hospital",
    nav: {
      services: "Services",
      departments: "Departments",
      technology: "Technology",
      appointment: "Book a Visit",
    },
    login: "Login",
    heroBadge: "Modern healthcare, organized around you",
    heroCta: "Book an Appointment",
    portalLogin: "Portal Login",
    summaryStats: {
      patients: "Patients served",
      doctors: "Specialists",
      departments: "Departments",
      equipment: "Advanced systems",
    },
    snapshot: {
      eyebrow: "Today's overview",
      title: "Live Hospital Snapshot",
      patients: "Active Patients",
      doctors: "Active Doctors",
      staff: "Medical Staff",
      equipment: "Advanced Systems",
      refreshed: "Registry data refreshed from Nexora records.",
    },
    leadership: {
      eyebrow: "Leadership",
      title: "Clinical leadership with a clear operating rhythm.",
      signals: {
        registryLabel: "Live registry data",
        registryValue: "Patient counts",
        operationsLabel: "Care operations",
        operationsValue: "Staff and specialties",
      },
      cards: [
        {
          title: "Clinical Governance",
          specialty: "Doctor-led review for high-risk cases, referrals, and care quality.",
        },
        {
          title: "Specialty Coordination",
          specialty: "Departments work from one shared patient record and care plan.",
        },
        {
          title: "Nursing Operations",
          specialty: "Ward activity, handoffs, and follow-up tasks stay visible to the team.",
        },
        {
          title: "Patient Experience",
          specialty: "Front desk, appointments, and portal requests are managed in one flow.",
        },
      ],
    },
    clinics: {
      eyebrow: "Departments",
      title: "Clinics organized for fast, connected care.",
      description: "Each clinic connects appointments, doctors, diagnostics, and follow-up into one clear patient pathway.",
      cta: "Request a Visit",
      unavailable: "Departments could not be loaded right now.",
      empty: "No departments are available yet.",
      loading: "Loading...",
      seeAll: (count) => `See all ${count} departments`,
      defaultName: "Clinic",
      defaultDescription: "Coordinated care supported by appointments, specialists, and connected records.",
      services: ["Appointments", "Specialists", "Follow-up"],
    },
    equipment: {
      eyebrow: "Technology",
      title: "Equipment selected for precision and speed.",
      description: "High-value diagnostic and surgical systems support the care teams across imaging, oncology, surgery, and radiation therapy.",
      countLabel: "Advanced systems listed",
      inService: "In service",
      categories: {
        Imaging: "Imaging",
        Surgery: "Surgery",
        Oncology: "Oncology",
        Radiation: "Radiation",
      },
      items: [
        { name: "3T MRI Scanner", detail: "Full-body 3 Tesla magnetic resonance imaging" },
        { name: "Da Vinci Surgical System", detail: "Robotic-assisted minimally invasive surgery" },
        { name: "PET-CT Hybrid", detail: "Simultaneous metabolic and structural imaging" },
        { name: "Linear Accelerator", detail: "Precision radiation therapy delivery" },
      ],
    },
    appointment: {
      eyebrow: "Appointment",
      title: "Request care with the right clinic from the first step.",
      description: "Share the essentials and the reception team will coordinate your preferred date, clinic, and next available specialist.",
      reviewTitle: "Appointment review",
      reviewText: "Requests are checked by the reception workflow.",
      hoursTitle: "Working hours",
      success: "Request received. Our team will contact you shortly.",
      dismissSuccess: "Dismiss success message",
      cardTitle: "Patient request",
      cardSubtitle: "Use your legal name and reachable contact details.",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone Number",
      dateOfBirth: "Date of Birth",
      preferredDate: "Preferred Appointment Date",
      preferredDoctor: "Preferred Doctor",
      doctorPlaceholder: "Search doctor by name or specialty",
      noPreference: "No preference",
      reason: "Reason for Visit",
      reasonPlaceholder: "Briefly describe your concern",
      submitting: "Submitting...",
      submit: "Request Appointment",
      footnote: "We will review your request and contact you within one business day.",
      error: "Something went wrong. Please try again.",
    },
  },
};

export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

export function readSavedLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
}

export function resolvePath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

export function useLandingLanguage() {
  const context = useContext(LandingLanguageContext);
  if (!context) {
    throw new Error("useLandingLanguage must be used within LandingLanguageProvider.");
  }

  return context;
}
