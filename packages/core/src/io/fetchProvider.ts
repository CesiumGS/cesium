/**
 * The one way the engine makes a request (CS-809). Every fetch the engine
 * makes, on the page or for a worker, goes through `FetchProvider.default`;
 * `test/fetchSeam.test.ts` fails on a direct `fetch` anywhere else.
 *
 * What it does to each request, in order:
 *
 * 1. **Origin rules** (`FetchProviderOptions.origins`): headers a host's
 *    network requires for an origin (a tenant or gateway header), and the
 *    rule's proxy.
 * 2. **The request hook** (`onRequest`): the host's own signing or logging,
 *    or a move to a mirror. It sees the URL, the kind and the rule's
 *    headers, and may change them. The hook decides what is sent (the
 *    owner's answer CS-1034 A): what it returns goes as is. When it moves
 *    the request to an origin with another rule, the new rule adds only the
 *    headers the hook's request doesn't set. It never sees a source's
 *    headers or a `Credential`'s values: those are added after it, so a
 *    hook gets nothing the host didn't give it there. It runs once per
 *    request, never once per redirect hop.
 * 3. **The source's headers**: a tileset's, terrain's or imagery's
 *    `headers`. When they are a `Credential`'s `headers`, its values are
 *    read now (so a rotated token takes effect on the next request), with
 *    its query parameters. They go only to the source's own origin
 *    (CS-966): a source binds its headers to its URL (`bindToSource`: a
 *    tileset's root JSON, a terrain's `layer.json`, a model's URL), and a
 *    request to any other origin, which only content can name, carries
 *    none of them. A request the engine made to the source's origin keeps
 *    them wherever the hook sends it: a hook that moves such a request to
 *    a third party's server sends the source's headers there. A
 *    `Credential` that lists `origins` goes to those origins instead, and
 *    to no other, its source's included; it is checked on the URL the hook
 *    returns, so a move off its list drops it. Headers
 *    passed to a request directly, with no source bound, have that request
 *    as their source. This is the one place it is checked: every request,
 *    on the page or for a worker, comes through here. The boundary is the
 *    origin, not the path: a host that serves many tenants under one origin
 *    (path-style buckets) gets them for any path on it. An opaque origin
 *    (a `file:` source) matches only the source itself.
 * 4. **The proxy**: the rule's, else the provider's (`DefaultProxy`, 1.x's
 *    prefix form; `ForwardingProxy`, a host's endpoint; or any
 *    `RequestProxy`). The engine's own files (kind `"engine"`) skip the
 *    provider's proxy. A proxy gets credentials only where an origin rule
 *    for the proxy's own origin allows them (`allowCredentials`); without
 *    one it gets a bare request, with no headers but `Accept` and its own,
 *    no credential, no token in the URL it forwards, and no
 *    `credentials: "include"`. That is stricter than 1.x, whose proxies get
 *    everything; a host that wants 1.x's behavior adds the rule.
 * 5. **The credentials mode**, from the rule of the origin the request is
 *    actually sent to (the proxy's, when there is one, and `"include"` only
 *    with `allowCredentials`). Without a rule the
 *    mode is the browser's default (`"same-origin"`), as before CS-809: only
 *    a host chooses another, per origin.
 * 6. **The transport** (`fetch`, or a host's), then the response hook
 *    (`onResponse`) with the status and headers.
 * 7. **Redirects** (CS-1033 A). fetch strips only `Authorization` and
 *    cookies on a cross-origin hop. A request that carries a source's or an
 *    origin rule's header other than `Authorization`, `Accept` or `Prefer`
 *    follows redirects through the provider instead (`redirects.ts`): in
 *    Node by hand, each hop checked as a fresh request (the first origin's
 *    headers go only to it and are never regained once the chain leaves
 *    it, a credential that lists origins goes to each hop on them, each
 *    hop's own rule applies, at most 20 hops, no loop, no https to http);
 *    in a browser, which hides a manual redirect's target, the redirect is
 *    refused with an error that names the URL and says why. Any other
 *    request keeps fetch's own `follow`, ion's and iTwin's among them.
 *
 * **Renewal.** A 401 on a request whose headers belong to a renewable
 * `Credential` refreshes it (one refresh for every request that failed with
 * the same generation) and retries that request once. That retry stays in
 * the request's slot of its origin's window (`RequestScheduler`), so it
 * never adds requests in flight. Every other retry (a 503, a timeout, a
 * dropped body) belongs to the tile's episode (CS-147) and its origin's
 * retry budget (CS-146, milestone CS-458); the provider makes none of them,
 * so the two can't multiply.
 *
 * **Never printed.** Nothing here logs, and nothing it throws or passes to
 * a hook carries a header value or a credential's query parameters. Error
 * messages at the call sites name the kind of request and the status, never
 * the URL (it may carry a key).
 *
 * **What a browser can't do, and how a proxy covers it.** A page can't
 * choose a client certificate (mutual TLS): the browser asks the user, or
 * uses an enterprise policy's certificate, and only for the origin the
 * request is sent to. It can't trust a custom certificate authority, pin a
 * certificate or change TLS settings; it can't set forbidden headers
 * (`Host`, `Cookie`, `Origin`, `Proxy-Authorization` and the like) or reach
 * a server that doesn't answer CORS. In each case the host runs a proxy on
 * an origin the browser trusts (`DefaultProxy` or `ForwardingProxy`) that
 * holds the client certificate or the private trust store, sets what the
 * page can't, and forwards to the real server; the page's own cookies or
 * single sign-on reach that proxy with an origin rule for it that has
 * `allowCredentials` and `credentials: "include"`.
 */

import { followRedirects, type Hop } from "./redirects.ts";

/** What a request is for: hooks and diagnostics can tell requests apart. */
export type RequestKind =
  /** A tileset JSON, root or external. */
  | "tileset"
  /** A tile's content, and its sub-resources (buffers, textures). */
  | "content"
  /** A terrain tile, or `layer.json`. */
  | "terrain"
  /** An imagery tile, or a tile map's metadata. */
  | "imagery"
  /** A service's endpoint or metadata (ion, iTwin, Bing). */
  | "endpoint"
  /** A model (`Engine.loadGltf`) or a texture a shader names. */
  | "asset"
  /** The engine's own files (decoder wasm). The provider's proxy skips them. */
  | "engine"
  | "other";

/** A credential's values: headers, query parameters, or both. */
export interface CredentialValue {
  headers?: Readonly<Record<string, string>>;
  /** Added to the URL of each request it applies to (a signed URL's key). */
  query?: Readonly<Record<string, string>>;
}

export interface CredentialOptions {
  /**
   * New values after a 401, or undefined when there are none (the 401
   * stands). Called once for all requests that failed on the same
   * generation.
   */
  refresh?: () => Promise<CredentialValue | undefined>;
  /**
   * The origins it is sent to (`"https://assets.example.com"`); requests
   * to any other origin go without it, its source's too. Default: its
   * source's own origin only, as for plain headers (the origin of the
   * tileset, terrain or model URL it was given with; for a request made
   * with it directly, that request's).
   *
   * Each is read as the URL standard writes an origin, so case, a
   * trailing slash and a default port (`https://Assets.example.com:443/`)
   * don't matter. The constructor refuses one that isn't a URL with an
   * origin, or that names a path, a query or a fragment: the boundary is
   * the origin, not the path. A host that serves many tenants under one
   * origin (path-style buckets) gets the credential for any path on it.
   *
   * They are checked on the URL the host's request hook leaves, and on
   * each redirect hop the provider follows, so a move or a hop off the
   * list drops it.
   */
  origins?: readonly string[];
}

const registry = new WeakMap<object, Credential>();
/** Credentials that list their `origins`. */
const listsOrigins = new WeakSet<Credential>();

/**
 * Renewable request credentials: an access token, a signed key. A source
 * takes its `headers` record as its headers (`TilesetOptions.headers`,
 * `ImageryProvider.headers`), and every request reads the current values
 * when it is made, so `rotate` (or a refresh after a 401) changes the token
 * without reloading the source. `resolveIonAsset` returns one's headers.
 */
export class Credential {
  /** The current headers; updated in place by `rotate` and refreshes. */
  readonly headers: Record<string, string> = {};
  /** The current query parameters; updated in place. */
  readonly query: Record<string, string> = {};
  private generation_ = 0;
  private pending: Promise<boolean> | undefined;
  private readonly origins: ReadonlySet<string> | undefined;

  constructor(
    value: CredentialValue,
    private readonly options: CredentialOptions = {},
  ) {
    this.origins = options.origins
      ? new Set(options.origins.map(normalizeOrigin))
      : undefined;
    if (this.origins) {
      listsOrigins.add(this);
    }
    this.assign(value);
    registry.set(this.headers, this);
  }

  /** The credential whose `headers` record this is, if any. */
  static of(headers: object | undefined): Credential | undefined {
    return headers ? registry.get(headers) : undefined;
  }

  /** Increases each time the values change. */
  get generation(): number {
    return this.generation_;
  }

  /** Whether a 401 can renew it. */
  get renewable(): boolean {
    return this.options.refresh !== undefined;
  }

  /**
   * Whether its `origins` admit `origin`: always, when it lists none (the
   * provider then sends it only to its source's origin).
   */
  appliesTo(origin: string | undefined): boolean {
    return !this.origins || (origin !== undefined && this.origins.has(origin));
  }

  /** Replaces its values: the next request sends the new ones. */
  rotate(value: CredentialValue): void {
    this.assign(value);
    this.generation_++;
  }

  /**
   * Renews it after a request made with `failedGeneration` was refused.
   * Requests that failed together share one refresh; a request that failed
   * on an older generation only retries with the newer values. Resolves
   * whether there are new values to retry with.
   */
  renew(failedGeneration: number): Promise<boolean> {
    if (failedGeneration !== this.generation_) {
      return Promise.resolve(true);
    }
    const refresh = this.options.refresh;
    if (!refresh) {
      return Promise.resolve(false);
    }
    this.pending ??= refresh()
      .then(
        (value) => {
          if (!value) {
            return false;
          }
          this.rotate(value);
          return true;
        },
        () => false,
      )
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  private assign(value: CredentialValue): void {
    replace(this.headers, value.headers);
    replace(this.query, value.query);
  }
}

/**
 * `origin` as `URL.origin` writes it. Throws, naming it, for one that
 * doesn't parse, has no origin (`file:`, `data:`) or names more than an
 * origin (a path, a query, a fragment or a user).
 */
function normalizeOrigin(origin: string): string {
  let url: URL | undefined;
  try {
    url = new URL(origin);
  } catch {
    url = undefined;
  }
  if (
    !url ||
    url.origin === "null" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error(
      `Credential origins: "${origin}" is not an origin (scheme, host and optional port, such as "https://assets.example.com")`,
    );
  }
  return url.origin;
}

function replace(
  target: Record<string, string>,
  source: Readonly<Record<string, string>> | undefined,
): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
}

/** Routes a request through another server (1.x's `Proxy`). */
export interface RequestProxy {
  /** The URL to send a request for `url` to. */
  getURL(url: string): string;
  /** Headers the proxy needs for `url`, beyond the request's own. */
  headers?(url: string): Record<string, string> | undefined;
}

/**
 * 1.x's `DefaultProxy`: the target URL, encoded, as the proxy's query
 * (`/proxy/?https%3A%2F%2F…`).
 */
export class DefaultProxy implements RequestProxy {
  constructor(readonly proxy: string) {}

  getURL(url: string): string {
    const prefix = this.proxy.includes("?") ? "" : "?";
    return this.proxy + prefix + encodeURIComponent(url);
  }
}

/**
 * Sends every request to a host's endpoint, unchanged, with the target URL
 * in a header (default `X-Target-URL`): a gateway that forwards by header
 * rather than by path or query.
 */
export class ForwardingProxy implements RequestProxy {
  constructor(
    readonly endpoint: string,
    readonly options: { header?: string } = {},
  ) {}

  getURL(): string {
    return this.endpoint;
  }

  headers(url: string): Record<string, string> {
    return { [this.options.header ?? "X-Target-URL"]: url };
  }
}

/** What a host's network requires for one origin. */
export interface OriginRule {
  /**
   * The origin it applies to: exact (`"https://tiles.example.com"`), or
   * with a leading wildcard label for its subdomains
   * (`"https://*.example.com"`).
   */
  origin: string;
  /** Sent with every request to the origin (a tenant or gateway header). */
  headers?: Readonly<Record<string, string>>;
  /**
   * The fetch credentials mode for requests sent to this origin: `"omit"`,
   * `"same-origin"`, or `"include"` for a cookie- or single-sign-on-fronted
   * server (which must answer CORS with credentials allowed).
   */
  credentials?: RequestCredentials;
  /** Its own proxy, or `null` for none (the provider's is skipped). */
  proxy?: RequestProxy | null;
  /**
   * For a proxy's origin: the proxy may receive the credentials of the
   * requests it forwards (their headers, rule headers, credential query
   * parameters, tokens in the target URL, `credentials: "include"`).
   * Without it a proxy gets none of them. 1.x's proxies get everything; a
   * host that wants that adds this rule for its proxy.
   */
  allowCredentials?: boolean;
}

/**
 * A request as the request hook sees it: change it in place. What the hook
 * leaves is sent as is (CS-1034 A): its URL, and the headers here,
 * including the first origin's rule headers on a move. A move to an origin
 * with another rule adds that rule's headers where these don't set them.
 * The source's headers, which the hook never sees, follow a request the
 * engine made to the source's origin wherever the hook sends it; a
 * `Credential` that lists its origins goes only where the hook's URL is
 * on its list.
 */
export interface OutgoingRequest {
  url: string;
  readonly kind: RequestKind;
  /** The origin rule's headers and the request's `Accept`. */
  readonly headers: Record<string, string>;
}

/** A response as the response hook sees it. */
export interface IncomingResponse {
  /** The URL the engine asked for (before the proxy). */
  readonly url: string;
  readonly kind: RequestKind;
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers;
}

/** The transport: `fetch`'s signature. */
export type FetchTransport = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export interface FetchProviderOptions {
  /** Applies to every request whose origin rule names no proxy. */
  proxy?: RequestProxy;
  /** The first rule whose origin matches applies. */
  origins?: readonly OriginRule[];
  /**
   * The host's hook, run once per request (not per redirect hop). It
   * decides what is sent (CS-1034 A): a hook that moves a request to a
   * third party's server sends the source's headers there, so a host whose
   * mirror mustn't get them gives a `Credential` that lists its origins.
   * Headers the hook adds follow redirects as fetch's do: to whatever
   * origin a redirect names, unchecked. A secret belongs in an origin rule
   * or a `Credential` instead, so that each hop is checked.
   */
  onRequest?: (request: OutgoingRequest) => void | Promise<void>;
  onResponse?: (response: IncomingResponse) => void | Promise<void>;
  /** Sends the request. Default: the global `fetch`, read per request. */
  transport?: FetchTransport;
}

/** One engine request. */
export interface ProviderRequestInit {
  kind?: RequestKind;
  /**
   * The source's headers: a plain record, or a `Credential`'s `headers`
   * (then a 401 renews it and the request is made once more). They go
   * only to the source's origin: the engine's sources bind theirs to their
   * URL; unbound, this request is their source.
   */
  headers?: Readonly<Record<string, string>> | undefined;
  /** This request's `Accept` header. */
  accept?: string;
  signal?: AbortSignal | undefined;
}

let current: FetchProvider | undefined;

/**
 * Makes the engine's requests (see the module's header). One provider
 * serves every engine on the page: set `FetchProvider.default` before
 * loading content.
 */
export class FetchProvider {
  constructor(private readonly options: FetchProviderOptions = {}) {}

  /** The provider every engine request goes through. */
  static get default(): FetchProvider {
    current ??= new FetchProvider();
    return current;
  }
  static set default(provider: FetchProvider) {
    current = provider;
  }

  /** Makes a request, renewing its credential once after a 401. */
  async fetch(
    input: string | URL,
    init: ProviderRequestInit = {},
  ): Promise<Response> {
    const source = init.headers ? sources.get(init.headers) : undefined;
    const credential = Credential.of(source?.headers ?? init.headers);
    let retried = false;
    for (;;) {
      const generation = credential?.generation ?? 0;
      const { response, sentCredential } = await this.send(
        String(input),
        init,
        credential,
        source,
      );
      // Only a credential that was sent can be what the server refused: a
      // proxy that wasn't allowed it gets no renewal and no fallback.
      if (
        response.status !== 401 ||
        retried ||
        !sentCredential ||
        !credential?.renewable
      ) {
        return response;
      }
      retried = true;
      if (!(await credential.renew(generation))) {
        return response;
      }
      init.signal?.throwIfAborted();
      // The refused response's body isn't wanted.
      void response.body?.cancel().catch(() => {});
    }
  }

  private async send(
    input: string,
    init: ProviderRequestInit,
    credential: Credential | undefined,
    source: BoundSource | undefined,
  ): Promise<{ response: Response; sentCredential: boolean }> {
    const kind = init.kind ?? "other";
    const rule = this.ruleFor(originOf(input));
    const outgoing: OutgoingRequest = {
      url: input,
      kind,
      headers: { ...rule?.headers },
    };
    if (init.accept) {
      setHeader(outgoing.headers, "Accept", init.accept);
    }
    await this.options.onRequest?.(outgoing);
    // Read once: a hook may leave an object that answers differently on
    // each read, and every check below must see the URL that is sent.
    const target = String(outgoing.url);
    const targetRule = this.ruleFor(originOf(target));
    if (targetRule !== rule) {
      // The hook moved the request to an origin with another rule. What it
      // returned is sent as is (CS-1034 A); the new rule adds only the
      // headers the hook's request doesn't set.
      addMissing(outgoing.headers, targetRule?.headers);
    }
    const proxy =
      targetRule?.proxy !== undefined
        ? targetRule.proxy
        : kind === "engine"
          ? undefined
          : this.options.proxy;

    // The request with everything it carries.
    let headers: Record<string, string> = { ...outgoing.headers };
    let url = target;
    let sentCredential = false;
    let sentSource = false;
    let proxyRule: OriginRule | undefined;
    // The proxy's own headers, when they carry a token (a `ForwardingProxy`
    // header with a key in its target): they mustn't follow a redirect off
    // the proxy's origin either.
    let proxyOwn: Readonly<Record<string, string>> | undefined;
    if (init.headers && carries(input, target, credential, source)) {
      sentSource = true;
      for (const [name, value] of Object.entries(init.headers)) {
        setHeader(headers, name, value);
      }
      if (credential) {
        sentCredential = true;
        if (Object.keys(credential.query).length > 0) {
          url = withQuery(url, credential.query);
        }
      }
    }
    let mode: RequestCredentials | undefined;
    if (!proxy) {
      mode = this.ruleFor(originOf(url))?.credentials;
    } else {
      // Through a proxy, credentials go only where an origin rule for the
      // proxy's own origin allows them (`OriginRule.allowCredentials`);
      // stricter than 1.x, whose proxies get everything. Otherwise the
      // proxy gets a bare request: no source or rule headers, no hook's
      // headers, no credential, no token in the target URL it forwards,
      // and no `credentials: "include"`.
      const bare = withoutTokens(target, credential);
      const bareUrl = proxy.getURL(bare);
      proxyRule = this.ruleFor(originOf(bareUrl));
      if (proxyRule?.allowCredentials === true) {
        const forwarded = proxy.headers?.(url);
        if (forwarded && withoutTokens(url, credential) !== url) {
          proxyOwn = forwarded;
        }
        for (const [name, value] of Object.entries({
          ...proxyRule.headers,
          ...forwarded,
        })) {
          setHeader(headers, name, value);
        }
        url = proxy.getURL(url);
        mode = proxyRule.credentials;
      } else {
        const accept = Object.entries(outgoing.headers).find(
          ([name]) => name.toLowerCase() === "accept",
        );
        headers = {};
        for (const [name, value] of Object.entries({
          ...(accept ? { [accept[0]]: accept[1] } : {}),
          ...proxyRule?.headers,
          ...proxy.headers?.(bare),
        })) {
          setHeader(headers, name, value);
        }
        url = bareUrl;
        sentCredential = false;
        sentSource = false;
        mode =
          proxyRule?.credentials === "include"
            ? undefined
            : proxyRule?.credentials;
      }
    }
    const request: RequestInit = {
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(init.signal ? { signal: init.signal } : {}),
      ...(mode ? { credentials: mode } : {}),
    };
    const transport =
      this.options.transport ??
      ((u: string, i?: RequestInit) => globalThis.fetch(u, i));
    let response: Response;
    const own = ownHeaderNames([
      sentSource ? init.headers : undefined,
      proxyOwn,
      ...[rule, targetRule, proxyRule].map((r) => r?.headers),
    ]);
    if (!Object.keys(headers).some((name) => carriesSecret(name, own))) {
      // Nothing fetch wouldn't strip on a cross-origin hop: fetch follows.
      response = await transport(url, request);
    } else {
      const hops = this.hops(url, headers, credential, sentCredential);
      response = await followRedirects(transport, url, request, hops.next);
      sentCredential = hops.credentialSent();
    }
    await this.options.onResponse?.({
      url: target,
      kind,
      status: response.status,
      ok: response.ok,
      headers: response.headers,
    });
    return { response, sentCredential };
  }

  /**
   * Each redirect hop's headers, checked as for a fresh request (CS-1033
   * A): the headers sent to the first URL's origin go only to that origin,
   * and once the chain leaves it no later hop gets them back; a credential
   * that lists its origins goes to each hop on them, until a hop isn't;
   * each hop's own origin rule adds its headers and credentials mode; and
   * `Accept` goes everywhere.
   */
  private hops(
    url: string,
    sent: Readonly<Record<string, string>>,
    credential: Credential | undefined,
    sentCredential: boolean,
  ): { next: (hop: string) => Hop; credentialSent: () => boolean } {
    const first = originOf(url);
    const scoped =
      sentCredential && credential && listsOrigins.has(credential)
        ? new Set(Object.keys(credential.headers).map((n) => n.toLowerCase()))
        : undefined;
    let accept: Record<string, string> = {};
    let bound: Record<string, string> | undefined = {};
    let listed: Record<string, string> | undefined = scoped ? {} : undefined;
    for (const [name, value] of Object.entries(sent)) {
      const lower = name.toLowerCase();
      if (lower === "accept") {
        accept = { [name]: value };
      } else if (scoped?.has(lower)) {
        listed![name] = value;
      } else {
        bound[name] = value;
      }
    }
    const next = (hop: string): Hop => {
      const origin = originOf(hop);
      if (bound && (origin === undefined || origin !== first)) {
        bound = undefined;
      }
      if (listed && !credential!.appliesTo(origin)) {
        listed = undefined;
      }
      const headers = { ...accept, ...bound, ...listed };
      const rule = this.ruleFor(origin);
      addMissing(headers, rule?.headers);
      return { headers, credentials: rule?.credentials };
    };
    const credentialSent = () =>
      sentCredential && (scoped ? listed !== undefined : bound !== undefined);
    return { next, credentialSent };
  }

  private ruleFor(origin: string | undefined): OriginRule | undefined {
    if (origin === undefined) {
      return undefined;
    }
    return this.options.origins?.find((rule) =>
      originMatches(rule.origin, origin),
    );
  }
}

/** A source's headers, bound to its origin (`bindToSource`). */
interface BoundSource {
  /** The headers as the source was given them (a `Credential`'s record). */
  readonly headers: Readonly<Record<string, string>>;
  /** The source URL's origin; undefined for an opaque one. */
  readonly origin: string | undefined;
  /**
   * For an opaque origin, the source's own resource (its URL without query
   * or fragment), which alone matches it; undefined otherwise.
   */
  readonly resource: string | undefined;
}

const sources = new WeakMap<object, BoundSource>();

/**
 * @internal A source's headers, bound to the source at `url` (a tileset's
 * root JSON, a terrain's `layer.json`, a model's URL): the provider sends
 * them, and a `Credential` among them that lists no `origins`, only with
 * requests to that URL's origin, wherever the content later points
 * (CS-966). The result reads `headers` live, so a credential's rotation
 * shows, and passes for them everywhere a record of headers goes; binding
 * bound headers again keeps their first source (a tile's content keeps
 * its tileset's). A source with an opaque origin (a `file:` URL) matches
 * only itself, never another opaque URL.
 *
 * Never copy a bound view: a spread (`{ ...headers }`), `Object.assign`,
 * `new Headers(view)` or `Object.fromEntries` makes a plain record, which
 * the provider then takes as unbound, its own request's headers, so they
 * go wherever that request goes. Pass the view itself.
 * `test/boundHeaderCopies.test.ts` fails on a copy in `packages/core/src`.
 */
export function bindToSource<
  T extends Readonly<Record<string, string>> | undefined,
>(headers: T, url: string | URL): T {
  if (!headers || sources.has(headers)) {
    return headers;
  }
  const view = new Proxy(headers, {});
  const origin = originOf(String(url));
  sources.set(view, {
    headers,
    origin,
    resource: origin === undefined ? resourceOf(String(url)) : undefined,
  });
  return view;
}

/**
 * Whether a request carries the source's headers. A credential that lists
 * its origins goes where `target`, the URL the host's hook left, is on one
 * of them. Any others go when the engine's request (`input`, before the
 * hook) or `target` is on the source's own origin: the hook decides where
 * a request for the source's origin goes (CS-1034 A), but never carries
 * the source's headers from a request content made to another origin. An
 * opaque origin matches nothing but the source's own resource.
 */
function carries(
  input: string,
  target: string,
  credential: Credential | undefined,
  source: BoundSource | undefined,
): boolean {
  if (credential && listsOrigins.has(credential)) {
    return credential.appliesTo(originOf(target));
  }
  if (source === undefined) {
    return true;
  }
  return onSource(input, source) || onSource(target, source);
}

/** Whether `url` is on `source`'s origin (its own resource, if opaque). */
function onSource(url: string, source: BoundSource): boolean {
  const origin = originOf(url);
  if (source.origin === undefined || origin === undefined) {
    return source.resource !== undefined && resourceOf(url) === source.resource;
  }
  return origin === source.origin;
}

/** `url` without its query and fragment, if it parses. */
function resourceOf(url: string): string | undefined {
  try {
    const parsed = new URL(url, globalThis.location?.href);
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  } catch {
    return undefined;
  }
}

/** Adds each of `extra` to `headers` where no spelling of it is set. */
function addMissing(
  headers: Record<string, string>,
  extra: Readonly<Record<string, string>> | undefined,
): void {
  for (const [name, value] of Object.entries(extra ?? {})) {
    const lower = name.toLowerCase();
    if (!Object.keys(headers).some((key) => key.toLowerCase() === lower)) {
      headers[name] = value;
    }
  }
}

/**
 * Headers fetch follows a redirect with that carry no secret it wouldn't
 * strip: `Authorization`, which fetch strips on a cross-origin hop, and
 * `Accept` and `Prefer`, which only say what the response should be.
 */
const FOLLOW_SAFE = new Set(["authorization", "accept", "prefer"]);

/**
 * The names of a request's own headers, in lower case: a source's, the
 * origin rules', and a proxy's that carry a token.
 */
function ownHeaderNames(
  records: readonly (Readonly<Record<string, string>> | undefined)[],
): Set<string> {
  const names = new Set<string>();
  for (const record of records) {
    for (const name of Object.keys(record ?? {})) {
      names.add(name.toLowerCase());
    }
  }
  return names;
}

/** Whether a header named `name` is a source's or a rule's own secret. */
function carriesSecret(name: string, own: ReadonlySet<string>): boolean {
  const lower = name.toLowerCase();
  return own.has(lower) && !FOLLOW_SAFE.has(lower);
}

/** Makes an engine request through `FetchProvider.default`. */
export function engineFetch(
  input: string | URL,
  init?: ProviderRequestInit,
): Promise<Response> {
  return FetchProvider.default.fetch(input, init);
}

/** The origin of `url` (relative URLs against the page), if it has one. */
function originOf(url: string): string | undefined {
  try {
    const origin = new URL(url, globalThis.location?.href).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return undefined;
  }
}

function originMatches(pattern: string, origin: string): boolean {
  const wildcard = /^([a-z][a-z0-9+.-]*:\/\/)\*\.(.+)$/i.exec(pattern);
  if (!wildcard) {
    return pattern === origin;
  }
  const [, scheme, rest] = wildcard;
  return (
    origin.startsWith(scheme!) &&
    origin.slice(scheme!.length).endsWith(`.${rest}`)
  );
}

/** Sets `name` in `headers`, replacing any spelling of it. */
function setHeader(
  headers: Record<string, string>,
  name: string,
  value: string,
): void {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      delete headers[key];
    }
  }
  headers[name] = value;
}

/**
 * Query parameters that carry a token by convention (OAuth's
 * `access_token`, service keys, signed URLs' signatures), stripped, with a
 * credential's own, from a URL a proxy wasn't allowed credentials for.
 */
const TOKEN_PARAMETERS = new Set([
  "access_token",
  "accesstoken",
  "token",
  "key",
  "api_key",
  "apikey",
  "sig",
  "signature",
  "x-amz-credential",
  "x-amz-security-token",
  "x-amz-signature",
  "x-goog-credential",
  "x-goog-signature",
]);

/** `url` without a credential's query parameters or token parameters. */
function withoutTokens(
  url: string,
  credential: Credential | undefined,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url, globalThis.location?.href);
  } catch {
    return url;
  }
  const own = new Set(
    Object.keys(credential?.query ?? {}).map((name) => name.toLowerCase()),
  );
  let changed = false;
  for (const name of [...parsed.searchParams.keys()]) {
    const lower = name.toLowerCase();
    if (TOKEN_PARAMETERS.has(lower) || own.has(lower)) {
      parsed.searchParams.delete(name);
      changed = true;
    }
  }
  return changed ? parsed.href : url;
}

function withQuery(
  url: string,
  query: Readonly<Record<string, string>>,
): string {
  try {
    const parsed = new URL(url, globalThis.location?.href);
    for (const [name, value] of Object.entries(query)) {
      parsed.searchParams.set(name, value);
    }
    return parsed.href;
  } catch {
    return url;
  }
}
