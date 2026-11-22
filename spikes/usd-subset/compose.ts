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

/** Joins an asset path to the directory of the layer that names it. Returns undefined for URLs and search paths it can't resolve. */
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
  unresolved: string[];
}

interface Site {
  readonly stack: readonly string[];
  readonly path: string;
  /** Maps this site's namespace to the stage's: a prefix in the layer and the prim it lands on. */
  readonly from: string;
  readonly to: string;
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
  };
  /** Children by parent path, per layer. */
  private readonly childIndex = new Map<string, Map<string, string[]>>();
  private readonly propIndex = new Map<string, Map<string, string[]>>();
  /** What failed to compose, in OpenUSD's wording, once each, in the order found. */
  readonly errors: string[] = [];

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

  private report(message: string): void {
    if (!this.errors.includes(message)) {
      this.errors.push(message);
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
        this.counts.unresolved.push(sub);
        // PcpErrorInvalidSublayerPath::ToString.
        const why = r ? this.layers.get(r)?.error : undefined;
        this.report(
          `Could not load sublayer @${r ?? sub}@ of layer @${id}@${
            why && why !== "missing" ? ` -- ${why}` : ""
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
    const arcTarget = (
      item: Value,
      kind: "references" | "payloads",
    ): Site | undefined => {
      // The layer that authored the arc: its asset paths are relative to it.
      const fieldName = kind === "references" ? "references" : "payload";
      const itemKey = JSON.stringify(item);
      const source =
        specs.find(({ spec }) =>
          listItems(spec.fields.get(fieldName)).some(
            (x) => JSON.stringify(x) === itemKey,
          ),
        )?.id ?? site.stack[0]!;
      const arc: Arc | undefined = isArc(item)
        ? item
        : typeof item === "string"
          ? { kind: "arc", asset: item, primPath: "" }
          : undefined;
      if (!arc) {
        return undefined;
      }
      let stack = site.stack;
      if (arc.asset) {
        const r = resolveAsset(this.anchor(source), arc.asset);
        if (!r || !this.layer(r)) {
          this.counts.unresolved.push(arc.asset);
          // PcpErrorInvalidAssetPath::ToString: the arc type is "reference" or "payload".
          const why = r ? this.layers.get(r)?.error : undefined;
          this.report(
            `Could not open asset @${r ?? arc.asset}@ for ${
              kind === "references" ? "reference" : "payload"
            } introduced by @${source}@<${site.path}>${
              why && why !== "missing" ? ` -- ${why}` : ""
            }.`,
          );
          return undefined;
        }
        stack = this.stack(r);
      } else if (kind === "references") {
        this.counts.internalReferences++;
      }
      const target = arc.primPath || this.defaultPrim(stack);
      if (!target) {
        this.counts.unresolved.push(`${arc.asset} (no default prim)`);
        return undefined;
      }
      return {
        stack,
        path: target,
        from: target,
        to: this.mapToStage(site, site.path),
      };
    };
    // Inherits and specializes name paths in this site's layers.
    const classArc = (p: Value): Site | undefined =>
      typeof p === "string"
        ? {
            stack: site.stack,
            path: p,
            from: p,
            to: this.mapToStage(site, site.path),
          }
        : undefined;

    for (const p of field("inheritPaths")) {
      this.counts.inherits++;
      const s = classArc(p);
      if (s) {
        this.expand(s, out, depth + 1, inherited);
      }
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
        this.expand({ ...site, path: vpath }, out, depth + 1, inherited);
      }
    }
    for (const item of field("references")) {
      this.counts.references++;
      const s = arcTarget(item, "references");
      if (s) {
        this.expand(s, out, depth + 1, inherited);
      }
    }
    for (const item of field("payload")) {
      this.counts.payloads++;
      const s = arcTarget(item, "payloads");
      if (s) {
        this.expand(s, out, depth + 1, inherited);
      }
    }
    for (const p of field("specializes")) {
      this.counts.specializes++;
      const s = classArc(p);
      if (s) {
        this.expand(s, out, depth + 1, inherited);
      }
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
    const root: Site = { stack, path: "/", from: "/", to: "/" };
    return this.composePrim("/", [root]);
  }

  composePrim(path: string, sites: readonly Site[]): Prim {
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
    for (const n of childNames) {
      const childPath = path === "/" ? `/${n}` : `${path}/${n}`;
      const childSites = all.map((s) => ({ ...s, path: joinChild(s.path, n) }));
      const child = this.composePrim(childPath, childSites);
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
