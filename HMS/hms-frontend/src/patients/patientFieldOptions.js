/** DTO: string? — Male | Female | Other (case-insensitive legacy input normalized) */
const GENDER_BY_WORD = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const GENDER_CHOICE = new Set(["", "Male", "Female", "Other"]);

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BLOOD_TYPE_SET = new Set(BLOOD_TYPES);

/**
 * @param {unknown} g
 * @returns {"" | "Male" | "Female" | "Other"}
 */
export function normalizeGenderValue(g) {
  if (g == null) return "";
  const s = String(g).trim();
  if (s === "") return "";
  const w = s.toLowerCase();
  if (w in GENDER_BY_WORD) return GENDER_BY_WORD[w];
  if (GENDER_CHOICE.has(s)) return s;
  return "";
}

/**
 * @param {unknown} b
 * @returns {string} one of BLOOD_TYPES or "" for "not set"
 */
export function normalizeBloodTypeValue(b) {
  if (b == null) return "";
  const t = String(b).trim();
  if (t === "") return "";
  return BLOOD_TYPE_SET.has(t) ? t : "";
}

export { BLOOD_TYPES };
