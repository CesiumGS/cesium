/**
 * Browser-compiled Slang, cached (plan §3.4, step 5): what the WebAssembly
 * compiler made of a shader, kept in IndexedDB under a digest of everything
 * the compile read, so a visitor's second visit (or another page with the
 * same shader) doesn't load the compiler at all. A cache: when IndexedDB or
 * digests are unavailable (a private window, an insecure context, Node) or
 * an operation fails, shaders compile as without it.
 */

import type { ShaderControl } from "./slangControls.ts";
import type { UniformDeclaration } from "./uniforms.ts";

/** What a compile produced, and only that: no option the caller passed. */
export interface CompiledSlangEntry {
  /** Slang's WGSL, as it is. */
  wgsl: string;
  /** The uniforms the shader declared itself, and their controls. */
  declared: Record<string, UniformDeclaration>;
  controls: ShaderControl[];
}

/** Where compiled shaders are kept: IndexedDB by default, any store in tests. */
export interface SlangCache {
  get(key: string): Promise<CompiledSlangEntry | undefined>;
  put(key: string, entry: CompiledSlangEntry): Promise<void>;
}

/**
 * The key for a compile's inputs: a SHA-256 of them in order (the Slang
 * release and the compiler's URL first, then every source the compiler
 * reads). Undefined where digests aren't available (insecure contexts).
 */
export async function slangCacheKey(
  parts: readonly string[],
): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return undefined;
  }
  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(parts)),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** A cache in memory (tests; pages that want none kept across visits). */
export function memorySlangCache(): SlangCache & {
  readonly entries: Map<string, CompiledSlangEntry>;
} {
  const entries = new Map<string, CompiledSlangEntry>();
  return {
    entries,
    get: (key) => Promise.resolve(entries.get(key)),
    put: (key, entry) => {
      entries.set(key, entry);
      return Promise.resolve();
    },
  };
}

const DB_NAME = "cesium-slang";
const STORE = "compiled";
/**
 * Entries kept: the least recently used go first. A compile is a few to a
 * few tens of KB of WGSL; a playground compiling on every edit stays well
 * within a browser's quota.
 */
export const SLANG_CACHE_ENTRIES = 128;

interface Row extends CompiledSlangEntry {
  key: string;
  /** When it was last read or written (ms), for eviction. */
  used: number;
}

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB request failed"));
  });

const done = (t: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () =>
      reject(t.error ?? new Error("IndexedDB transaction failed"));
    t.onabort = () =>
      reject(t.error ?? new Error("IndexedDB transaction aborted"));
  });

/**
 * The IndexedDB cache (database "cesium-slang"), or undefined where there
 * is no IndexedDB. Opened on first use; at most `entries` kept.
 */
export function indexedDbSlangCache(
  entries = SLANG_CACHE_ENTRIES,
): SlangCache | undefined {
  const factory = globalThis.indexedDB;
  if (!factory) {
    return undefined;
  }
  let db: Promise<IDBDatabase> | undefined;
  const open = () => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        r.result
          .createObjectStore(STORE, { keyPath: "key" })
          .createIndex("used", "used");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("IndexedDB open failed"));
      r.onblocked = () => reject(new Error("IndexedDB open blocked"));
    });
    // A failed open is tried again next time (another tab may have held it).
    db.catch(() => {
      db = undefined;
    });
    return db;
  };
  return {
    async get(key) {
      const t = (await open()).transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      const row = (await request(store.get(key))) as Row | undefined;
      if (row) {
        store.put({ ...row, used: Date.now() });
      }
      await done(t);
      return (
        row && {
          wgsl: row.wgsl,
          declared: row.declared,
          controls: row.controls,
        }
      );
    },
    async put(key, entry) {
      const t = (await open()).transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      const row: Row = { key, used: Date.now(), ...entry };
      store.put(row);
      // Past the limit, the least recently used out.
      const count = await request(store.count());
      let excess = count - entries;
      if (excess > 0) {
        const cursors = store.index("used").openCursor();
        cursors.onsuccess = () => {
          const cursor = cursors.result;
          if (cursor && excess-- > 0) {
            cursor.delete();
            cursor.continue();
          }
        };
      }
      await done(t);
    },
  };
}

let shared: SlangCache | undefined | null = null;

/** The page's IndexedDB cache, made once; undefined without IndexedDB. */
export function defaultSlangCache(): SlangCache | undefined {
  if (shared === null) {
    shared = indexedDbSlangCache();
  }
  return shared;
}
