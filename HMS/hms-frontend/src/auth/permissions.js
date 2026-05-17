import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const NAME_IDENTIFIER_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

const PERM_SEP = "|";

/**
 * @param {string | null | undefined} token
 * @returns {string[]}
 */
export function getPermissionsFromToken(token) {
  if (!token) return [];
  try {
    const decoded = jwtDecode(token);
    if (typeof decoded.permissions === "string" && decoded.permissions) {
      return decoded.permissions.split(PERM_SEP).filter(Boolean);
    }
    const p = decoded.permission;
    if (Array.isArray(p)) return p;
    if (typeof p === "string") return [p];
  } catch {
    return [];
  }
  return [];
}

/**
 * @param {string | null | undefined} token
 * @returns {string | null}
 */
export function getPrimaryRoleFromToken(token) {
  const roles = getRolesFromToken(token);
  return roles[0] ?? null;
}

/**
 * @param {string | null | undefined} token
 * @returns {string[]}
 */
export function getRolesFromToken(token) {
  if (!token) return [];
  try {
    const d = jwtDecode(token);
    const r = d.role ?? d[ROLE_CLAIM];
    if (Array.isArray(r)) return r.filter(Boolean);
    return typeof r === "string" ? [r] : [];
  } catch {
    return [];
  }
}

/**
 * @param {string | null | undefined} token
 * @returns {string | null}
 */
export function getUserNameFromToken(token) {
  if (!token) return null;
  try {
    const d = jwtDecode(token);
    if (d.unique_name && typeof d.unique_name === "string")
      return d.unique_name;
    if (d.preferred_username && typeof d.preferred_username === "string")
      return d.preferred_username;
    if (d.email && typeof d.email === "string") return d.email;
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {string | null | undefined} token
 * @returns {string | null}
 */
export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const d = jwtDecode(token);
    const value = d.sub ?? d[NAME_IDENTIFIER_CLAIM];
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const d = jwtDecode(token);
    if (typeof d.exp !== "number") return true;
    return d.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
