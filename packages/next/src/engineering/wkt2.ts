// What a WKT2 CRS reference must look like before PROJ sees it. `proj_create`
// accepts far more than WKT2 (PROJ strings with +nadgrids, AUTH:CODE, URNs,
// PROJJSON), so a `wkt2` field from untrusted data (a tileset's
// EXT_geospatial_crs_wkt2) could otherwise be read as something else: a
// parser differential. This module has no imports, so the tileset reader
// (georeference.ts) can use it without the PROJ modules.

/**
 * The keywords a WKT2 CRS starts with (ISO 19162:2019 / OGC 18-010r7, and its
 * 2015 edition): each CRS type's short and long form, DERIVEDPROJCRS (a
 * derived projected CRS; the other derived CRSs reuse their base type's
 * keyword), COMPOUNDCRS and BOUNDCRS. WKT1's GEOGCS, PROJCS and the rest are
 * not among them.
 */
export const WKT2_CRS_KEYWORDS: readonly string[] = [
  "GEODCRS",
  "GEODETICCRS",
  "GEOGCRS",
  "GEOGRAPHICCRS",
  "PROJCRS",
  "PROJECTEDCRS",
  "DERIVEDPROJCRS",
  "VERTCRS",
  "VERTICALCRS",
  "ENGCRS",
  "ENGINEERINGCRS",
  "PARAMETRICCRS",
  "TIMECRS",
  "COMPOUNDCRS",
  "BOUNDCRS",
];

// WKT2_CRS_KEYWORDS as a literal (a pattern built at load time would keep
// this module, and the tileset reader, in every bundle that re-exports it).
// WKT keywords are case-insensitive; a bracket is "[" or "(".
const START =
  /^(?:GEODCRS|GEODETICCRS|GEOGCRS|GEOGRAPHICCRS|PROJCRS|PROJECTEDCRS|DERIVEDPROJCRS|VERTCRS|VERTICALCRS|ENGCRS|ENGINEERINGCRS|PARAMETRICCRS|TIMECRS|COMPOUNDCRS|BOUNDCRS)\s*[[(]/i;
// PROJ-string parameters that read files or whole definitions, anywhere.
const PROJ_TOKENS = /\+(?:proj|init|nadgrids|geoidgrids)\b/i;

/**
 * Why `text` isn't a WKT2 CRS, or undefined when it may be one. It checks
 * the form only (PROJ's strict WKT parser checks the rest):
 *  - after trimming, it starts with a WKT2 CRS keyword and a bracket;
 *  - it holds no PROJ-string token (+proj, +init, +nadgrids, +geoidgrids),
 *    and no "+" followed by a letter outside a quoted string.
 */
export function wkt2Problem(text: string): string | undefined {
  if (!START.test(text.trim())) {
    return "must be WKT2: it must start with a WKT2 CRS keyword (PROJCRS, GEOGCRS, COMPOUNDCRS, BOUNDCRS, ...) and a bracket";
  }
  return projTokenProblem(text);
}

/**
 * `wkt2Problem`'s second check alone: a PROJ-string token, or a "+" and a
 * letter outside a quoted string. `crsObject` applies it to every `wkt2`
 * reference, WKT1 included (WKT1's EXTENSION["PROJ4", "+proj=..."] would
 * otherwise be read as a PROJ string); PROJ's strict WKT parser then refuses
 * anything that isn't WKT.
 */
export function projTokenProblem(text: string): string | undefined {
  const trimmed = text.trim();
  if (PROJ_TOKENS.test(trimmed)) {
    return "must be WKT: it holds a PROJ-string token (+proj, +init, +nadgrids or +geoidgrids)";
  }
  // A doubled quote inside a quoted string is an escaped quote: it toggles
  // twice, leaving the state as it was.
  let quoted = false;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '"') {
      quoted = !quoted;
    } else if (!quoted && c === "+" && /[A-Za-z]/.test(trimmed[i + 1] ?? "")) {
      return 'must be WKT: it holds a "+" and a letter outside a quoted string (a PROJ-string parameter)';
    }
  }
  return undefined;
}
