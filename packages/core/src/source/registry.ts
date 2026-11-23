/**
 * The kind registry and the URL resolver (CS-847).
 *
 * A kind is registered by module reference, never as a live object, so it
 * loads on the engine's own thread in worker mode: `{ id, module: new
 * URL("./csvSource.js", import.meta.url) }`. Its module's default export
 * is the `SourceKind`, imported the first time an asset needs it.
 */
import { isCredentialParameter, type Credential } from "../io/fetchProvider.ts";
import { canonicalSource, digestHex } from "../scene/identity.ts";
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
        throw new Error(
          `open: the kind "${asset.kind}" refuses ${describe(asset)}.`,
        );
      }
      return kind;
    }
    for (const id of this.refs.keys()) {
      const kind = await this.kind(id);
      if (kind.accepts(asset)) {
        return kind;
      }
    }
    throw new Error(`open: no registered kind accepts ${describe(asset)}.`);
  }
}

/**
 * An asset for a message: its name (`ResolvedAsset.name`, else its URL's,
 * `urlName`), never its URL. Long ones are cut.
 */
function describe(asset: ResolvedAsset): string {
  const name =
    typeof asset.name === "string"
      ? asset.name
      : urlName(asset.url, asset.credentials);
  return `"${name.length > 200 ? `${name.slice(0, 200)}…` : name}"`;
}

/**
 * A plain URL's name (CS-1087 A, CS-1080 A): the name of content no host
 * or resolver names. A digest, `url:` and 32 hexadecimal digits, never
 * text, of its scheme, host, port and path and its query without the
 * credentials (`isCredentialParameter`, with `credential`'s own), sorted by
 * name and then value; never its user information or fragment. So a
 * re-signed or re-tokened URL keeps its name, and a query that selects
 * content (`?layer=`) gives its own. A data URI's is the digest of its bytes
 * (CS-815's), with no query read. A blob URL's is `session:` and a digest:
 * it names a blob for one page's life only, so its IDs don't last.
 * This is the one place the engine reads a URL for identity.
 * @internal
 */
export function urlName(url: URL, credential?: Credential): string {
  if (url.protocol === "data:") {
    return `url:${/murmur3-128=([0-9a-f]{32})$/.exec(canonicalSource(url.href))![1]}`;
  }
  if (url.protocol === "blob:") {
    return `session:${digestHex(url.href)}`;
  }
  const query = [...url.searchParams]
    .filter(([name]) => !isCredentialParameter(name, credential))
    .sort(([a, x], [b, y]) =>
      a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0,
    );
  return `url:${digestHex(
    JSON.stringify([`${url.protocol}//${url.host}${url.pathname}`, query]),
  )}`;
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
 * Plain URLs: `{ url, kind?, options? }` resolves to itself, named by its
 * URL's digest (`urlName`), with no credentials and no credits of its own.
 * A relative URL resolves against the page.
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
      name: urlName(url),
      credits: [],
      ...(ref.options !== undefined ? { options: ref.options } : {}),
    });
  }
}
