let lastBase: string | undefined;
let lastBaseUrl: URL | undefined;
let lastBaseParams: Array<[string, string]> = [];

/**
 * Resolves `uri` against `base`, carrying over the base's query parameters
 * (ion versions assets with `?v=`, a signed link carries its signature), as
 * 1.x `Resource` does, but only to a URL on the base's own origin (CS-966):
 * a tile that names another server gets none of the base's query, so it
 * can't take a key or a signature there.
 *
 * The origin is the URL standard's tuple of scheme, host and port, as the
 * URL parser normalizes them (case, default ports, punycode), so
 * `https://a.test:443/x` shares `https://a.test/t.json`'s. A relative URL
 * resolves onto the base's origin and keeps the query. A protocol-relative
 * URL (`//host/x`, or with backslashes, which http(s) URLs read as slashes)
 * is judged by where it resolves. A `data:` or `blob:` URL is not a request
 * to a server, and a query would change what it names: it comes back as it
 * is. An origin the standard leaves opaque (a `file:` base) shares the query
 * only with relative URLs and other URLs on the same scheme and host.
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
  if (lastBaseParams.length === 0 || !sameOrigin(resolved, lastBaseUrl)) {
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

/** Whether `url` is on `base`'s origin: the same scheme, host and port. */
function sameOrigin(url: URL, base: URL): boolean {
  return (
    url.protocol !== "data:" &&
    url.protocol !== "blob:" &&
    url.protocol === base.protocol &&
    url.hostname === base.hostname &&
    url.port === base.port
  );
}
