/**
 * Custom chevron for natively-styled <select> (right-aligned, vertically centered).
 * Browsers' native chevron is hidden with `appearance-none`; position uses explicit
 * [background-position] so Tailwind’s older bg-right-* shorthands are not required.
 */
export const NATIVE_SELECT_CHEVRON =
  "appearance-none bg-no-repeat pr-9 " +
  "[background-size:1rem_1rem] " +
  "[background-position:right_0.65rem_center] " +
  "bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%2364758b%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E')]";
