export const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=2400&q=85";

export const DIRECTORS = [
  {
    id: 1,
    title: "Clinical Governance",
    specialty: "Doctor-led review for high-risk cases, referrals, and care quality.",
    initials: "CG",
    accent: "sky",
  },
  {
    id: 2,
    title: "Specialty Coordination",
    specialty: "Departments work from one shared patient record and care plan.",
    initials: "SC",
    accent: "emerald",
  },
  {
    id: 3,
    title: "Nursing Operations",
    specialty: "Ward activity, handoffs, and follow-up tasks stay visible to the team.",
    initials: "NO",
    accent: "amber",
  },
  {
    id: 4,
    title: "Patient Experience",
    specialty: "Front desk, appointments, and portal requests are managed in one flow.",
    initials: "PX",
    accent: "rose",
  },
];

export const CLINICS = [
  {
    id: 1,
    name: "Cardiology",
    icon: "heart",
    description: "Cardiac assessment, monitoring, and treatment planning.",
    services: ["ECG", "Echo", "Follow-up"],
  },
  {
    id: 2,
    name: "Neurology",
    icon: "brain",
    description: "Neurological evaluation supported by imaging and lab work.",
    services: ["Consults", "Imaging", "Rehab"],
  },
  {
    id: 3,
    name: "Oncology",
    icon: "activity",
    description: "Coordinated diagnostics, therapy planning, and monitoring.",
    services: ["Screening", "Therapy", "Review"],
  },
  {
    id: 4,
    name: "Pediatrics",
    icon: "sparkles",
    description: "Dedicated care pathways for children and adolescents.",
    services: ["Triage", "Vaccines", "Family care"],
  },
  {
    id: 5,
    name: "Orthopedics",
    icon: "bone",
    description: "Bone, joint, and spine care from diagnosis to recovery.",
    services: ["Trauma", "Surgery", "Recovery"],
  },
  {
    id: 6,
    name: "Radiology",
    icon: "scan",
    description: "High-resolution imaging connected to clinical workflows.",
    services: ["MRI", "CT", "Reports"],
  },
];

export const EQUIPMENT = [
  { id: 1, name: "3T MRI Scanner", category: "Imaging", year: 2023, detail: "Full-body 3 Tesla magnetic resonance imaging" },
  { id: 2, name: "Da Vinci Surgical System", category: "Surgery", year: 2022, detail: "Robotic-assisted minimally invasive surgery" },
  { id: 3, name: "PET-CT Hybrid", category: "Oncology", year: 2024, detail: "Simultaneous metabolic and structural imaging" },
  { id: 4, name: "Linear Accelerator", category: "Radiation", year: 2023, detail: "Precision radiation therapy delivery" },
];

export const CLINIC_OPTIONS = CLINICS.map((c) => c.name);

export const FALLBACK_LANDING_STATS = {
  patients: 2,
  staff: 3,
  doctors: 3,
  departments: 1,
  specialties: 1,
  appointments: 0,
};
