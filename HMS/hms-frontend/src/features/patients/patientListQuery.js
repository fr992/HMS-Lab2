/**
 * @param {object} p
 * @param {string} q
 */
function matchesQuery(p, q) {
  const t = q.trim().toLowerCase();
  if (!t) return true;

  const idStr = p.id != null ? String(p.id) : "";
  if (t === idStr) return true;

  const pn = (p.patientNumber && String(p.patientNumber)) || "";
  if (pn.toLowerCase().includes(t)) return true;

  const fn = (p.firstName || "").toLowerCase();
  const ln = (p.lastName || "").toLowerCase();
  const full = `${fn} ${ln}`.trim();
  if (fn.includes(t) || ln.includes(t) || full.includes(t)) return true;

  const email = (p.email || "").toLowerCase();
  if (email && email.includes(t)) return true;

  const un = (p.userName && String(p.userName).toLowerCase()) || "";
  if (un && un.includes(t)) return true;

  return false;
}

/**
 * @param {object} p
 * @param {string} gender
 */
function matchesGender(p, gender) {
  if (gender === "all") return true;
  const g = (p.gender == null || p.gender === "") ? "" : String(p.gender);
  if (gender === "") return g === "";
  return g === gender;
}

/**
 * @param {object} p
 * @param {string} hasPortal
 */
function matchesHasPortal(p, hasPortal) {
  if (hasPortal === "all") return true;
  const has = p.userId != null && p.userId !== 0;
  if (hasPortal === "yes") return has;
  return !has;
}

/**
 * @param {object[]} items
 * @param {{ search: string, gender: string, hasPortal: string }} f
 * @returns {object[]}
 */
export function applyPatientListFilters(items, f) {
  if (!Array.isArray(items) || !items.length) return [];
  const search = f.search != null ? String(f.search) : "";
  return items.filter(
    (p) =>
      matchesQuery(p, search) &&
      matchesGender(p, f.gender) &&
      matchesHasPortal(p, f.hasPortal)
  );
}

/**
 * @param {object} a
 * @param {object} b
 * @param {'lastName' | 'email'} key
 * @param {'asc'|'desc'} dir
 */
function compareNameEmail(a, b, key, dir) {
  const m = (x) => (x == null || x === "" ? "—" : String(x).toLowerCase());
  if (key === "email") {
    const c = m(a.email).localeCompare(m(b.email));
    return dir === "asc" ? c : -c;
  }
  const c1 = m(a.lastName).localeCompare(m(b.lastName));
  if (c1 !== 0) return dir === "asc" ? c1 : -c1;
  return dir === "asc"
    ? m(a.firstName).localeCompare(m(b.firstName))
    : -m(a.firstName).localeCompare(m(b.firstName));
}

/**
 * Natural-ish order for PAT-00001
 * @param {string} a
 * @param {string} b
 * @param {'asc'|'desc'} dir
 */
function comparePatientNumberStr(a, b, dir) {
  const c = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? c : -c;
}

/**
 * @param {object[]} items
 * @param {{ key: 'patientNumber' | 'lastName' | 'email', dir: 'asc' | 'desc' }} s
 * @returns {object[]}
 */
export function sortPatientsList(items, s) {
  if (!Array.isArray(items) || items.length < 2) return items ? [...items] : [];
  const { key, dir } = s;
  const copy = [...items];
  copy.sort((a, b) => {
    if (key === "email") {
      return compareNameEmail(a, b, "email", dir);
    }
    if (key === "lastName") {
      return compareNameEmail(a, b, "lastName", dir);
    }
    const nA = (a.patientNumber && String(a.patientNumber)) || "";
    const nB = (b.patientNumber && String(b.patientNumber)) || "";
    if (nA && nB) {
      return comparePatientNumberStr(nA, nB, dir);
    }
    if (a.id != null && b.id != null) {
      return dir === "asc" ? a.id - b.id : b.id - a.id;
    }
    return 0;
  });
  return copy;
}
