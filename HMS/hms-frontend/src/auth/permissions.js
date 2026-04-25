import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

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
  if (!token) return null;
  try {
    const d = jwtDecode(token);
    const r = d.role ?? d[ROLE_CLAIM];
    if (Array.isArray(r)) return r[0] ?? null;
    return typeof r === "string" ? r : null;
  } catch {
    return null;
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
