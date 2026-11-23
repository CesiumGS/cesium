// A small composer: it loads a root layer and every layer its sublayers,
// references and payloads name, then composes prims in LIVRPS order (local,
// inherits, variants, references, payloads, specializes), depth first. It
// maps relationship targets and connections into the stage's namespace.
//
// What it leaves out, on purpose, and counts instead: relocates, value
// clips, layer offsets on time, variant fallbacks, instancing's prototypes
// (instanceable prims are composed in place), and list-op subtleties beyond
// explicit, prepend, append and delete. Spike code for CS-833 and CS-843;
// not part of @cesium/next.
//
// Broken assets (CS-913) follow OpenUSD (v26.11.1, pcp and usd): a reference,
// payload or sublayer that can't be opened is reported, in OpenUSD's words,
// in `Stage.errors`, and contributes nothing; everything else composes. A
// prim is on the stage only when a layer defines it (`def` or `class`, which
// beat any `over`) and so does its parent. A variant selection is taken from
// the strongest site, counting the stronger sites the prim inherits from its
// parent's namespace.
//
// Hostile files (CS-913, CS-1097 A): every loop that works for the file,
// from the parsers through composition, charges one Budget (budget.ts) in
// its inner loop. When it runs out, reading stops where it is: the stage
// keeps the prims composed whole before that point, and `Stage.errors` says
// so first. Byte and layer caps are checked before anything is parsed.

import {
  Budget,
  MAX_LAYER_BYTES,
  MAX_LAYERS,
  MAX_PATH,
  MAX_STAGE_BYTES,
  WorkLimit,
} from "./budget.ts";
import { readUsdc, isUsdc } from "./crate.ts";
import {
  isArc,
  listItems,
  type Arc,
  type Layer,
  type ListOp,
  type Spec,
  type Value,
} from "./layer.ts";
import { readUsda, isUsda } from "./usda.ts";
import { isZip, readUsdz } from "./usdz.ts";

export {
  Budget,
  KEPT,
  MAX_FIELD_NAME,
  MAX_LAYER_BYTES,
  MAX_LAYERS,
  MAX_PATH,
  MAX_STAGE_BYTES,
  MAX_WORK,
  WorkLimit,
} from "./budget.ts";

/** Where bytes come from: a directory in Node, fetch in a browser. */
export interface AssetIo {
  read(path: string): Promise<Uint8Array | undefined>;
  exists(path: string): Promise<boolean>;
}

export interface LoadedLayer {
  readonly id: string;
  readonly layer?: Layer;
  readonly bytes: number;
  readonly readMs: number;
  readonly error?: string;
  /** What relative paths resolve against: inside the package for a USDZ's root layer. */
  readonly anchor?: string;
}

/** Joins an asset path to the directory of the layer that names it. Returns undefined for URLs, search paths it can't resolve, and paths that climb above the root. */
export function resolveAsset(
  anchor: string,
  asset: string,
): string | undefined {
  // Past MAX_PATH, an asset path names no file the reader opens.
  if (!asset || asset.length > MAX_PATH) {
    return undefined;
  }
  // Anchored, with one run to scan: linear.
  if (/^[a-z][a-z0-9+.-]*:/i.test(asset)) {
    return undefined;
  } // omniverse://, http://, a URI resolver's.
  asset = packagePath(asset) ?? asset;
  const dir = anchor.includes("/")
    ? anchor.slice(0, anchor.lastIndexOf("/"))
    : "";
  const parts = (asset.startsWith("/") ? asset : `${dir}/${asset}`).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") {
      continue;
    }
    if (p === "..") {
      // Climbing above the root would reach files outside the asset's tree.
      if (!out.length) {
        return undefined;
      }
      out.pop();
    } else {
      out.push(p);
    }
  }
  const id =
    (asset.startsWith("/") || dir.startsWith("/") ? "/" : "") + out.join("/");
  return id.length > MAX_PATH ? undefined : id;
}

/**
 * A key for a map or set: the string itself, or, past MAX_PATH, its length
 * and a 64-bit hash of it. V8 hashes a string longer than 16,383 characters
 * by its length alone, so long keys of one length would all collide.
 */
export function keyOf(s: string): string {
  if (s.length <= MAX_PATH) {
    return s;
  }
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 13);
  }
  return `\u0001${s.length}:${(a >>> 0).toString(36)}:${(b >>> 0).toString(36)}`;
}

/**
 * `pkg.usdz[inner/path]` as `pkg.usdz/inner/path`. It does what
 * /^(.*\.usdz)\[(.*)\]$/ did, the last ".usdz[" before a closing "]" at the
 * end, in one scan instead of the regex's backtracking, which grew with the
 * square of the path. Like the regex's `.`, it matches no line terminator.
 */
export function packagePath(asset: string): string | undefined {
  if (!asset.endsWith("]") || /[\n\r\u2028\u2029]/.test(asset)) {
    return undefined;
  }
  const k = asset.lastIndexOf(".usdz[", asset.length - 7);
  return k < 0
    ? undefined
    : `${asset.slice(0, k + 5)}/${asset.slice(k + 6, -1)}`;
}

/**
 * A path with its variant selections taken out: "/A{v=x}B" is "/A/B"'s
 * namespace. It does what replace(/\{[^}]*\}/g, "") did, each "{" to the
 * next "}", in one scan; the regex retried from every "{" without a closing
 * "}" and grew with the square of the path.
 */
export function stripVariants(path: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const open = path.indexOf("{", i);
    const close = open < 0 ? -1 : path.indexOf("}", open + 1);
    if (close < 0) {
      return out + path.slice(i);
    }
    out += path.slice(i, open);
    i = close + 1;
  }
}

export function parseLayer(bytes: Uint8Array, budget = new Budget()): Layer {
  if (isUsdc(bytes)) {
    return readUsdc(bytes, budget);
  }
  if (isUsda(bytes)) {
    return readUsda(bytes, budget);
  }
  throw new Error("not a USD layer (neither PXR-USDC nor #usda)");
}

const LAYER_FILE = /\.(usd|usda|usdc|usdz)$/i;

/** What loading leaves for the stage: the budget it charged, and what it couldn't read. */
interface LoadInfo {
  readonly budget: Budget;
  readonly notes: readonly string[];
}
const loadInfo = new WeakMap<Map<string, LoadedLayer>, LoadInfo>();

/**
 * Loads the root and every layer reachable through sublayers, references and
 * payloads, once each, up to MAX_LAYERS. A layer over MAX_LAYER_BYTES, or one
 * that would take the stage past MAX_STAGE_BYTES, is refused before it's
 * parsed. Parsing charges `budget`; when it runs out, loading stops, and the
 * Stage made from these layers goes on charging the same budget.
 */
export async function loadLayers(
  root: string,
  io: AssetIo,
  budget = new Budget(),
): Promise<Map<string, LoadedLayer>> {
  const loaded = new Map<string, LoadedLayer>();
  const notes: string[] = [];
  /** USDZ entries, by their path inside the package as a directory. */
  const packaged = new Map<string, Uint8Array>();
  const queue = [root];
  const queued = new Set(queue);
  let head = 0;
  let stageBytes = 0;
  const enqueue = (id: string): void => {
    budget.text(id);
    if (queued.has(id)) {
      return;
    }
    if (queued.size >= MAX_LAYERS) {
      if (!notes.length) {
        notes.push(
          `The stage names more than ${MAX_LAYERS} layers, the subset reader's limit; the rest are not read.`,
        );
      }
      return;
    }
    queued.add(id);
    queue.push(id);
  };
  try {
    while (head < queue.length) {
      const id = queue[head++]!;
      const t0 = performance.now();
      const inPackage = packaged.get(id);
      let bytes = inPackage ?? (await io.read(id));
      if (!bytes) {
        loaded.set(id, { id, bytes: 0, readMs: 0, error: "missing" });
        continue;
      }
      const refuse = (error: string): void => {
        loaded.set(id, { id, bytes: bytes!.length, readMs: 0, error });
      };
      if (bytes.length > MAX_LAYER_BYTES) {
        refuse(
          `${bytes.length} bytes, over the subset reader's limit of ${MAX_LAYER_BYTES} for one layer`,
        );
        continue;
      }
      // A package's files are inside bytes already counted.
      if (!inPackage) {
        if (stageBytes + bytes.length > MAX_STAGE_BYTES) {
          refuse(
            `over the subset reader's limit of ${MAX_STAGE_BYTES} bytes for a whole stage`,
          );
          continue;
        }
        stageBytes += bytes.length;
      }
      try {
        let anchor = id;
        if (isZip(bytes)) {
          const entries = readUsdz(bytes);
          budget.charge(1 + entries.length);
          for (const e of entries) {
            // A name past MAX_PATH names no layer the reader opens.
            if (id.length + e.name.length < MAX_PATH) {
              packaged.set(`${id}/${e.name}`, e.bytes);
            }
          }
          const first = entries.find((e) => LAYER_FILE.test(e.name));
          if (!first) {
            throw new Error("usdz: no layer inside");
          }
          // The package's root layer stands for the package, and its own
          // relative paths resolve inside the package.
          bytes = first.bytes;
          anchor = `${id}/${first.name}`;
        }
        const layer = parseLayer(bytes, budget);
        loaded.set(id, {
          id,
          layer,
          bytes: bytes.length,
          readMs: performance.now() - t0,
          ...(anchor !== id ? { anchor } : {}),
        });
        arcsOf(layer, anchor, budget, enqueue);
      } catch (e) {
        if (e instanceof WorkLimit) {
          throw e;
        }
        loaded.set(id, {
          id,
          bytes: bytes.length,
          readMs: performance.now() - t0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } catch (e) {
    // Out of budget: what's loaded so far stands, and the stage says it stopped.
    if (!(e instanceof WorkLimit)) {
      throw e;
    }
  }
  loadInfo.set(loaded, { budget, notes });
  return loaded;
}

/** The layer files a layer names: sublayers, external references and payloads. */
function arcsOf(
  layer: Layer,
  anchor: string,
  budget: Budget,
  found: (id: string) => void,
): void {
  for (const [, spec] of layer.specs) {
    budget.charge();
    for (const field of ["subLayers", "references", "payload"]) {
      for (const item of listItems(spec.fields.get(field))) {
        const asset =
          typeof item === "string" ? item : isArc(item) ? item.asset : "";
        budget.text(asset);
        const r = resolveAsset(anchor, asset);
        if (r) {
          found(r);
        }
      }
    }
  }
}

export interface Prop {
  readonly name: string;
  readonly kind: "attribute" | "relationship";
  readonly typeName?: string;
  readonly value?: Value;
  /** Connections or targets, in the stage's namespace. */
  readonly targets: readonly string[];
  readonly timeSamples: boolean;
  /** The layer that holds its strongest opinion, for resolving asset paths. */
  readonly layer: string;
}

export interface Prim {
  readonly path: string;
  readonly name: string;
  readonly typeName: string;
  readonly specifier: string;
  readonly fields: ReadonlyMap<string, Value>;
  readonly apiSchemas: readonly string[];
  readonly props: ReadonlyMap<string, Prop>;
  readonly children: readonly Prim[];
  /** The sites that contributed, strongest first: "layer:path". */
  readonly sites: readonly string[];
}

export interface ComposeCounts {
  references: number;
  internalReferences: number;
  payloads: number;
  variantSets: number;
  variantSelections: number;
  inherits: number;
  specializes: number;
  sublayers: number;
  instanceable: number;
  /** Variant sets and what was selected: "Physics=PhysX", or "Physics=(none)": the first MAX_LISTED, then a count. */
  selected: string[];
  selectedOmitted: number;
  /** Arcs that didn't resolve, as authored: the first MAX_LISTED, then a count. */
  unresolved: string[];
  unresolvedOmitted: number;
}

type ArcKind =
  "root" | "inherit" | "variant" | "reference" | "payload" | "specialize";

/** A node of a prim's composition graph: its layer stack (by root layer), path and the arc that added it. */
interface Node {
  readonly layer: string;
  readonly path: string;
  readonly arc: ArcKind;
}

interface Site {
  readonly stack: readonly string[];
  readonly path: string;
  /** Maps this site's namespace to the stage's: a prefix in the layer and the prim it lands on. */
  readonly from: string;
  readonly to: string;
  readonly arc: ArcKind;
  /** The nodes between the prim's root node and this site, root first, at this prim's namespace depth. */
  readonly chain: readonly Node[];
}

/** How many errors, and unresolved arcs, a stage lists before it only counts them. */
export const MAX_LISTED = 100;
/** The deepest namespace the composer descends into: a guard on untrusted input. */
export const MAX_NAMESPACE_DEPTH = 256;
/** The most arcs the composer follows from one site of a prim: a guard on untrusted input. */
export const MAX_ARC_DEPTH = 32;
/** The longest layer name or path an error message quotes in full. */
const MAX_QUOTED = 200;

/** A layer name or path for an error message: control characters replaced, long ones cut. */
export function quoted(text: string): string {
  // Cut before cleaning, so a long path costs no more than a short one.
  const head = text.slice(0, MAX_QUOTED);
  // eslint-disable-next-line no-control-regex
  const clean = head.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
  return text.length > MAX_QUOTED
    ? `${clean}… (${text.length} characters)`
    : clean;
}

/** SdfPath::HasPrefix, with a variant selection as a path element. */
function hasPrefix(path: string, prefix: string): boolean {
  return (
    path === prefix ||
    prefix === "/" ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}{`) ||
    (prefix.endsWith("}") && path.startsWith(prefix))
  );
}

// PcpErrorArcCycle::ToString's wording for each arc, then for the arc that closes the cycle.
const CYCLE_VERB: Record<ArcKind, readonly [string, string]> = {
  root: ["refers to", "refer to"],
  inherit: ["inherits from", "inherit from"],
  variant: ["uses variant", "use variant"],
  reference: ["references", "reference"],
  payload: ["gets payload from", "get payload from"],
  // Pcp's switch has no case for specializes: it falls to the default.
  specialize: ["refers to", "refer to"],
};

/** PcpErrorArcCycle::ToString. OpenUSD also names the stage's session layer in the root layer stack; the subset reader has none. */
function cycleMessage(segments: readonly Node[]): string {
  let msg = "Cycle detected:\n";
  segments.forEach((seg, i) => {
    if (i > 0) {
      const [verb, cannot] = CYCLE_VERB[seg.arc];
      msg += i + 1 < segments.length ? `${verb}:\n` : `CANNOT ${cannot}:\n`;
    }
    msg += `@${quoted(seg.layer)}@<${quoted(seg.path)}>\n`;
    if (i > 0 && i + 1 < segments.length) {
      msg += "which ";
    }
  });
  return msg;
}

/** An arc after anchoring: its asset resolved against the layer that authored it. */
interface AnchoredArc {
  readonly arc: Arc;
  /** The layer that authored it, the strongest one when several did. */
  readonly source: string;
  /** The asset path as the layer wrote it. */
  readonly authored: string;
  /** The resolved layer id; undefined when it can't be resolved; "" for an internal arc. */
  readonly resolved: string | undefined;
}

function toArc(item: Value): Arc | undefined {
  if (isArc(item)) {
    return item;
  }
  return typeof item === "string"
    ? { kind: "arc", asset: item, primPath: "" }
    : undefined;
}

/** Applies f to every item a list op names (deleted ones too), keeping its shape. */
function mapListOp(
  v: Value | undefined,
  f: (item: Value) => Value,
): Value | undefined {
  if (v === undefined || v === null) {
    return v;
  }
  if (Array.isArray(v)) {
    return (v as readonly Value[]).map(f);
  }
  if (typeof v === "object" && "kind" in v && v.kind === "listOp") {
    const op = v as ListOp;
    const m = (l?: readonly Value[]) => l?.map(f);
    return {
      kind: "listOp",
      explicit: m(op.explicit),
      prepended: m(op.prepended),
      appended: m(op.appended),
      added: m(op.added),
      deleted: m(op.deleted),
      ordered: m(op.ordered),
    };
  }
  return f(v);
}

/** One site's specs, strongest layer first. */
interface SiteSpec {
  readonly id: string;
  readonly spec: Spec;
}

/** What one prim's composition has gathered so far. */
interface Gather {
  /** Its sites, strongest first. */
  readonly out: Site[];
  readonly keys: Set<string>;
  /** Each site's specs, found once. */
  readonly specs: Map<Site, SiteSpec[]>;
  /**
   * Variant selections by set name, from the sites gathered so far, the
   * strongest first: indexed as each site arrives, so choosing a selection
   * is one lookup however many sites and sets the prim has.
   */
  readonly selections: Map<string, string>;
}

export class Stage {
  readonly layers: Map<string, LoadedLayer>;
  readonly root: string;
  /** Charged by every loop of the composition; shared with loadLayers's parsing. */
  readonly budget: Budget;
  readonly counts: ComposeCounts = {
    references: 0,
    internalReferences: 0,
    payloads: 0,
    variantSets: 0,
    variantSelections: 0,
    inherits: 0,
    specializes: 0,
    sublayers: 0,
    instanceable: 0,
    selected: [],
    selectedOmitted: 0,
    unresolved: [],
    unresolvedOmitted: 0,
  };
  /** Children by parent path, per layer, in the order authored. */
  private readonly childIndex = new Map<string, Map<string, Set<string>>>();
  /** Property specs by their owner's path, then by name, per layer: found without building a path. */
  private readonly propIndex = new Map<
    string,
    Map<string, Map<string, Spec>>
  >();
  /** The listed errors; past MAX_LISTED, errors are only counted. */
  private readonly errorList: string[] = [];
  private readonly errorListed = new Set<string>();
  private errorsOmitted = 0;
  private readonly selectedSeen = new Set<string>();
  /** Layer stacks by root layer, computed once each. */
  private readonly stacks = new Map<string, string[]>();

  constructor(
    layers: Map<string, LoadedLayer>,
    root: string,
    budget = loadInfo.get(layers)?.budget ?? new Budget(),
  ) {
    this.layers = layers;
    this.root = root;
    this.budget = budget;
    for (const note of loadInfo.get(layers)?.notes ?? []) {
      this.report(note);
    }
    try {
      for (const [id, l] of layers) {
        if (!l.layer) {
          continue;
        }
        const children = new Map<string, Set<string>>();
        const props = new Map<string, Map<string, Spec>>();
        for (const [path, spec] of l.layer.specs) {
          budget.text(path);
          budget.keep();
          if (spec.type === "prim") {
            const parent = parentOf(path);
            const name = path.slice(parent.length).replace(/^\//, "");
            push(children, parent, name);
          } else if (
            spec.type === "attribute" ||
            spec.type === "relationship"
          ) {
            const dot = path.lastIndexOf(".");
            const owner = path.slice(0, dot);
            let named = props.get(owner);
            if (!named) {
              named = new Map();
              props.set(owner, named);
            }
            named.set(path.slice(dot + 1), spec);
          }
        }
        this.childIndex.set(id, children);
        this.propIndex.set(id, props);
      }
    } catch (e) {
      // Out of budget: compose() finds it spent and composes nothing more.
      if (!(e instanceof WorkLimit)) {
        throw e;
      }
    }
  }

  layer(id: string): Layer | undefined {
    return this.layers.get(id)?.layer;
  }

  /** True once the budget ran out: the stage holds only what was composed before. */
  get stopped(): boolean {
    return this.budget.exhausted;
  }

  /**
   * What failed to compose, in OpenUSD's wording, once each, in the order
   * found: the first MAX_LISTED, then a count. When the budget ran out, its
   * message comes first, whatever the cap.
   */
  get errors(): readonly string[] {
    return [
      ...(this.stopped ? [this.budget.message] : []),
      ...this.errorList,
      ...(this.errorsOmitted
        ? [
            `${this.errorsOmitted} more composition errors not listed (a repeated one is counted each time).`,
          ]
        : []),
    ];
  }

  private report(message: string): void {
    const key = keyOf(message);
    if (this.errorListed.has(key)) {
      return;
    }
    if (this.errorList.length < MAX_LISTED) {
      this.errorList.push(message);
      this.errorListed.add(key);
    } else {
      // Nothing kept past the cap, so repeats can't be told apart.
      this.errorsOmitted++;
    }
  }

  /** An arc that didn't resolve: the path as authored, quoted, and what's wrong with it. */
  private unresolved(path: string, note = ""): void {
    if (this.counts.unresolved.length < MAX_LISTED) {
      this.counts.unresolved.push(quoted(path) + note);
    } else {
      this.counts.unresolvedOmitted++;
    }
  }

  private selected(setName: string, sel: string | undefined): void {
    const label = `${quoted(setName)}=${sel === undefined ? "(none)" : quoted(sel)}`;
    if (this.selectedSeen.has(label)) {
      return;
    }
    if (this.counts.selected.length < MAX_LISTED) {
      this.counts.selected.push(label);
      this.selectedSeen.add(label);
    } else {
      this.counts.selectedOmitted++;
    }
  }

  /** A layer and its sublayers, strongest first, depth first; computed once per layer. */
  stack(id: string): string[] {
    const cached = this.stacks.get(id);
    if (cached) {
      return cached;
    }
    const out: string[] = [];
    const seen = new Set<string>();
    // An explicit stack: a chain of thousands of sublayers mustn't overflow the call stack.
    const todo = [id];
    while (todo.length) {
      const at = todo.pop()!;
      this.budget.charge();
      if (seen.has(at)) {
        continue;
      }
      seen.add(at);
      out.push(at);
      const next: string[] = [];
      const root = this.layer(at)?.specs.get("/");
      for (const sub of listItems(root?.fields.get("subLayers"))) {
        if (typeof sub !== "string") {
          continue;
        }
        this.budget.text(sub);
        const r = resolveAsset(this.anchor(at), sub);
        if (r && this.layer(r)) {
          this.counts.sublayers++;
          next.push(r);
        } else {
          this.unresolved(sub);
          // PcpErrorInvalidSublayerPath::ToString.
          const why = r ? this.layers.get(r)?.error : undefined;
          this.report(
            `Could not load sublayer @${quoted(r ?? sub)}@ of layer @${quoted(at)}@${
              why && why !== "missing" ? ` -- ${quoted(why)}` : ""
            }; skipping.`,
          );
        }
      }
      // Strongest first: the first sublayer is visited next.
      for (let i = next.length - 1; i >= 0; i--) {
        todo.push(next[i]!);
      }
    }
    this.stacks.set(id, out);
    return out;
  }

  anchor(id: string): string {
    return this.layers.get(id)?.anchor ?? id;
  }

  defaultPrim(stack: readonly string[]): string {
    for (const id of stack) {
      this.budget.charge();
      const d = this.layer(id)?.specs.get("/")?.fields.get("defaultPrim");
      if (typeof d === "string" && d) {
        return d.startsWith("/") ? d : `/${d}`;
      }
    }
    return "";
  }

  /** A site's specs, strongest layer first: one unit per layer of its stack. */
  specsAt(site: Site): SiteSpec[] {
    this.budget.charge(1 + site.stack.length);
    this.budget.text(site.path);
    const out: SiteSpec[] = [];
    for (const id of site.stack) {
      const spec = this.layer(id)?.specs.get(site.path);
      if (spec) {
        out.push({ id, spec });
      }
    }
    return out;
  }

  /** Adds a site's specs to the prim's gather, and indexes its variant selections: one unit per selection. */
  private gather(site: Site, g: Gather): SiteSpec[] {
    const known = g.specs.get(site);
    if (known) {
      return known;
    }
    const specs = this.specsAt(site);
    g.specs.set(site, specs);
    for (const { spec } of specs) {
      const sel = spec.fields.get("variantSelection");
      if (
        sel &&
        typeof sel === "object" &&
        !Array.isArray(sel) &&
        !("kind" in sel)
      ) {
        for (const [setName, v] of entriesOf(sel as Record<string, Value>)) {
          this.budget.charge();
          // The strongest site that selects wins: the first one gathered.
          if (
            typeof v === "string" &&
            v &&
            setName.length <= MAX_PATH &&
            !g.selections.has(setName)
          ) {
            g.selections.set(setName, v);
          }
        }
      }
    }
    return specs;
  }

  /** The sites of one prim, strongest first, with every arc on them followed. */
  expand(site: Site, g: Gather, depth = 0): void {
    const key = siteKey(site);
    this.budget.text(key);
    if (g.keys.has(key)) {
      return;
    }
    if (depth > MAX_ARC_DEPTH) {
      // Not OpenUSD's: a guard on untrusted input.
      this.report(
        `Arcs nested deeper than ${MAX_ARC_DEPTH} at @${quoted(site.stack[0]!)}@<${quoted(site.path)}>; not followed.`,
      );
      return;
    }
    g.keys.add(key);
    g.out.push(site);
    const specs = this.gather(site, g);
    const field = (name: string) =>
      composeList(
        specs.map((s) => s.spec.fields.get(name)),
        this.budget,
      );
    // The nodes a new arc from this site hangs under, root first.
    this.budget.charge(1 + site.chain.length);
    const chain: readonly Node[] = [
      ...site.chain,
      { layer: site.stack[0]!, path: site.path, arc: site.arc },
    ];
    /** pcp/primIndex.cpp, _CheckForCycle: an arc to a site in the same layer stack whose path is an ancestor or descendant of a node it hangs under. Reports it and returns true. */
    const cycles = (s: Site): boolean => {
      let hit = false;
      for (const n of chain) {
        this.budget.charge(
          1 + Math.floor(Math.min(n.path.length, s.path.length) / 16),
        );
        if (
          n.layer === s.stack[0] &&
          (hasPrefix(n.path, s.path) || hasPrefix(s.path, n.path))
        ) {
          hit = true;
          break;
        }
      }
      if (hit) {
        this.budget.charge(1 + chain.length);
        this.report(
          cycleMessage([
            ...chain,
            { layer: s.stack[0]!, path: s.path, arc: s.arc },
          ]),
        );
      }
      return hit;
    };
    const follow = (s: Site | undefined): void => {
      // A path past MAX_PATH names no spec: the parsers refuse them.
      if (!s || s.path.length > MAX_PATH) {
        return;
      }
      // A variant selection isn't checked: /A{v=x} under /A is a branch, not a cycle.
      if (s.arc === "variant" || !cycles(s)) {
        this.expand(s, g, depth + 1);
      }
    };
    /**
     * pcp/composeSite.cpp: references and payloads are anchored to the layer
     * that authored them before their list ops compose, so the same relative
     * path in two layers of a stack stays two arcs when it resolves to two
     * files.
     */
    const anchoredArcs = (fieldName: "references" | "payload") => {
      const info = new Map<string, AnchoredArc>();
      const opinions = specs.map(({ id, spec }) => {
        const anchor = (item: Value): AnchoredArc | undefined => {
          const arc = toArc(item);
          if (!arc) {
            return undefined;
          }
          this.budget.text(arc.asset);
          const resolved = arc.asset
            ? resolveAsset(this.anchor(id), arc.asset)
            : "";
          return {
            arc: { ...arc, asset: resolved ?? arc.asset },
            source: id,
            authored: arc.asset,
            resolved,
          };
        };
        // The strongest layer that adds an arc is its source.
        for (const item of listItems(spec.fields.get(fieldName))) {
          const a = anchor(item);
          if (!a) {
            continue;
          }
          const key = keyOf(JSON.stringify(a.arc));
          this.budget.text(key);
          if (!info.has(key)) {
            info.set(key, a);
          }
        }
        return mapListOp(
          spec.fields.get(fieldName),
          (item) => anchor(item)?.arc ?? item,
        );
      });
      return composeList(opinions, this.budget)
        .map((v) => info.get(keyOf(JSON.stringify(v))))
        .filter((a): a is AnchoredArc => a !== undefined);
    };
    const arcTarget = (
      a: AnchoredArc,
      kind: "reference" | "payload",
    ): Site | undefined => {
      let stack = site.stack;
      if (a.authored) {
        const r = a.resolved;
        if (!r || !this.layer(r)) {
          this.unresolved(a.authored);
          // PcpErrorInvalidAssetPath::ToString: the arc type is "reference" or "payload".
          const why = r ? this.layers.get(r)?.error : undefined;
          this.report(
            `Could not open asset @${quoted(r ?? a.authored)}@ for ${kind} introduced by @${quoted(
              a.source,
            )}@<${quoted(site.path)}>${
              why && why !== "missing" ? ` -- ${quoted(why)}` : ""
            }.`,
          );
          return undefined;
        }
        stack = this.stack(r);
      } else if (kind === "reference") {
        this.counts.internalReferences++;
      }
      const target = a.arc.primPath || this.defaultPrim(stack);
      if (!target) {
        this.unresolved(a.authored, " (no default prim)");
        return undefined;
      }
      return {
        stack,
        path: target,
        from: target,
        to: this.mapToStage(site, site.path),
        arc: kind,
        chain,
      };
    };
    // Inherits and specializes name paths in this site's layers.
    const classArc = (
      p: Value,
      arc: "inherit" | "specialize",
    ): Site | undefined =>
      typeof p === "string"
        ? {
            stack: site.stack,
            path: p,
            from: p,
            to: this.mapToStage(site, site.path),
            arc,
            chain,
          }
        : undefined;

    for (const p of field("inheritPaths")) {
      this.counts.inherits++;
      follow(classArc(p, "inherit"));
    }
    for (const setName of field("variantSetNames")) {
      if (typeof setName !== "string" || setName.length > MAX_PATH) {
        continue;
      }
      this.counts.variantSets++;
      const sel = g.selections.get(setName);
      this.selected(setName, sel);
      if (sel) {
        this.counts.variantSelections++;
        const vpath = `${site.path}{${setName}=${sel}}`;
        this.budget.text(vpath);
        follow({ ...site, path: vpath, arc: "variant", chain });
      }
    }
    for (const a of anchoredArcs("references")) {
      this.counts.references++;
      follow(arcTarget(a, "reference"));
    }
    for (const a of anchoredArcs("payload")) {
      this.counts.payloads++;
      follow(arcTarget(a, "payload"));
    }
    for (const p of field("specializes")) {
      this.counts.specializes++;
      follow(classArc(p, "specialize"));
    }
  }

  mapToStage(site: Site, path: string): string {
    this.budget.text(path);
    this.budget.text(site.from);
    const clean = stripVariants(path);
    const from = stripVariants(site.from);
    if (clean === from) {
      return site.to;
    }
    if (
      clean.startsWith(from === "/" ? "/" : `${from}/`) ||
      clean.startsWith(`${from}.`)
    ) {
      const rest = clean.slice(from === "/" ? 1 : from.length);
      if (site.to === "/") {
        return rest.startsWith("/") || rest.startsWith(".") ? rest : `/${rest}`;
      }
      return (
        site.to +
        (rest.startsWith("/") || rest.startsWith(".") ? rest : `/${rest}`)
      );
    }
    return clean; // Outside the arc's namespace: left as authored.
  }

  /**
   * Composes the whole stage from "/". When the budget runs out, it returns
   * the prims composed whole before then, and `errors` says so first.
   */
  compose(): Prim {
    try {
      const stack = this.stack(this.root);
      const root: Site = {
        stack,
        path: "/",
        from: "/",
        to: "/",
        arc: "root",
        chain: [],
      };
      return this.composePrim("/", [root]);
    } catch (e) {
      if (!(e instanceof WorkLimit)) {
        throw e;
      }
      return {
        path: "/",
        name: "",
        typeName: "",
        specifier: "def",
        fields: new Map(),
        apiSchemas: [],
        props: new Map(),
        children: [],
        sites: [],
      };
    }
  }

  composePrim(path: string, sites: readonly Site[], depth = 0): Prim {
    const g: Gather = {
      out: [],
      keys: new Set(),
      specs: new Map(),
      selections: new Map(),
    };
    if (path === "/") {
      for (const s of sites) {
        g.out.push(s);
        this.gather(s, g);
      }
    } else {
      // The sites handed down from the parent are all stronger than any arc
      // this prim's own specs add, so a selection they hold wins: index
      // theirs first.
      for (const s of sites) {
        this.gather(s, g);
      }
      for (const s of sites) {
        this.expand(s, g, 0);
      }
    }
    const all = g.out;
    const specs: (SiteSpec & { site: Site })[] = [];
    for (const s of all) {
      for (const x of g.specs.get(s)!) {
        this.budget.charge(1 + x.spec.fields.size);
        specs.push({ ...x, site: s });
      }
    }
    const strongest = (name: string): Value | undefined => {
      for (const { spec } of specs) {
        const v = spec.fields.get(name);
        if (v !== undefined) {
          return v;
        }
      }
      return undefined;
    };
    const fields = new Map<string, Value>();
    for (const { spec } of specs) {
      for (const [k, v] of spec.fields) {
        if (!fields.has(k)) {
          this.budget.keep();
          fields.set(k, v);
        }
      }
    }
    if (strongest("instanceable") === true) {
      this.counts.instanceable++;
    }

    // Properties: each spec found once through the index, in strength order
    // (sites, then the layers of each), one unit per layer and per spec.
    const byName = new Map<string, { site: Site; id: string; spec: Spec }[]>();
    for (const s of all) {
      for (const id of s.stack) {
        this.budget.charge();
        const owned = this.propIndex.get(id)?.get(s.path);
        if (!owned) {
          continue;
        }
        for (const [n, spec] of owned) {
          this.budget.charge();
          let found = byName.get(n);
          if (!found) {
            found = [];
            byName.set(n, found);
          }
          found.push({ site: s, id, spec });
        }
      }
    }
    const props = new Map<string, Prop>();
    for (const [n, found] of byName) {
      let typeName: string | undefined;
      let value: Value | undefined;
      let targets: string[] | undefined;
      let timeSamples = false;
      let kind: Prop["kind"] = "attribute";
      let layer = "";
      for (const { site: s, id, spec } of found) {
        if (!layer) {
          layer = id;
        }
        if (spec.type === "relationship") {
          kind = "relationship";
        }
        const f = spec.fields;
        typeName ??= f.get("typeName") as string | undefined;
        if (value === undefined && f.has("default")) {
          value = f.get("default");
        }
        if (f.has("timeSamples")) {
          timeSamples = true;
        }
        const t = f.get("connectionPaths") ?? f.get("targetPaths");
        if (!targets && t !== undefined) {
          targets = listItems(t)
            .filter((x): x is string => typeof x === "string")
            .map((x) => {
              this.budget.keep();
              return this.mapToStage(s, x);
            });
        }
      }
      // The property, and the record made from it later.
      this.budget.keep(2);
      props.set(n, {
        name: n,
        kind,
        typeName,
        value,
        targets: targets ?? [],
        timeSamples,
        layer,
      });
    }

    // Charged before the children: once the budget runs out, nothing after
    // them may throw, or the children composed whole would be lost.
    // The prim, its maps and its record; then each site it names, and each schema.
    this.budget.keep(4);
    for (const s of all) {
      this.budget.keep();
      this.budget.text(s.path);
    }
    const apiSchemas = composeList(
      specs.map((s) => s.spec.fields.get("apiSchemas")),
      this.budget,
    ).filter((x): x is string => typeof x === "string");
    this.budget.keep(apiSchemas.length);

    // Children: the union over every site.
    // Pcp orders children weakest first and appends what stronger sites add.
    const childNames = new Set<string>();
    for (let i = all.length - 1; i >= 0; i--) {
      const s = all[i]!;
      for (let j = s.stack.length - 1; j >= 0; j--) {
        this.budget.charge();
        for (const n of this.childIndex.get(s.stack[j]!)?.get(s.path) ?? []) {
          this.budget.charge();
          childNames.add(n);
        }
      }
    }
    const children: Prim[] = [];
    if (childNames.size && depth >= MAX_NAMESPACE_DEPTH) {
      // Not OpenUSD's: a guard on untrusted input, which no real asset reaches.
      this.report(
        `Namespace deeper than ${MAX_NAMESPACE_DEPTH} prims at <${quoted(path)}>; its children are not composed.`,
      );
      childNames.clear();
    }
    for (const n of childNames) {
      try {
        const childPath = path === "/" ? `/${n}` : `${path}/${n}`;
        this.budget.text(childPath);
        if (childPath.length > MAX_PATH) {
          // Not OpenUSD's: references can stack namespaces past any real path.
          this.report(
            `Prim path longer than ${MAX_PATH} characters at <${quoted(path)}>; not composed.`,
          );
          continue;
        }
        // Each node of the parent's graph has a counterpart one name deeper;
        // a site whose path grows past MAX_PATH names no spec, and is left out.
        const childSites: Site[] = [];
        for (const s of all) {
          this.budget.charge(1 + s.chain.length);
          this.budget.text(s.path);
          const sitePath = joinChild(s.path, n);
          if (sitePath.length <= MAX_PATH) {
            childSites.push({
              ...s,
              path: sitePath,
              chain: s.chain.map((c) => ({ ...c, path: joinChild(c.path, n) })),
            });
          }
        }
        const child = this.composePrim(childPath, childSites, depth + 1);
        if (child.fields.get("active") === false) {
          continue;
        }
        // Not defined: no layer says `def` or `class`, so USD doesn't visit it.
        if (child.specifier === "over") {
          continue;
        }
        children.push(child);
      } catch (e) {
        // Out of budget: this child is dropped, and so is every later one.
        if (e instanceof WorkLimit) {
          break;
        }
        throw e;
      }
    }

    const name = path === "/" ? "" : path.slice(path.lastIndexOf("/") + 1);
    return {
      path,
      name,
      typeName: (strongest("typeName") as string | undefined) ?? "",
      specifier: specifier(specs.map((x) => x.spec.fields.get("specifier"))),
      fields,
      apiSchemas,
      props,
      children,
      sites: all.map((s) => `${s.stack[0]}:${s.path}`),
    };
  }
}

/** usd/stage.cpp: a defining specifier beats a non-defining one, whatever the strength. */
function specifier(opinions: readonly (Value | undefined)[]): string {
  if (opinions.includes("def")) {
    return "def";
  }
  return opinions.includes("class") ? "class" : "over";
}

function joinChild(parent: string, name: string): string {
  if (parent === "/") {
    return `/${name}`;
  }
  return parent.endsWith("}") ? parent + name : `${parent}/${name}`;
}

function parentOf(path: string): string {
  // "/A/B" -> "/A"; "/A{v=x}B" -> "/A{v=x}"; "/A" -> "/".
  const slash = path.lastIndexOf("/");
  const brace = path.lastIndexOf("}");
  if (brace > slash) {
    return path.slice(0, brace + 1);
  }
  return slash <= 0 ? "/" : path.slice(0, slash);
}

function push(map: Map<string, Set<string>>, key: string, v: string): void {
  const a = map.get(key);
  if (a) {
    a.add(v);
  } else {
    map.set(key, new Set([v]));
  }
}

/**
 * A variant selection's entries, once per selection: a class's selection is
 * read again for every prim that inherits it, and a fresh array each time
 * cost more than the budget's unit.
 */
const entries = new WeakMap<object, [string, Value][]>();
function entriesOf(sel: Record<string, Value>): [string, Value][] {
  let e = entries.get(sel);
  if (!e) {
    e = Object.entries(sel);
    entries.set(sel, e);
  }
  return e;
}

/** A site's identity within one prim: its layer stack (by root layer) and path. */
function siteKey(s: Site): string {
  return `${s.stack[0]}\u0000${s.path}`;
}

/**
 * Composes list ops from strongest to weakest into one list, charging
 * `budget` one unit per element it copies or compares, and one more per 64
 * characters of each element's key.
 */
export function composeList(
  opinions: readonly (Value | undefined)[],
  budget = new Budget(Infinity),
): Value[] {
  let result: Value[] = [];
  const key = (v: Value) => {
    const k = JSON.stringify(v);
    budget.text(k);
    return keyOf(k);
  };
  for (let i = opinions.length - 1; i >= 0; i--) {
    const o = opinions[i];
    if (o === undefined || o === null) {
      continue;
    }
    if (Array.isArray(o)) {
      budget.charge(1 + o.length);
      result = [...(o as Value[])];
      continue;
    }
    if (typeof o !== "object" || !("kind" in o) || o.kind !== "listOp") {
      result = [o];
      continue;
    }
    const op = o as ListOp;
    if (op.explicit) {
      budget.charge(1 + op.explicit.length);
      result = [...op.explicit];
      continue;
    }
    const del = new Set((op.deleted ?? []).map(key));
    const pre = op.prepended ?? [];
    const app = [...(op.appended ?? []), ...(op.added ?? [])];
    const drop = new Set([...pre, ...app].map(key));
    result = [
      ...pre,
      ...result.filter((v) => {
        const k = key(v);
        return !drop.has(k) && !del.has(k);
      }),
      ...app,
    ];
  }
  return result;
}
