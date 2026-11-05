import { CustomShader } from "../scene/CustomShader.ts";
import type { InstanceType } from "../scene/slangStages.ts";
import type { UniformDeclaration } from "../scene/uniforms.ts";
import {
  compileStyleExpression,
  cssColor,
  f32,
  STYLE_HELPERS,
  type StyleNode,
  type StyleValue,
} from "../scene/styleExpression.ts";
import type { PointProperty } from "./PointSource.ts";

/**
 * The vector styling language (the vector style lab's draft, "Vector
 * styling for 3D Tiles"), compiled for point layers on the GPU: each
 * layer's fields become WGSL evaluated per point, per frame, in the
 * point's own vertex and fragment stages, so restyling, parameters and
 * the camera's distance cost no CPU per point.
 *
 * Supported so far (anything else is refused with an error at its path):
 * `parameters` (numbers, booleans, colors: `${param.name}`, set with
 * `VectorLayer.setParameter`), `defines`, `scales` (categorical, from an
 * enum's names or numbers, and linear), layer groups with `filter`, `let`
 * and `placement` inherited, and at points the `shape` mark: the
 * well-known marks (circle, dot, ring, square, diamond, triangle, star,
 * cross, x, arrow, chevron, bar) and `symbol` resources with straight-line
 * `path`s, with `size`, `rotation`, `fill.color`, `outline` (`color`,
 * `width`), `opacity` and `placement` (`rotateWith`: screen or map,
 * `offset` in pixels); and models (`model('name')`, `EXT_models`) with
 * `heading` and `scale`. Scopes: properties (`${name}`, enums compared
 * with their names), `${heading}` (the source's, degrees), `${param.…}`,
 * `${view.distance}` (meters from the camera, per point and view) and
 * `${view.time}`.
 */

export type StyleField =
  string | number | boolean | { conditions: Array<[string, StyleField]> };

export interface StyleParameter {
  type?: "number" | "boolean" | "color";
  default: number | boolean | string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<number | string | { label?: string; value: number | string }>;
}

export interface StyleScale {
  type: "categorical" | "linear";
  domain?: Array<string | number>;
  range: StyleField[] | Record<string, StyleField>;
  default?: StyleField;
}

export interface StyleLayer {
  id?: string;
  source?: string | string[];
  geometry?: "points" | "lines" | "polygons";
  filter?: StyleField;
  let?: Record<string, StyleField>;
  layers?: StyleLayer[];
  mark?: string;
  shape?: StyleField;
  size?: StyleField;
  rotation?: StyleField;
  opacity?: StyleField;
  fill?: { color?: StyleField; mix?: StyleField };
  outline?: { color?: StyleField; width?: StyleField };
  heading?: StyleField;
  scale?: StyleField;
  placement?: {
    clamp?: string;
    rotateWith?: "screen" | "map";
    offset?: StyleField[];
    plane?: string;
  };
  [key: string]: unknown;
}

export interface VectorStyleDocument {
  asset?: { version: string };
  extensionsUsed?: string[];
  parameters?: Record<string, StyleParameter>;
  defines?: Record<string, StyleField>;
  scales?: Record<string, StyleScale>;
  resources?: Record<
    string,
    { kind: string; uri?: string; path?: string; [key: string]: unknown }
  >;
  layers: StyleLayer[];
  [key: string]: unknown;
}

/** A parameter's type and default, resolved. */
export interface ResolvedParameter {
  type: "number" | "boolean" | "color";
  default: number | boolean | string;
  uniform: string;
  spec: StyleParameter;
}

/** A shape layer: a point draw with its shader. */
export interface CompiledShapeLayer {
  kind: "shape";
  path: string;
  id: string | undefined;
  source: string | undefined;
  shader: CustomShader;
  /**
   * The layer as compute functions for its points' cull (pointCull.wgsl:
   * `styleShow`, `styleSize`, `styleColor`, `styleShapeAt`, `styleOffset`), which
   * rasterizes symbols too small for quads (`World.setPointCuller`).
   */
  kernel: string;
}

/**
 * A model layer: a pool of model slots the nearest points that pass its
 * filter claim (`ModelPool`), with WGSL for the pool's kernel:
 * `styleShow(i, distance) -> bool`, `styleHeading(i, distance) -> f32`
 * (degrees) and `styleScale(i, distance) -> f32`.
 */
export interface CompiledModelLayer {
  kind: "model";
  path: string;
  id: string | undefined;
  source: string | undefined;
  /** The model resource's name, and its URI when the style gives one. */
  model: string;
  uri: string | undefined;
  code: string;
}

export interface CompiledStyle {
  parameters: Record<string, ResolvedParameter>;
  /** The parameters as uniforms, shared by the layers' shaders. */
  uniforms: Record<string, UniformDeclaration>;
  layers: Array<CompiledShapeLayer | CompiledModelLayer>;
}

const TOP_KEYS = new Set([
  "asset",
  "extensionsUsed",
  "extensionsRequired",
  "extensions",
  "extends",
  "parameters",
  "defines",
  "resources",
  "data",
  "scales",
  "slots",
  "layers",
  "legend",
  "referenceScale",
  "extras",
]);

/** Fields a point layer may set here (others are refused by name). */
const LAYER_KEYS = new Set([
  "id",
  "source",
  "geometry",
  "filter",
  "let",
  "layers",
  "mark",
  "shape",
  "size",
  "rotation",
  "opacity",
  "fill",
  "outline",
  "heading",
  "scale",
  "placement",
  "featureIds",
  "slot",
  "sortKey",
  "units",
  "extras",
]);

/** The well-known marks, by name, as signed distances in the −1…1 box. */
const MARKS = [
  "circle",
  "dot",
  "ring",
  "square",
  "diamond",
  "triangle",
  "star",
  "cross",
  "x",
  "arrow",
  "chevron",
  "bar",
] as const;

/**
 * Signed distances (negative inside) for the well-known marks, in the −1…1
 * box with y down, as SVG paths are drawn.
 */
const MARK_WGSL = `fn styleBox(p: vec2f, b: vec2f) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}
fn styleSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn styleTriangle(p: vec2f, r: f32) -> f32 {
  // Equilateral, pointing up (−y), inscribed in a circle of radius r.
  let k = sqrt(3.0);
  var q = vec2f(abs(p.x) - r * 0.866, -p.y - r * 0.25);
  if (q.x + k * q.y > 0.0) {
    q = vec2f(q.x - k * q.y, -k * q.x - q.y) / 2.0;
  }
  q.x -= clamp(q.x, -r * 1.732, 0.0);
  return -length(q) * sign(q.y);
}
fn styleStar(p0: vec2f, r: f32, rf: f32) -> f32 {
  // Five points, one up (−y).
  let k1 = vec2f(0.809016994375, -0.587785252292);
  let k2 = vec2f(-k1.x, k1.y);
  var p = vec2f(abs(p0.x), -p0.y);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  let ba = rf * vec2f(-k1.y, k1.x) - vec2f(0.0, 1.0);
  let h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
fn styleMark(k: u32, p: vec2f) -> f32 {
  switch k {
    case 0u: { return length(p) - 1.0; }
    case 1u: { return length(p) - 0.6; }
    case 2u: { return abs(length(p) - 0.75) - 0.25; }
    case 3u: { return styleBox(p, vec2f(0.85)); }
    case 4u: { return (abs(p.x) + abs(p.y) - 1.0) * 0.7071; }
    case 5u: { return styleTriangle(p + vec2f(0.0, -0.25), 1.0); }
    case 6u: { return styleStar(p, 1.0, 0.45); }
    case 7u: { return min(styleBox(p, vec2f(1.0, 0.25)), styleBox(p, vec2f(0.25, 1.0))); }
    case 8u: {
      let q = vec2f(p.x + p.y, p.y - p.x) * 0.7071;
      return min(styleBox(q, vec2f(1.0, 0.22)), styleBox(q, vec2f(0.22, 1.0)));
    }
    case 9u: {
      // Up (−y): a head and a stem.
      let head = styleTriangle(p + vec2f(0.0, 0.35), 0.65);
      return min(head, styleBox(p - vec2f(0.0, 0.4), vec2f(0.2, 0.6)));
    }
    case 10u: {
      let d = min(
        styleSegment(p, vec2f(-0.8, 0.4), vec2f(0.0, -0.4)),
        styleSegment(p, vec2f(0.0, -0.4), vec2f(0.8, 0.4)),
      );
      return d - 0.2;
    }
    default: { return styleBox(p, vec2f(1.0, 0.3)); }
  }
}
`;

/** A straight-line path (M, L, H, V, Z, absolute or relative) as polygons. */
function pathPolygons(
  path: string,
  where: string,
): Array<Array<[number, number]>> {
  const tokens =
    path.match(/[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g) ?? [];
  const polygons: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  let command = "M";
  let i = 0;
  const number = () => {
    const t = tokens[i++];
    if (t === undefined || /[A-Za-z]/.test(t)) {
      throw new Error(`${where}: path "${path}" is missing a number`);
    }
    return Number(t);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i]!)) {
      command = tokens[i++]!;
    }
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case "M":
        if (current.length > 2) {
          polygons.push(current);
        }
        x = (relative ? x : 0) + number();
        y = (relative ? y : 0) + number();
        current = [[x, y]];
        command = relative ? "l" : "L";
        break;
      case "L":
        x = (relative ? x : 0) + number();
        y = (relative ? y : 0) + number();
        current.push([x, y]);
        break;
      case "H":
        x = (relative ? x : 0) + number();
        current.push([x, y]);
        break;
      case "V":
        y = (relative ? y : 0) + number();
        current.push([x, y]);
        break;
      case "Z":
        if (current.length > 2) {
          polygons.push(current);
        }
        current = [];
        break;
      default:
        throw new Error(
          `${where}: path command ${command} isn't supported yet (straight lines: M, L, H, V, Z)`,
        );
    }
  }
  if (current.length > 2) {
    polygons.push(current);
  }
  if (!polygons.length) {
    throw new Error(`${where}: path "${path}" draws nothing`);
  }
  return polygons;
}

/** A path's signed distance in WGSL (even-odd inside, as fills are). */
function pathWgsl(
  name: string,
  polygons: Array<Array<[number, number]>>,
): string {
  const edges: string[] = [];
  for (const polygon of polygons) {
    polygon.forEach(([ax, ay], k) => {
      const [bx, by] = polygon[(k + 1) % polygon.length]!;
      edges.push(`vec4f(${f32(ax)}, ${f32(ay)}, ${f32(bx)}, ${f32(by)})`);
    });
  }
  return `fn ${name}(p: vec2f) -> f32 {
  const edges = array<vec4f, ${edges.length}>(${edges.join(", ")});
  var d = 1e9;
  var inside = false;
  for (var k = 0u; k < ${edges.length}u; k++) {
    let a = edges[k].xy;
    let b = edges[k].zw;
    d = min(d, styleSegment(p, a, b));
    if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return select(d, -d, inside);
}
`;
}

/** A name safe as a WGSL identifier. */
const ident = (name: string) => name.replace(/[^A-Za-z0-9_]/g, "_");

/** A field as expression text. */
function fieldSource(
  value: StyleField,
  kind: "color" | "number" | "boolean" | "shape",
): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const pairs = value.conditions;
    const fallback =
      kind === "color" ? "color('white')" : kind === "boolean" ? "true" : "0";
    return pairs.reduceRight<string>(
      (rest, [test, result]) =>
        `((${test}) ? (${fieldSource(result, kind)}) : (${rest}))`,
      fallback,
    );
  }
  if (kind === "color" && !value.includes("${") && cssColor(value)) {
    return `color('${value}')`;
  }
  if (kind === "shape" && /^[A-Za-z_][\w-]*$/.test(value)) {
    return `'${value}'`;
  }
  return value;
}

type Stage = "vertex" | "fragment" | "kernel";

/** Compiles a style for points with `properties` (`PointSource.layout`). */
export function compileVectorStyle(
  style: VectorStyleDocument,
  properties: Readonly<Record<string, PointProperty>>,
): CompiledStyle {
  for (const key of Object.keys(style)) {
    if (!TOP_KEYS.has(key)) {
      throw new Error(`Vector style: unknown top-level key "${key}"`);
    }
  }
  if (!Array.isArray(style.layers)) {
    throw new Error("Vector style: `layers` must be a list");
  }

  // Parameters as uniforms.
  const parameters: Record<string, ResolvedParameter> = {};
  const uniforms: Record<string, UniformDeclaration> = {};
  for (const [name, spec] of Object.entries(style.parameters ?? {})) {
    const type =
      spec.type ??
      (typeof spec.default === "boolean"
        ? "boolean"
        : typeof spec.default === "string"
          ? "color"
          : "number");
    const uniform = `param_${ident(name)}`;
    parameters[name] = { type, default: spec.default, uniform, spec };
    uniforms[uniform] =
      type === "color"
        ? {
            type: "vec4f",
            value:
              cssColor(String(spec.default)) ??
              (() => {
                throw new Error(`parameters.${name}: not a CSS color`);
              })(),
          }
        : { type: "f32", value: Number(spec.default) };
  }

  // Properties as the shaders' instance values.
  const instance: Record<string, InstanceType> = {};
  for (const [name, p] of Object.entries(properties)) {
    const type = p.type;
    instance[ident(name)] =
      typeof type === "object" ? "u32" : (type as InstanceType);
  }

  const layers: CompiledStyle["layers"] = [];

  /** Reads a name in one stage, within a layer's lets. */
  const reader =
    (
      stage: Stage,
      lets: Array<Record<string, StyleField>>,
      where: string,
      seen: Set<string>,
    ) =>
    (name: string): StyleValue => {
      if (name.startsWith("param.")) {
        const p = parameters[name.slice(6)];
        if (!p) {
          throw new Error(`${where}: no parameter ${name.slice(6)}`);
        }
        const u = `uniforms.${p.uniform}`;
        return p.type === "boolean"
          ? { wgsl: `(${u} > 0.5)`, type: "boolean" }
          : p.type === "color"
            ? { wgsl: u, type: "vec4" }
            : { wgsl: u, type: "number" };
      }
      if (name.startsWith("view.")) {
        const which = name.slice(5);
        if (which === "distance") {
          return {
            wgsl: stage === "kernel" ? "distance" : "length(cesiumAnchor)",
            type: "number",
          };
        }
        if (which === "time") {
          return {
            wgsl:
              stage === "kernel"
                ? "styleTime()"
                : stage === "vertex"
                  ? "vsInput.time"
                  : "fsInput.time",
            type: "number",
          };
        }
        throw new Error(`${where}: \${view.${which}} isn't supported yet`);
      }
      if (seen.has(name)) {
        throw new Error(`${where}: ${name} refers to itself`);
      }
      for (let k = lets.length - 1; k >= 0; k--) {
        const value = lets[k]![name];
        if (value !== undefined) {
          return compile(
            fieldSource(value, "number"),
            stage,
            lets,
            where,
            new Set([...seen, name]),
          );
        }
      }
      const define = style.defines?.[name];
      if (define !== undefined) {
        return compile(
          fieldSource(define, "number"),
          stage,
          lets,
          where,
          new Set([...seen, name]),
        );
      }
      const p = properties[name];
      if (!p) {
        throw new Error(`${where}: no property, let or define named ${name}`);
      }
      const read = (c: number) =>
        stage === "kernel"
          ? `pointF32(i, ${p.offset + c}u)`
          : `${stage === "vertex" ? "vsInput" : "fsInput"}.instance.${ident(name)}`;
      if (typeof p.type === "object" || p.type === "u32") {
        const wgsl =
          stage === "kernel"
            ? `f32(pointU32(i, ${p.offset}u))`
            : `f32(${read(0)})`;
        return typeof p.type === "object"
          ? { wgsl, type: "number", enum: p.type.enum }
          : { wgsl, type: "number" };
      }
      if (p.components === 1) {
        return { wgsl: read(0), type: "number" };
      }
      const type = `vec${p.components}` as StyleValue["type"];
      if (stage !== "kernel") {
        return { wgsl: read(0), type };
      }
      const parts = Array.from({ length: p.components }, (_, c) => read(c));
      return { wgsl: `vec${p.components}f(${parts.join(", ")})`, type };
    };

  /** `scale(name, value)`. */
  const scaleFunction =
    (where: string) =>
    (
      args: StyleNode[],
      compileNode: (node: StyleNode) => StyleValue,
    ): StyleValue => {
      const [nameNode, valueNode] = args;
      if (args.length !== 2 || nameNode?.kind !== "string") {
        throw new Error(`${where}: scale('name', value)`);
      }
      const scale = style.scales?.[nameNode.value];
      if (!scale) {
        throw new Error(`${where}: no scale ${nameNode.value}`);
      }
      const value = compileNode(valueNode!);
      const constant = (field: StyleField): StyleValue => {
        if (typeof field === "number") {
          return { wgsl: f32(field), type: "number" };
        }
        const rgba = typeof field === "string" ? cssColor(field) : undefined;
        if (!rgba) {
          throw new Error(
            `${where}: scale ${nameNode.value}: ranges are numbers or CSS colors here`,
          );
        }
        return { wgsl: `vec4f(${rgba.map(f32).join(", ")})`, type: "vec4" };
      };
      if (scale.type === "linear") {
        const [a, b] = (scale.domain ?? [0, 1]) as number[];
        const range = scale.range as StyleField[];
        const lo = constant(range[0]!);
        const hi = constant(range[range.length - 1]!);
        return {
          wgsl: `mix(${lo.wgsl}, ${hi.wgsl}, clamp((${value.wgsl} - ${f32(a!)}) / ${f32(b! - a!)}, 0.0, 1.0))`,
          type: lo.type,
        };
      }
      if (scale.type !== "categorical") {
        throw new Error(
          `${where}: scale ${nameNode.value}: ${scale.type} scales aren't supported yet`,
        );
      }
      const entries: Array<[string | number, StyleField]> = Array.isArray(
        scale.range,
      )
        ? (scale.domain ?? value.enum ?? []).map((key, k) => [
            key,
            (scale.range as StyleField[])[k]!,
          ])
        : Object.entries(scale.range);
      let out =
        scale.default !== undefined
          ? constant(scale.default)
          : constant(entries[0]?.[1] ?? 0);
      for (const [key, result] of [...entries].reverse()) {
        let test: string;
        if (value.enum) {
          const index = value.enum.indexOf(String(key));
          test = index < 0 ? "false" : `(${value.wgsl} == ${f32(index)})`;
        } else {
          test = `(${value.wgsl} == ${f32(Number(key))})`;
        }
        const r = constant(result);
        out = { wgsl: `select(${out.wgsl}, ${r.wgsl}, ${test})`, type: r.type };
      }
      return out;
    };

  function compile(
    source: string,
    stage: Stage,
    lets: Array<Record<string, StyleField>>,
    where: string,
    seen = new Set<string>(),
    string?: (value: string) => StyleValue | undefined,
  ): StyleValue {
    try {
      return compileStyleExpression(source, reader(stage, lets, where, seen), {
        functions: { scale: scaleFunction(where) },
        ...(string ? { string } : {}),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
        message.startsWith(where) ? message : `${where}: ${message}`,
        { cause: e },
      );
    }
  }

  const expect = (v: StyleValue, type: StyleValue["type"], where: string) => {
    if (v.type !== type) {
      throw new Error(`${where}: expected a ${type}, got a ${v.type}`);
    }
    return v.wgsl;
  };

  /** One drawable layer, its group's inheritance merged in. */
  function layer(
    l: StyleLayer,
    path: string,
    inherited: {
      source: string | undefined;
      filters: StyleField[];
      lets: Array<Record<string, StyleField>>;
      placement: NonNullable<StyleLayer["placement"]>;
    },
  ): void {
    for (const key of Object.keys(l)) {
      if (!LAYER_KEYS.has(key)) {
        throw new Error(
          `${path}: "${key}" isn't supported yet for point layers (text, strokes and volumes come later)`,
        );
      }
    }
    const source = Array.isArray(l.source)
      ? l.source[0]
      : (l.source ?? inherited.source);
    const filters =
      l.filter !== undefined
        ? [...inherited.filters, l.filter]
        : inherited.filters;
    const lets = l.let ? [...inherited.lets, l.let] : inherited.lets;
    const placement = { ...inherited.placement, ...(l.placement ?? {}) };
    if (l.layers) {
      l.layers.forEach((child, k) =>
        layer(child, `${path}.layers[${k}]`, {
          source,
          filters,
          lets,
          placement,
        }),
      );
      return;
    }
    if (l.geometry && l.geometry !== "points") {
      throw new Error(`${path}: only point layers are supported yet`);
    }
    const mark = l.mark ?? (l.shape !== undefined ? "shape" : "fill");
    if (mark !== "shape") {
      throw new Error(
        `${path}: the ${mark} mark isn't supported yet at points (shapes and models are)`,
      );
    }
    const filterSource = filters.length
      ? filters.map((f) => `(${fieldSource(f, "boolean")})`).join(" && ")
      : "true";

    // A model: a pool's kernel.
    const shapeText = typeof l.shape === "string" ? l.shape.trim() : undefined;
    const model =
      shapeText && /^model\(\s*(['"])([^'"]+)\1\s*\)$/.exec(shapeText);
    if (model) {
      const name = model[2]!;
      const resource = style.resources?.[name];
      if (resource && resource.kind !== "model") {
        throw new Error(
          `${path}.shape: ${name} is a ${resource.kind}, not a model`,
        );
      }
      const show = expect(
        compile(filterSource, "kernel", lets, `${path}.filter`),
        "boolean",
        `${path}.filter`,
      );
      const heading = expect(
        compile(
          fieldSource(l.heading ?? 0, "number"),
          "kernel",
          lets,
          `${path}.heading`,
        ),
        "number",
        `${path}.heading`,
      );
      const scale = expect(
        compile(
          fieldSource(l.scale ?? 1, "number"),
          "kernel",
          lets,
          `${path}.scale`,
        ),
        "number",
        `${path}.scale`,
      );
      layers.push({
        kind: "model",
        path,
        id: l.id,
        source,
        model: name,
        uri: resource?.uri,
        code: `${STYLE_HELPERS}
fn styleShow(i: u32, distance: f32) -> bool { return ${show}; }
fn styleHeading(i: u32, distance: f32) -> f32 { return ${heading}; }
fn styleScale(i: u32, distance: f32) -> f32 { return ${scale}; }
`,
      });
      return;
    }
    if (shapeText && /\bmodel\(/.test(shapeText)) {
      throw new Error(
        `${path}.shape: one model per layer, model('name'), for now`,
      );
    }

    // Shapes: the names an expression gives, each an index.
    const shapes: string[] = [];
    const symbolFunctions: string[] = [];
    const shapeIndex = (name: string): StyleValue => {
      let k = shapes.indexOf(name);
      if (k < 0) {
        const resource = style.resources?.[name];
        if (resource) {
          if (resource.kind !== "symbol" || typeof resource.path !== "string") {
            throw new Error(
              `${path}.shape: ${name} isn't a symbol with a path`,
            );
          }
          symbolFunctions.push(
            pathWgsl(
              `styleSymbol${shapes.length}`,
              pathPolygons(resource.path, `resources.${name}`),
            ),
          );
        } else if (!(MARKS as readonly string[]).includes(name)) {
          throw new Error(
            `${path}.shape: no symbol or well-known mark named ${name}`,
          );
        }
        k = shapes.push(name) - 1;
      }
      return { wgsl: f32(k), type: "number" };
    };
    const shapeSource = fieldSource(l.shape ?? "circle", "shape").replace(
      /\bsymbol\(\s*(['"])([^'"]+)\1\s*\)/g,
      "'$2'",
    );
    const shapeValue = expect(
      compile(shapeSource, "fragment", lets, `${path}.shape`, new Set(), (v) =>
        shapeIndex(v),
      ),
      "number",
      `${path}.shape`,
    );
    const shapeCases = shapes
      .map((name, k) => {
        const mark = (MARKS as readonly string[]).indexOf(name);
        return `    case ${k}u: { return ${mark >= 0 ? `styleMark(${mark}u, p)` : `styleSymbol${k}(p)`}; }`;
      })
      .join("\n");

    const number = (
      field: StyleField | undefined,
      fallback: number,
      stage: Stage,
      name: string,
    ) =>
      expect(
        compile(
          fieldSource(field ?? fallback, "number"),
          stage,
          lets,
          `${path}.${name}`,
        ),
        "number",
        `${path}.${name}`,
      );
    const color = (
      field: StyleField | undefined,
      fallback: string,
      stage: Stage,
      name: string,
    ) =>
      expect(
        compile(
          fieldSource(field ?? fallback, "color"),
          stage,
          lets,
          `${path}.${name}`,
        ),
        "vec4",
        `${path}.${name}`,
      );

    const show = expect(
      compile(filterSource, "vertex", lets, `${path}.filter`),
      "boolean",
      `${path}.filter`,
    );
    const sizeV = number(l.size, 12, "vertex", "size");
    const rotation = number(l.rotation, 0, "vertex", "rotation");
    const offset = placement.offset ?? [0, 0];
    const offsetX = number(offset[0], 0, "vertex", "placement.offset[0]");
    const offsetY = number(offset[1], 0, "vertex", "placement.offset[1]");
    const mapAligned = placement.rotateWith === "map";
    if (
      placement.rotateWith &&
      !["screen", "map"].includes(placement.rotateWith)
    ) {
      throw new Error(`${path}.placement.rotateWith: screen or map at points`);
    }
    const sizeF = number(l.size, 12, "fragment", "size");
    const fill = color(l.fill?.color, "#444444", "fragment", "fill.color");
    const outlineColor = color(
      l.outline?.color,
      "#000000",
      "fragment",
      "outline.color",
    );
    const outlineWidth = l.outline
      ? number(l.outline.width, 1, "fragment", "outline.width")
      : "0.0";
    const opacity = number(l.opacity, 1, "fragment", "opacity");
    // The same in compute, for the points' cull and splats.
    const showK = expect(
      compile(filterSource, "kernel", lets, `${path}.filter`),
      "boolean",
      `${path}.filter`,
    );
    const sizeK = number(l.size, 12, "kernel", "size");
    const offsetXK = number(offset[0], 0, "kernel", "placement.offset[0]");
    const offsetYK = number(offset[1], 0, "kernel", "placement.offset[1]");
    const fillK = color(l.fill?.color, "#444444", "kernel", "fill.color");
    const opacityK = number(l.opacity, 1, "kernel", "opacity");
    const shapeK = expect(
      compile(shapeSource, "kernel", lets, `${path}.shape`, new Set(), (v) =>
        shapeIndex(v),
      ),
      "number",
      `${path}.shape`,
    );

    const vertex = `// The point's angle on screen: clockwise from up to north (rotateWith map).
fn styleNorth() -> f32 {
  let rel = cesiumAnchor;
  let up = normalize(rel + hiLoSum(view.cameraHi, view.cameraLo));
  let north = normalize(vec3f(0.0, 0.0, 1.0) - up * up.z);
  let a = view.viewProj * vec4f(rel, 1.0);
  let b = view.viewProj * vec4f(rel + north, 1.0);
  let d = (b.xy / b.w - a.xy / a.w) / view.viewport.zw;
  return atan2(d.x, d.y);
}
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let show = ${show};
  let size = ${sizeV};
  let angle = radians(${rotation})${mapAligned ? " + styleNorth()" : ""};
  // Clockwise on screen (y up); the offset in pixels, y down.
  let c = cos(angle);
  let s = sin(angle);
  // A pixel larger each way: room for the antialiased edge.
  let q = vsInput.positionMC.xy * (size + 2.0);
  let turned = vec2f(q.x * c + q.y * s, -q.x * s + q.y * c);
  let corner = turned + vec2f(${offsetX}, -(${offsetY}));
  (*vsOutput).positionMC = vec3f(select(vec2f(0.0), corner, show), 0.0);
}
`;
    const fragment = `${MARK_WGSL}${symbolFunctions.join("")}
fn styleShape(k: u32, p: vec2f) -> f32 {
  switch k {
${shapeCases}
    default: { return 1.0; }
  }
}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let size = max(${sizeF}, 1e-3);
  // The quad is a pixel larger each way than the symbol (the vertex stage).
  let p = (fsInput.texCoord0 * 2.0 - 1.0) * (size + 2.0) / size;
  // The signed distance in pixels: the pixel's coverage, antialiased.
  let d = styleShape(u32(${shapeValue}), p) * size * 0.5;
  let coverage = clamp(0.5 - d, 0.0, 1.0);
  // An outline on the edge's inside, its width in pixels, its own edge
  // antialiased too.
  let outline = ${outlineWidth};
  let fill = ${fill};
  let edge = ${outlineColor};
  let toEdge = select(0.0, clamp(d + outline + 0.5, 0.0, 1.0), outline > 0.0);
  let color = mix(fill, edge, toEdge);
  (*material).baseColor = pow(color.rgb, vec3f(2.2));
  (*material).alpha = coverage * color.a * ${opacity};
  (*material).unlit = true;
}
`;
    const kernel = `${STYLE_HELPERS}${MARK_WGSL}${symbolFunctions.join("")}
fn styleShape(k: u32, p: vec2f) -> f32 {
  switch k {
${shapeCases}
    default: { return 1.0; }
  }
}
fn styleShow(i: u32, distance: f32) -> bool { return ${showK}; }
fn styleSize(i: u32, distance: f32) -> f32 { return ${sizeK}; }
fn styleColor(i: u32, distance: f32) -> vec4f {
  let fill = ${fillK};
  return vec4f(fill.rgb, fill.a * ${opacityK});
}
fn styleShapeAt(i: u32, distance: f32, p: vec2f) -> f32 {
  return styleShape(u32(${shapeK}), p);
}
fn styleOffset(i: u32, distance: f32) -> vec2f {
  return vec2f(${offsetXK}, ${offsetYK});
}
`;
    layers.push({
      kind: "shape",
      path,
      id: l.id,
      source,
      kernel,
      shader: new CustomShader({
        label: `vector style ${l.id ?? path}`,
        instance,
        uniforms,
        wgsl: `${STYLE_HELPERS}${vertex}${fragment}`,
      }),
    });
  }

  style.layers.forEach((l, k) =>
    layer(l, `layers[${k}]`, {
      source: undefined,
      filters: [],
      lets: [],
      placement: {},
    }),
  );
  return { parameters, uniforms, layers };
}
