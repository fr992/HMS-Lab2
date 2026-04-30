export const DIRECTORS = [
  {
    id: 1,
    name: "Dr. X Personi",
    title: "Chief Medical Officer",
    specialty: "Cardiothoracic Surgery",
    initials: "XP",
  },
  {
    id: 2,
    name: "Dr. Y Personi",
    title: "Director of Neurology",
    specialty: "Neurological Sciences",
    initials: "YP",
  },
  {
    id: 3,
    name: "Dr. Z Personi",
    title: "Head of Oncology",
    specialty: "Clinical Oncology",
    initials: "ZP",
  },
  {
    id: 4,
    name: "Dr. Q Personi",
    title: "Director of Pediatrics",
    specialty: "Pediatric Medicine",
    initials: "QP",
  },
];

export const CLINICS = [
  { id: 1, name: "Cardiology", icon: "♥", patients: "2,400+", description: "Advanced cardiac care and intervention" },
  { id: 2, name: "Neurology", icon: "⬡", patients: "1,800+", description: "Comprehensive neurological diagnostics" },
  { id: 3, name: "Oncology", icon: "◎", patients: "1,200+", description: "Integrated cancer treatment programs" },
  { id: 4, name: "Pediatrics", icon: "✦", patients: "3,100+", description: "Dedicated care for children 0–18" },
  { id: 5, name: "Orthopedics", icon: "⌖", patients: "2,900+", description: "Bone, joint and spine specialists" },
  { id: 6, name: "Radiology", icon: "◈", patients: "4,200+", description: "High-resolution imaging & diagnosis" },
];

export const EQUIPMENT = [
  { id: 1, name: "3T MRI Scanner", category: "Imaging", year: 2023, detail: "Full-body 3 Tesla magnetic resonance imaging" },
  { id: 2, name: "Da Vinci Surgical System", category: "Surgery", year: 2022, detail: "Robotic-assisted minimally invasive surgery" },
  { id: 3, name: "PET-CT Hybrid", category: "Oncology", year: 2024, detail: "Simultaneous metabolic and structural imaging" },
  { id: 4, name: "Linear Accelerator", category: "Radiation", year: 2023, detail: "Precision radiation therapy delivery" },
];

export const STATS = [
  { label: "Patients Annually", value: "42,000+" },
  { label: "Medical Staff", value: "680+" },
  { label: "Years of Service", value: "38" },
  { label: "Specialties", value: "24" },
];

export const CLINIC_OPTIONS = CLINICS.map((c) => c.name);