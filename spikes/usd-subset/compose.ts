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
  if (!asset) {
    return undefined;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(asset)) {
    return undefined;
  } // omniverse://, http://, a URI resolver's.
  const inPackage = /^(.*\.usdz)\[(.*)\]$/.exec(asset);
  if (inPackage) {
    asset = `${inPackage[1]}/${inPackage[2]}`;
  }
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
  return (
    (asset.startsWith("/") || dir.startsWith("/") ? "/" : "") + out.join("/")
  );
}

export function parseLayer(bytes: Uint8Array): Layer {
  if (isUsdc(bytes)) {
    return readUsdc(bytes);
  }
  if (isUsda(bytes)) {
    return readUsda(bytes);
  }
  throw new Error("not a USD layer (neither PXR-USDC nor #usda)");
}

const LAYER_FILE = /\.(usd|usda|usdc|usdz)$/i;

/** Loads the root and every layer reachable through sublayers, references and payloads. */
export async function loadLayers(
  root: string,
  io: AssetIo,
): Promise<Map<string, LoadedLayer>> {
  const loaded = new Map<string, LoadedLayer>();
  /** USDZ entries, by their path inside the package as a directory. */
  const packaged = new Map<string, Uint8Array>();
  const queue = [root];
  while (queue.length) {
    const id = queue.shift()!;
    if (loaded.has(id)) {
      continue;
    }
    const t0 = performance.now();
    let bytes = packaged.get(id) ?? (await io.read(id));
    if (!bytes) {
      loaded.set(id, { id, bytes: 0, readMs: 0, error: "missing" });
      continue;
    }
    const layerId = id;
    try {
      if (isZip(bytes)) {
        const entries = readUsdz(bytes);
        for (const e of entries) {
          packaged.set(`${id}/${e.name}`, e.bytes);
        }
        const first = entries.find((e) => LAYER_FILE.test(e.name));
        if (!first) {
          throw new Error("usdz: no layer inside");
        }
        // The package's root layer stands for the package.
        bytes = first.bytes;
        const layer = parseLayer(bytes);
        // Its own relative paths resolve inside the package.
        const anchor = `${id}/${first.name}`;
        loaded.set(layerId, {
          id: layerId,
          layer,
          bytes: bytes.length,
          readMs: performance.now() - t0,
          anchor,
        });
        for (const next of arcsOf(layer, anchor)) {
          queue.push(next);
        }
        continue;
      }
      const layer = parseLayer(bytes);
      loaded.set(layerId, {
        id: layerId,
        layer,
        bytes: bytes.length,
        readMs: performance.now() - t0,
      });
      for (const next of arcsOf(layer, id)) {
        queue.push(next);
      }
    } catch (e) {
      loaded.set(id, {
        id,
        bytes: bytes.length,
        readMs: performance.now() - t0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return loaded;
}

/** The layer files a layer names: sublayers, external references and payloads. */
function arcsOf(layer: Layer, anchor: string): string[] {
  const out: string[] = [];
  for (const [, spec] of layer.specs) {
    for (const field of ["subLayers", "references", "payload"]) {
      for (const item of listItems(spec.fields.get(field))) {
        const asset =
          typeof item === "string" ? item : isArc(item) ? item.asset : "";
        const r = resolveAsset(anchor, asset);
        if (r) {
          out.push(r);
        }
      }
    }
  }
  return out;
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
  /** Variant sets and what was selected: "Physics=PhysX", or "Physics=(none)". */
  selected: string[];
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
/** The longest layer name or path an error message quotes in full. */
const MAX_QUOTED = 200;

/** A layer name or path for an error message: control characters replaced, long ones cut. */
export function quoted(text: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
  return clean.length > MAX_QUOTED
    ? `${clean.slice(0, MAX_QUOTED)}… (${clean.length} characters)`
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

const STRIP_VARIANTS = /\{[^}]*\}/g;

export class Stage {
  readonly layers: Map<string, LoadedLayer>;
  readonly root: string;
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
    unresolved: [],
    unresolvedOmitted: 0,
  };
  /** Children by parent path, per layer. */
  private readonly childIndex = new Map<string, Map<string, string[]>>();
  private readonly propIndex = new Map<string, Map<string, string[]>>();
  private readonly errorSeen = new Set<string>();
  private readonly errorList: string[] = [];
  private errorsOmitted = 0;

  constructor(layers: Map<string, LoadedLayer>, root: string) {
    this.layers = layers;
    this.root = root;
    for (const [id, l] of layers) {
      if (!l.layer) {
        continue;
      }
      const children = new Map<string, string[]>();
      const props = new Map<string, string[]>();
      for (const [path, spec] of l.layer.specs) {
        if (spec.type === "prim") {
          const parent = parentOf(path);
          const name = path.slice(parent.length).replace(/^\//, "");
          push(children, parent, name);
        } else if (spec.type === "attribute" || spec.type === "relationship") {
          const dot = path.lastIndexOf(".");
          push(props, path.slice(0, dot), path.slice(dot + 1));
        }
      }
      this.childIndex.set(id, children);
      this.propIndex.set(id, props);
    }
  }

  layer(id: string): Layer | undefined {
    return this.layers.get(id)?.layer;
  }

  /** What failed to compose, in OpenUSD's wording, once each, in the order found: the first MAX_LISTED, then a count. */
  get errors(): readonly string[] {
    return this.errorsOmitted
      ? [
          ...this.errorList,
          `${this.errorsOmitted} more composition errors not listed.`,
        ]
      : this.errorList;
  }

  private report(message: string): void {
    if (this.errorSeen.has(message)) {
      return;
    }
    this.errorSeen.add(message);
    if (this.errorList.length < MAX_LISTED) {
      this.errorList.push(message);
    } else {
      this.errorsOmitted++;
    }
  }

  private unresolved(what: string): void {
    if (this.counts.unresolved.length < MAX_LISTED) {
      this.counts.unresolved.push(quoted(what));
    } else {
      this.counts.unresolvedOmitted++;
    }
  }

  /** A layer and its sublayers, strongest first. */
  stack(id: string, seen = new Set<string>()): string[] {
    if (seen.has(id)) {
      return [];
    }
    seen.add(id);
    const out = [id];
    const root = this.layer(id)?.specs.get("/");
    for (const sub of listItems(root?.fields.get("subLayers"))) {
      const r =
        typeof sub === "string"
          ? resolveAsset(this.anchor(id), sub)
          : undefined;
      if (r && this.layer(r)) {
        this.counts.sublayers++;
        out.push(...this.stack(r, seen));
      } else if (typeof sub === "string") {
        this.unresolved(sub);
        // PcpErrorInvalidSublayerPath::ToString.
        const why = r ? this.layers.get(r)?.error : undefined;
        this.report(
          `Could not load sublayer @${quoted(r ?? sub)}@ of layer @${quoted(id)}@${
            why && why !== "missing" ? ` -- ${quoted(why)}` : ""
          }; skipping.`,
        );
      }
    }
    return out;
  }

  anchor(id: string): string {
    return this.layers.get(id)?.anchor ?? id;
  }

  defaultPrim(stack: readonly string[]): string {
    for (const id of stack) {
      const d = this.layer(id)?.specs.get("/")?.fields.get("defaultPrim");
      if (typeof d === "string" && d) {
        return d.startsWith("/") ? d : `/${d}`;
      }
    }
    return "";
  }

  specsAt(site: Site): { id: string; spec: Spec }[] {
    const out: { id: string; spec: Spec }[] = [];
    for (const id of site.stack) {
      const spec = this.layer(id)?.specs.get(site.path);
      if (spec) {
        out.push({ id, spec });
      }
    }
    return out;
  }

  /** The sites of one prim, strongest first, with every arc on them followed. */
  expand(
    site: Site,
    out: Site[],
    depth = 0,
    inherited: readonly Site[] = [],
  ): void {
    if (
      depth > 32 ||
      out.some((s) => s.stack[0] === site.stack[0] && s.path === site.path)
    ) {
      return;
    }
    out.push(site);
    const specs = this.specsAt(site);
    const field = (name: string) =>
      composeList(specs.map((s) => s.spec.fields.get(name)));
    // The nodes a new arc from this site hangs under, root first.
    const chain: readonly Node[] = [
      ...site.chain,
      { layer: site.stack[0]!, path: site.path, arc: site.arc },
    ];
    /** pcp/primIndex.cpp, _CheckForCycle: an arc to a site in the same layer stack whose path is an ancestor or descendant of a node it hangs under. Reports it and returns true. */
    const cycles = (s: Site): boolean => {
      const hit = chain.some(
        (n) =>
          n.layer === s.stack[0] &&
          (hasPrefix(n.path, s.path) || hasPrefix(s.path, n.path)),
      );
      if (hit) {
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
      // A variant selection isn't checked: /A{v=x} under /A is a branch, not a cycle.
      if (s && (s.arc === "variant" || !cycles(s))) {
        this.expand(s, out, depth + 1, inherited);
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
          const key = a && JSON.stringify(a.arc);
          if (a && key && !info.has(key)) {
            info.set(key, a);
          }
        }
        return mapListOp(
          spec.fields.get(fieldName),
          (item) => anchor(item)?.arc ?? item,
        );
      });
      return composeList(opinions)
        .map((v) => info.get(JSON.stringify(v)))
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
        this.unresolved(`${a.authored} (no default prim)`);
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
      if (typeof setName !== "string") {
        continue;
      }
      this.counts.variantSets++;
      const sel = this.selection([...inherited, ...out], setName);
      const label = `${setName}=${sel ?? "(none)"}`;
      if (!this.counts.selected.includes(label)) {
        this.counts.selected.push(label);
      }
      if (sel) {
        this.counts.variantSelections++;
        const vpath = `${site.path}{${setName}=${sel}}`;
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

  /** The strongest variant selection for a set among the sites gathered so far. */
  selection(sites: readonly Site[], setName: string): string | undefined {
    for (const s of sites) {
      for (const { spec } of this.specsAt(s)) {
        const sel = spec.fields.get("variantSelection");
        if (
          sel &&
          typeof sel === "object" &&
          !Array.isArray(sel) &&
          !("kind" in sel)
        ) {
          const v = (sel as Record<string, Value>)[setName];
          if (typeof v === "string" && v) {
            return v;
          }
        }
      }
    }
    return undefined;
  }

  mapToStage(site: Site, path: string): string {
    const clean = path.replace(STRIP_VARIANTS, "");
    const from = site.from.replace(STRIP_VARIANTS, "");
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

  /** Composes the whole stage from the root layer's default prim down, or from "/". */
  compose(): Prim {
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
  }

  composePrim(path: string, sites: readonly Site[], depth = 0): Prim {
    const all: Site[] = [];
    if (path === "/") {
      all.push(...sites);
    } else {
      for (const s of sites) {
        // The sites handed down from the parent are all stronger than any
        // arc this prim's own specs add, so a selection they hold wins.
        this.expand(s, all, 0, sites);
      }
    }
    const specs = all.flatMap((s) =>
      this.specsAt(s).map((x) => ({ ...x, site: s })),
    );
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
          fields.set(k, v);
        }
      }
    }
    if (strongest("instanceable") === true) {
      this.counts.instanceable++;
    }

    // Properties.
    const props = new Map<string, Prop>();
    const propNames: string[] = [];
    for (const s of all) {
      for (const id of s.stack) {
        for (const n of this.propIndex.get(id)?.get(s.path) ?? []) {
          if (!propNames.includes(n)) {
            propNames.push(n);
          }
        }
      }
    }
    for (const n of propNames) {
      let typeName: string | undefined;
      let value: Value | undefined;
      let targets: string[] | undefined;
      let timeSamples = false;
      let kind: Prop["kind"] = "attribute";
      let layer = "";
      for (const s of all) {
        for (const id of s.stack) {
          const spec = this.layer(id)?.specs.get(`${s.path}.${n}`);
          if (!spec) {
            continue;
          }
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
              .map((x) => this.mapToStage(s, x));
          }
        }
      }
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

    // Children: the union over every site.
    // Pcp orders children weakest first and appends what stronger sites add.
    const childNames: string[] = [];
    for (const s of [...all].reverse()) {
      for (const id of [...s.stack].reverse()) {
        for (const n of this.childIndex.get(id)?.get(s.path) ?? []) {
          if (!childNames.includes(n)) {
            childNames.push(n);
          }
        }
      }
    }
    const children: Prim[] = [];
    if (childNames.length && depth >= MAX_NAMESPACE_DEPTH) {
      // Not OpenUSD's: a guard on untrusted input, which no real asset reaches.
      this.report(
        `Namespace deeper than ${MAX_NAMESPACE_DEPTH} prims at <${quoted(path)}>; its children are not composed.`,
      );
      childNames.length = 0;
    }
    for (const n of childNames) {
      const childPath = path === "/" ? `/${n}` : `${path}/${n}`;
      // Each node of the parent's graph has a counterpart one name deeper.
      const childSites = all.map((s): Site => ({
        ...s,
        path: joinChild(s.path, n),
        chain: s.chain.map((c) => ({ ...c, path: joinChild(c.path, n) })),
      }));
      const child = this.composePrim(childPath, childSites, depth + 1);
      if (child.fields.get("active") === false) {
        continue;
      }
      // Not defined: no layer says `def` or `class`, so USD doesn't visit it.
      if (child.specifier === "over") {
        continue;
      }
      children.push(child);
    }

    const name = path === "/" ? "" : path.slice(path.lastIndexOf("/") + 1);
    return {
      path,
      name,
      typeName: (strongest("typeName") as string | undefined) ?? "",
      specifier: specifier(specs.map((x) => x.spec.fields.get("specifier"))),
      fields,
      apiSchemas: composeList(
        specs.map((s) => s.spec.fields.get("apiSchemas")),
      ).filter((x): x is string => typeof x === "string"),
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

function push(map: Map<string, string[]>, key: string, v: string): void {
  const a = map.get(key);
  if (a) {
    if (!a.includes(v)) {
      a.push(v);
    }
  } else {
    map.set(key, [v]);
  }
}

/** Composes list ops from strongest to weakest into one list. */
export function composeList(opinions: readonly (Value | undefined)[]): Value[] {
  let result: Value[] = [];
  const key = (v: Value) => JSON.stringify(v);
  for (let i = opinions.length - 1; i >= 0; i--) {
    const o = opinions[i];
    if (o === undefined || o === null) {
      continue;
    }
    if (Array.isArray(o)) {
      result = [...(o as Value[])];
      continue;
    }
    if (typeof o !== "object" || !("kind" in o) || o.kind !== "listOp") {
      result = [o];
      continue;
    }
    const op = o as ListOp;
    if (op.explicit) {
      result = [...op.explicit];
      continue;
    }
    const del = new Set((op.deleted ?? []).map(key));
    const pre = op.prepended ?? [];
    const app = [...(op.appended ?? []), ...(op.added ?? [])];
    const drop = new Set([...pre, ...app].map(key));
    result = [
      ...pre,
      ...result.filter((v) => !drop.has(key(v)) && !del.has(key(v))),
      ...app,
    ];
  }
  return result;
}
