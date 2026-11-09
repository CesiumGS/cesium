let lastBase: string | undefined;
let lastBaseUrl: URL | undefined;
let lastBaseParams: Array<[string, string]> = [];

/**
 * Resolves `uri` against `base`, carrying over the base's query parameters
 * (ion versions assets with `?v=`), as 1.x `Resource` does.
 *
 * Called for every tile while a tileset JSON is read, with the same base
 * for the whole file: the base is parsed once, and missing parameters are
 * merged in one assignment (setting them one by one re-serialized the URL
 * each time, which made reading Google's external tilesets the main cost
 * of frames while flying into a new area).
 */
export function resolveUri(uri: string, base: string): string {
  if (base !== lastBase || !lastBaseUrl) {
    lastBaseUrl = new URL(base);
    lastBaseParams = [...lastBaseUrl.searchParams];
    lastBase = base;
  }
  const resolved = new URL(uri, lastBaseUrl);
  if (lastBaseParams.length === 0) {
    return resolved.href;
  }
  const own = resolved.search;
  const missing = own
    ? lastBaseParams.filter(([key]) => !resolved.searchParams.has(key))
    : lastBaseParams;
  if (missing.length === 0) {
    return resolved.href;
  }
  const extra = new URLSearchParams(missing).toString();
  resolved.search = own ? `${own.slice(1)}&${extra}` : extra;
  return resolved.href;
}
