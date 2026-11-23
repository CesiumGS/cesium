/**
 * The kind registry and the URL resolver (CS-847).
 *
 * A kind is registered by module reference, never as a live object, so it
 * loads on the engine's own thread in worker mode: `{ id, module: new
 * URL("./csvSource.js", import.meta.url) }`. Its module's default export
 * is the `SourceKind`, imported the first time an asset needs it.
 */
import type { Credential } from "../io/fetchProvider.ts";
import { ContentName, canonicalSource } from "../scene/identity.ts";
import type {
  AssetRef,
  AssetResolver,
  ModuleRef,
  ResolvedAsset,
  SourceKind,
} from "./types.ts";

/**
 * A kind's registration: its ID and the module that holds it.
 * @experimental
 */
export interface KindRef extends ModuleRef {
  readonly id: string;
}

/** How a module is imported: the engine's thread's `import()`. */
export type ModuleLoader = (href: string) => Promise<unknown>;

const importModule: ModuleLoader = (href) => import(/* @vite-ignore */ href);

/** A module reference's URL, against the page where it's relative. */
export function moduleHref(module: string | URL): string {
  try {
    return new URL(String(module), globalThis.location?.href).href;
  } catch {
    throw new TypeError(
      `a module reference is an absolute URL (new URL("./kind.js", import.meta.url)), or relative to a page; got "${String(module).slice(0, 80)}".`,
    );
  }
}

/**
 * The kinds an engine knows, by ID, each loaded once when first needed.
 * @experimental
 */
export class SourceKinds {
  private readonly refs = new Map<string, string>();
  private readonly loaded = new Map<string, Promise<SourceKind>>();

  constructor(private readonly load: ModuleLoader = importModule) {}

  /** Registers a kind by module reference. Refuses an ID registered from another module. */
  register(ref: KindRef): void {
    if (typeof ref.id !== "string" || ref.id.length === 0) {
      throw new TypeError("registerKind: a kind's id is a non-empty string.");
    }
    const href = moduleHref(ref.module);
    const known = this.refs.get(ref.id);
    if (known !== undefined && known !== href) {
      throw new Error(
        `registerKind: the kind "${ref.id}" is registered from another module already.`,
      );
    }
    this.refs.set(ref.id, href);
  }

  /** The registered kinds' IDs, in the order registered. */
  get ids(): readonly string[] {
    return [...this.refs.keys()];
  }

  /** Kind `id`, loaded from its module. */
  kind(id: string): Promise<SourceKind> {
    let kind = this.loaded.get(id);
    if (!kind) {
      const href = this.refs.get(id);
      if (href === undefined) {
        return Promise.reject(
          new Error(
            `open: no kind "${id}" is registered (Engine.sources.registerKind).`,
          ),
        );
      }
      kind = this.load(href).then((module) => checkKind(module, id));
      this.loaded.set(id, kind);
      // A module that failed to load may load later (a network blip).
      kind.catch(() => this.loaded.delete(id));
    }
    return kind;
  }

  /**
   * The kind for `asset`: the one it names, else the first registered kind
   * that accepts it (each loaded to ask).
   */
  async pick(asset: ResolvedAsset): Promise<SourceKind> {
    if (asset.kind !== undefined) {
      const kind = await this.kind(asset.kind);
      if (!kind.accepts(asset)) {
        throw new Error(`open: the kind "${asset.kind}" refuses the asset.`);
      }
      return kind;
    }
    for (const id of this.refs.keys()) {
      const kind = await this.kind(id);
      if (kind.accepts(asset)) {
        return kind;
      }
    }
    throw new Error("open: no registered kind accepts the asset.");
  }
}

/**
 * The name of content no host or resolver names (CS-1100 A): a digest of
 * everything its kind's `open` receives but its declared credential. That
 * is the kind's ID; the URL's scheme, host, port and path and its whole
 * query but the declared credential's own parameters
 * (`asset.credentials.query`'s names, without case), sorted by name and
 * then value; and the options as canonical JSON. Never its user
 * information or fragment, and no list of likely credential names: so two
 * assets a kind could tell apart never share a name, while a URL with a
 * token nobody declared gets a name that changes with the token (reported
 * at `open`). A data URI's is its bytes' digest (CS-815's), with no query
 * read. A blob URL names a blob for one page's life only, so its name is
 * `session:` and a digest, and its IDs don't last. Only the digest is kept.
 * This is the one place the engine reads a URL for identity.
 * @internal
 */
export function derivedName(
  kind: string,
  asset: {
    readonly url: URL;
    readonly credentials?: Credential;
    readonly options?: unknown;
  },
): ContentName {
  const { url } = asset;
  const options = asset.options ?? {};
  if (url.protocol === "data:") {
    const bytes = /murmur3-128=([0-9a-f]{32})$/.exec(
      canonicalSource(url.href),
    )![1]!;
    return ContentName.derived(canonicalJson([kind, "data:", bytes, options]));
  }
  if (url.protocol === "blob:") {
    return ContentName.derived(
      canonicalJson([kind, url.href, options]),
      "session",
    );
  }
  const declared = new Set(
    Object.keys(asset.credentials?.query ?? {}).map((n) => n.toLowerCase()),
  );
  const query = [...url.searchParams]
    .filter(([name]) => !declared.has(name.toLowerCase()))
    .sort(([a, x], [b, y]) =>
      a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0,
    );
  return ContentName.derived(
    canonicalJson([
      kind,
      url.protocol,
      url.hostname,
      url.port,
      url.pathname,
      query,
      options,
    ]),
  );
}

/**
 * `value` as canonical JSON: objects' own keys sorted, so two equal option
 * sets give one text whatever their order. A key like `__proto__` is a key.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function checkKind(module: unknown, id: string): SourceKind {
  const kind = (module as { default?: unknown }).default as
    SourceKind | undefined;
  if (
    !kind ||
    typeof kind !== "object" ||
    typeof kind.accepts !== "function" ||
    typeof kind.open !== "function"
  ) {
    throw new Error(
      `registerKind: the module for "${id}" has no SourceKind as its default export.`,
    );
  }
  if (kind.id !== id) {
    throw new Error(
      `registerKind: the module registered as "${id}" holds the kind "${kind.id}".`,
    );
  }
  return kind;
}

/**
 * Plain URLs: `{ url, kind?, options? }` resolves to itself, with no name
 * (the engine derives one, `derivedName`), no credentials and no credits of
 * its own. A relative URL resolves against the page.
 * @experimental
 */
export class UrlResolver implements AssetResolver {
  readonly id = "url";

  accepts(ref: AssetRef): boolean {
    return "url" in ref;
  }

  resolve(ref: AssetRef): Promise<ResolvedAsset> {
    if (!("url" in ref)) {
      return Promise.reject(
        new TypeError("UrlResolver: the reference has no url."),
      );
    }
    let url: URL;
    try {
      url = new URL(String(ref.url), globalThis.location?.href);
    } catch {
      return Promise.reject(
        new TypeError(
          "UrlResolver: the url is neither absolute nor relative to a page.",
        ),
      );
    }
    return Promise.resolve({
      ...(ref.kind !== undefined ? { kind: ref.kind } : {}),
      url,
      credits: [],
      ...(ref.options !== undefined ? { options: ref.options } : {}),
    });
  }
}
