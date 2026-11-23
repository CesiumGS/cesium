/**
 * @internal Redirects followed by hand (CS-966, the owner's answer CS-1033
 * A), for a request that carries a source's own headers. fetch strips only
 * `Authorization` and cookies on a cross-origin hop, so any other header a
 * source attached would follow an open redirect on a trusted server to
 * another origin. `FetchProvider` sends such a request with
 * `redirect: "manual"` and follows here, asking for each hop's headers as
 * for a fresh request.
 *
 * - **In Node** a manual redirect is the 3xx response with its `Location`.
 *   Each hop resolves `Location` against the hop's URL, and the method and
 *   body follow fetch's rules: a 303, and a 301 or 302 after a POST, become
 *   a GET with no body; a 307 or 308 keeps both. At most `MAX_REDIRECTS`
 *   hops (as fetch), no loop, and no hop from https to http.
 * - **In a browser** a manual redirect is an opaque-redirect response, which
 *   hides where it goes, so the hop can't be checked: it is refused. It is
 *   told by the response (`type === "opaqueredirect"`), not by sniffing the
 *   environment.
 *
 * An error names the URL without its query or fragment (a query may carry
 * a key) and says why, never a header's value. The caller's abort signal
 * goes with every hop, so it, and a timeout made with it, covers the chain.
 */

/** Redirects fetch follows before it fails (the fetch standard's 20). */
export const MAX_REDIRECTS = 20;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Headers that describe a request's body, dropped when it loses its body. */
const BODY_HEADERS = new Set([
  "content-encoding",
  "content-language",
  "content-location",
  "content-type",
]);

/** What a hop sends: its headers (a fresh record) and credentials mode. */
export interface Hop {
  headers: Record<string, string>;
  credentials?: RequestCredentials | undefined;
}

/**
 * Sends `init` to `url` with `redirect: "manual"`, and follows each
 * redirect with `next(url)`'s headers and credentials mode for the hop.
 * Resolves the first response that isn't a redirect with a `Location`.
 */
export async function followRedirects(
  transport: (url: string, init?: RequestInit) => Promise<Response>,
  url: string,
  init: RequestInit,
  next: (url: string) => Hop,
): Promise<Response> {
  let hopUrl = url;
  let request: RequestInit = { ...init, redirect: "manual" };
  const visited = new Set([withoutHash(absolute(url) ?? url)]);
  for (let redirects = 0; ; redirects++) {
    const response = await transport(hopUrl, request);
    if (response.type === "opaqueredirect") {
      throw refused(
        hopUrl,
        "redirected, and a browser hides where to, so the hop can't be checked; a request with a source's own headers doesn't follow redirects in a browser",
      );
    }
    const location = REDIRECT_STATUSES.has(response.status)
      ? response.headers.get("Location")
      : null;
    if (location === null) {
      return response;
    }
    // The redirect's body isn't wanted.
    void response.body?.cancel().catch(() => {});
    if (redirects >= MAX_REDIRECTS) {
      throw refused(url, `redirected more than ${MAX_REDIRECTS} times`);
    }
    const from = absolute(hopUrl);
    const to = from ? absolute(location, from) : undefined;
    if (!to) {
      throw refused(hopUrl, "redirected to a URL that doesn't parse");
    }
    if (from!.startsWith("https:") && to.startsWith("http:")) {
      throw refused(hopUrl, "redirected from https to http");
    }
    const key = withoutHash(to);
    if (visited.has(key)) {
      throw refused(hopUrl, `redirected in a loop, back to ${display(to)}`);
    }
    visited.add(key);
    init.signal?.throwIfAborted();

    const method = (request.method ?? "GET").toUpperCase();
    const toGet =
      (response.status === 303 && method !== "GET" && method !== "HEAD") ||
      ((response.status === 301 || response.status === 302) &&
        method === "POST");
    const hop = next(key);
    const headers = hop.headers;
    if (toGet) {
      for (const name of Object.keys(headers)) {
        if (BODY_HEADERS.has(name.toLowerCase())) {
          delete headers[name];
        }
      }
    }
    // The same request, signal included, with the hop's headers and mode.
    request = { ...request };
    delete request.headers;
    delete request.credentials;
    if (toGet) {
      delete request.method;
      delete request.body;
    }
    if (Object.keys(headers).length > 0) {
      request.headers = headers;
    }
    if (hop.credentials) {
      request.credentials = hop.credentials;
    }
    hopUrl = key;
  }
}

/** `url` made absolute (against `base`, else the page), if it parses. */
function absolute(url: string, base?: string): string | undefined {
  try {
    return new URL(url, base ?? globalThis.location?.href).href;
  } catch {
    return undefined;
  }
}

function withoutHash(url: string): string {
  const hash = url.indexOf("#");
  return hash < 0 ? url : url.slice(0, hash);
}

/** `url` without its query or fragment, which may carry a key. */
function display(url: string): string {
  try {
    const parsed = new URL(url, globalThis.location?.href);
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  } catch {
    return "(a URL that doesn't parse)";
  }
}

function refused(url: string, why: string): Error {
  return new Error(`Request to ${display(url)} refused: ${why}`);
}
