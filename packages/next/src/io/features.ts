/**
 * Feature IDs and feature properties for glTF content:
 * - `EXT_mesh_features` vertex-attribute feature IDs and
 *   `EXT_structural_metadata` property tables (3D Tiles 1.1 content), and
 * - legacy `b3dm` tiles: header, feature table (RTC_CENTER) and batch table,
 *   with per-vertex `_BATCHID`.
 *
 * Everything here runs in content workers and produces plain, transferable
 * objects. Feature-ID textures and property textures/attributes are not
 * supported yet (warnings).
 */
import type { FeatureTable, FeatureValue } from "./gltfTypes.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";

/* eslint-disable @typescript-eslint/no-explicit-any -- glTF / 3D Tiles JSON is untyped here */
type Json = any;

/** "No feature" in a local feature-ID stream. */
export const NULL_FEATURE = 0xffffffff;

/** Which vertex attribute carries feature IDs for a primitive, if any. */
export interface FeatureIdSource {
  /** Attribute semantic, e.g. `_FEATURE_ID_0` or `_BATCHID`. */
  attribute: string;
  featureCount: number;
  /** Index into the asset's feature tables. */
  table?: number;
  nullFeatureId?: number;
}

/**
 * Picks the primitive's feature-ID set: the first `EXT_mesh_features` entry
 * backed by a vertex attribute, else a legacy `_BATCHID` attribute (b3dm).
 */
export function featureIdSource(
  primitive: Json,
  batchLength: number | undefined,
  warnings: string[],
): FeatureIdSource | undefined {
  const sets: Json[] =
    primitive.extensions?.EXT_mesh_features?.featureIds ?? [];
  for (const set of sets) {
    if (set.attribute !== undefined) {
      return {
        attribute: `_FEATURE_ID_${set.attribute}`,
        featureCount: set.featureCount,
        table: set.propertyTable,
        nullFeatureId: set.nullFeatureId,
      };
    }
  }
  if (sets.length > 0) {
    warnings.push(
      "EXT_mesh_features: feature-ID textures/implicit IDs not supported yet",
    );
  }
  for (const name of ["_BATCHID", "BATCHID"]) {
    if (
      primitive.attributes?.[name] !== undefined &&
      batchLength !== undefined
    ) {
      return { attribute: name, featureCount: batchLength, table: 0 };
    }
  }
  return undefined;
}

/** Converts float attribute data to a local u32 feature-ID stream. */
export function toFeatureIds(
  data: Float32Array,
  nullFeatureId: number | undefined,
): Uint32Array {
  const out = new Uint32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const id = Math.round(data[i]!);
    out[i] = id === nullFeatureId ? NULL_FEATURE : id;
  }
  return out;
}

const COMPONENT_BYTES: Record<string, number> = {
  INT8: 1,
  UINT8: 1,
  INT16: 2,
  UINT16: 2,
  INT32: 4,
  UINT32: 4,
  INT64: 8,
  UINT64: 8,
  FLOAT32: 4,
  FLOAT64: 8,
};

const TYPE_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

function readComponent(
  data: DataView,
  at: number,
  componentType: string,
): number {
  switch (componentType) {
    case "INT8":
      return data.getInt8(at);
    case "UINT8":
      return data.getUint8(at);
    case "INT16":
      return data.getInt16(at, true);
    case "UINT16":
      return data.getUint16(at, true);
    case "INT32":
      return data.getInt32(at, true);
    case "UINT32":
      return data.getUint32(at, true);
    case "INT64":
      return Number(data.getBigInt64(at, true));
    case "UINT64":
      return Number(data.getBigUint64(at, true));
    case "FLOAT64":
      return data.getFloat64(at, true);
    default:
      return data.getFloat32(at, true);
  }
}

function normalizedValue(value: number, componentType: string): number {
  const max: Record<string, number> = {
    INT8: 127,
    UINT8: 255,
    INT16: 32767,
    UINT16: 65535,
    INT32: 2147483647,
    UINT32: 4294967295,
  };
  const m = max[componentType];
  return m ? Math.max(value / m, -1) : value;
}

/**
 * Reads `EXT_structural_metadata` property tables into columns of plain
 * values. Supports scalars, vectors/matrices (as arrays), strings, booleans
 * and enums, with `offset`/`scale`/`normalized`; variable-length arrays are
 * skipped with a warning.
 */
export function readPropertyTables(
  json: Json,
  bufferView: (index: number) => Uint8Array,
  warnings: string[],
): FeatureTable[] {
  const metadata = json.extensions?.EXT_structural_metadata;
  if (!metadata) {
    return [];
  }
  if (!metadata.schema) {
    warnings.push("EXT_structural_metadata: external schemas not supported");
    return [];
  }
  const schema = metadata.schema;
  return (metadata.propertyTables ?? []).map((table: Json) => {
    const cls = schema.classes?.[table.class] ?? { properties: {} };
    const count: number = table.count;
    const columns: Record<string, FeatureValue[]> = {};
    for (const [name, definition] of Object.entries<Json>(
      cls.properties ?? {},
    )) {
      const property = table.properties?.[name];
      if (!property) {
        if (definition.default !== undefined) {
          columns[name] = new Array(count).fill(definition.default);
        }
        continue;
      }
      if (definition.array && definition.count === undefined) {
        warnings.push(`property ${name}: variable-length arrays not supported`);
        continue;
      }
      const column = readColumn(
        definition,
        property,
        count,
        bufferView,
        schema.enums,
      );
      if (column) {
        columns[name] = column;
      } else {
        warnings.push(
          `property ${name}: type ${definition.type} not supported`,
        );
      }
    }
    return { name: table.name, className: table.class, count, columns };
  });
}

function readColumn(
  definition: Json,
  property: Json,
  count: number,
  bufferView: (index: number) => Uint8Array,
  enums: Json,
): FeatureValue[] | undefined {
  const values = bufferView(property.values);
  const data = new DataView(
    values.buffer,
    values.byteOffset,
    values.byteLength,
  );
  const out: FeatureValue[] = new Array(count);
  const perFeature = definition.array ? definition.count : 1;

  if (definition.type === "STRING") {
    const offsets = bufferView(property.stringOffsets);
    const offsetType = property.stringOffsetType ?? "UINT32";
    const offsetView = new DataView(
      offsets.buffer,
      offsets.byteOffset,
      offsets.byteLength,
    );
    const size = COMPONENT_BYTES[offsetType]!;
    const decoder = new TextDecoder();
    const strings: string[] = [];
    for (let i = 0; i < count * perFeature; i++) {
      const begin = readComponent(offsetView, i * size, offsetType);
      const end = readComponent(offsetView, (i + 1) * size, offsetType);
      strings.push(decoder.decode(values.subarray(begin, end)));
    }
    for (let i = 0; i < count; i++) {
      out[i] = definition.array
        ? strings.slice(i * perFeature, (i + 1) * perFeature)
        : strings[i]!;
    }
    return out;
  }

  if (definition.type === "BOOLEAN") {
    for (let i = 0; i < count; i++) {
      const bits: boolean[] = [];
      for (let k = 0; k < perFeature; k++) {
        const bit = i * perFeature + k;
        bits.push(((values[bit >> 3]! >> (bit & 7)) & 1) === 1);
      }
      out[i] = definition.array ? bits : bits[0]!;
    }
    return out;
  }

  if (definition.type === "ENUM") {
    const e = enums?.[definition.enumType];
    const valueType = e?.valueType ?? "UINT16";
    const names = new Map<number, string>(
      (e?.values ?? []).map((v: Json) => [v.value, v.name]),
    );
    const size = COMPONENT_BYTES[valueType]!;
    for (let i = 0; i < count; i++) {
      const items: string[] = [];
      for (let k = 0; k < perFeature; k++) {
        const value = readComponent(
          data,
          (i * perFeature + k) * size,
          valueType,
        );
        items.push(names.get(value) ?? String(value));
      }
      out[i] = definition.array ? items : items[0]!;
    }
    return out;
  }

  const components = TYPE_COMPONENTS[definition.type];
  const componentType: string | undefined = definition.componentType;
  if (!components || !componentType) {
    return undefined;
  }
  const size = COMPONENT_BYTES[componentType]!;
  const offset = property.offset ?? definition.offset;
  const scale = property.scale ?? definition.scale;
  const transform = (value: number, c: number): number => {
    let v = definition.normalized
      ? normalizedValue(value, componentType)
      : value;
    const s = Array.isArray(scale) ? scale[c] : scale;
    const o = Array.isArray(offset) ? offset[c] : offset;
    if (s !== undefined) {
      v *= s;
    }
    if (o !== undefined) {
      v += o;
    }
    return v;
  };
  const noData = definition.noData;
  const width = components * perFeature;
  for (let i = 0; i < count; i++) {
    const items: number[] = [];
    for (let k = 0; k < width; k++) {
      items.push(
        transform(
          readComponent(data, (i * width + k) * size, componentType),
          k % components,
        ),
      );
    }
    if (width === 1) {
      const raw = readComponent(data, i * size, componentType);
      out[i] = noData !== undefined && raw === noData ? null : items[0]!;
    } else {
      out[i] = items;
    }
  }
  return out;
}

export interface B3dm {
  /** The embedded GLB. */
  glb: Uint8Array;
  /** Feature table RTC_CENTER: a translation applied to the whole model. */
  rtcCenter?: [number, number, number];
  batchLength: number;
  /** The batch table as a feature table (empty columns without one). */
  batchTable: FeatureTable;
}

/** True for a Batched 3D Model tile (magic "b3dm"). */
export function isB3dm(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 28 &&
    bytes[0] === 0x62 &&
    bytes[1] === 0x33 &&
    bytes[2] === 0x64 &&
    bytes[3] === 0x6d
  );
}

/**
 * Splits a b3dm tile into its GLB, RTC center and batch table. Handles the
 * current 28-byte header and the two deprecated 3D Tiles 1.0 layouts.
 */
export function unwrapB3dm(bytes: Uint8Array): B3dm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteLength = view.getUint32(8, true);
  let ftJsonLength = view.getUint32(12, true);
  let ftBinLength = view.getUint32(16, true);
  let btJsonLength = view.getUint32(20, true);
  let btBinLength = view.getUint32(24, true);
  let offset = 28;
  let legacyBatchLength: number | undefined;
  // The deprecated layouts are detected the way 1.x does: a length field
  // that would be ≥ 0x22000000 is really the start of the glTF ("glTF" magic).
  if (btJsonLength >= 570425344) {
    // [magic, version, byteLength, batchLength, batchTableByteLength]
    legacyBatchLength = ftJsonLength;
    btJsonLength = ftBinLength;
    ftJsonLength = ftBinLength = btBinLength = 0;
    offset = 20;
  } else if (btBinLength >= 570425344) {
    // [magic, version, byteLength, btJsonLength, btBinLength, batchLength]
    legacyBatchLength = btJsonLength;
    btJsonLength = ftJsonLength;
    btBinLength = ftBinLength;
    ftJsonLength = ftBinLength = 0;
    offset = 24;
  }
  const decoder = new TextDecoder();
  const parse = (length: number): Json =>
    length > 0
      ? JSON.parse(decoder.decode(bytes.subarray(offset, offset + length)))
      : {};
  const featureTable = parse(ftJsonLength);
  offset += ftJsonLength;
  const ftBinary = bytes.subarray(offset, offset + ftBinLength);
  offset += ftBinLength;
  const batchJson = parse(btJsonLength);
  offset += btJsonLength;
  const btBinary = bytes.subarray(offset, offset + btBinLength);
  offset += btBinLength;
  const glb = bytes.subarray(offset, byteLength);

  const batchLength: number =
    legacyBatchLength ?? featureTable.BATCH_LENGTH ?? 0;
  let rtcCenter: [number, number, number] | undefined;
  const rtc = featureTable.RTC_CENTER;
  if (Array.isArray(rtc)) {
    rtcCenter = [rtc[0], rtc[1], rtc[2]];
  } else if (rtc && typeof rtc.byteOffset === "number") {
    const d = new DataView(
      ftBinary.buffer,
      ftBinary.byteOffset + rtc.byteOffset,
      12,
    );
    rtcCenter = [
      d.getFloat32(0, true),
      d.getFloat32(4, true),
      d.getFloat32(8, true),
    ];
  }

  return {
    glb,
    rtcCenter,
    batchLength,
    batchTable: readLegacyBatchTable(batchJson, btBinary, batchLength),
  };
}

/** A legacy (b3dm, i3dm) batch table as a feature table. */
function readLegacyBatchTable(
  batchJson: Json,
  btBinary: Uint8Array,
  batchLength: number,
): FeatureTable {
  const columns: Record<string, FeatureValue[]> = {};
  const binary = new DataView(
    btBinary.buffer,
    btBinary.byteOffset,
    btBinary.byteLength,
  );
  for (const [name, property] of Object.entries<Json>(batchJson)) {
    if (name === "extensions" || name === "extras") {
      continue;
    }
    if (Array.isArray(property)) {
      columns[name] = property as FeatureValue[];
    } else if (property && typeof property.byteOffset === "number") {
      const components = TYPE_COMPONENTS[property.type] ?? 1;
      const componentType = LEGACY_COMPONENT_TYPES[property.componentType];
      if (!componentType) {
        continue;
      }
      const size = COMPONENT_BYTES[componentType]!;
      const column: FeatureValue[] = [];
      for (let i = 0; i < batchLength; i++) {
        const items: number[] = [];
        for (let c = 0; c < components; c++) {
          items.push(
            readComponent(
              binary,
              property.byteOffset + (i * components + c) * size,
              componentType,
            ),
          );
        }
        column.push(components === 1 ? items[0]! : items);
      }
      columns[name] = column;
    }
  }
  const hierarchy = batchJson.extensions?.["3DTILES_batch_table_hierarchy"];
  if (hierarchy) {
    readBatchTableHierarchy(hierarchy, binary, batchLength, columns);
  }
  return { name: "batch table", count: batchLength, columns };
}

/** An Instanced 3D Model tile (i3dm), unwrapped. */
export interface I3dm {
  /** The embedded GLB, or the URI of the glTF (relative to the tile). */
  glb?: Uint8Array;
  uri?: string;
  /**
   * Per instance, column-major 4×4: rotation and scale, and the position
   * relative to `origin` (tile space; glTF y-up is corrected after it).
   */
  matrices: Float64Array;
  /** RTC_CENTER, else the instances' center: keeps translations small. */
  origin: [number, number, number];
  /** BATCH_ID per instance (default: the instance index). */
  batchIds: Uint32Array;
  batchLength: number;
  batchTable: FeatureTable;
}

/** True for an Instanced 3D Model tile (magic "i3dm"). */
export function isI3dm(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 32 &&
    bytes[0] === 0x69 &&
    bytes[1] === 0x33 &&
    bytes[2] === 0x64 &&
    bytes[3] === 0x6d
  );
}

/**
 * Splits an i3dm tile into its glTF (embedded or by URI), per-instance
 * matrices and batch table, as 1.x's I3dmLoader reads it: positions (or
 * quantized positions) plus RTC_CENTER; orientation from NORMAL_UP and
 * NORMAL_RIGHT (columns right, up, right × up), their oct-encoded forms,
 * EAST_NORTH_UP at the position, or none; SCALE and SCALE_NON_UNIFORM.
 */
export function unwrapI3dm(bytes: Uint8Array): I3dm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteLength = view.getUint32(8, true);
  const ftJsonLength = view.getUint32(12, true);
  const ftBinLength = view.getUint32(16, true);
  const btJsonLength = view.getUint32(20, true);
  const btBinLength = view.getUint32(24, true);
  const gltfFormat = view.getUint32(28, true);
  let offset = 32;
  const decoder = new TextDecoder();
  const parse = (length: number): Json =>
    length > 0
      ? JSON.parse(decoder.decode(bytes.subarray(offset, offset + length)))
      : {};
  const ft = parse(ftJsonLength);
  offset += ftJsonLength;
  const ftBinary = bytes.subarray(offset, offset + ftBinLength);
  offset += ftBinLength;
  const batchJson = parse(btJsonLength);
  offset += btJsonLength;
  const btBinary = bytes.subarray(offset, offset + btBinLength);
  offset += btBinLength;
  const gltf = bytes.subarray(offset, byteLength);

  const n: number = ft.INSTANCES_LENGTH ?? 0;
  const fb = new DataView(
    ftBinary.buffer,
    ftBinary.byteOffset,
    ftBinary.byteLength,
  );
  const SIZES: Record<string, number> = {
    BYTE: 1,
    UNSIGNED_BYTE: 1,
    SHORT: 2,
    UNSIGNED_SHORT: 2,
    INT: 4,
    UNSIGNED_INT: 4,
    FLOAT: 4,
    DOUBLE: 8,
  };
  const readOne = (at: number, type: string): number => {
    switch (type) {
      case "BYTE":
        return fb.getInt8(at);
      case "UNSIGNED_BYTE":
        return fb.getUint8(at);
      case "SHORT":
        return fb.getInt16(at, true);
      case "UNSIGNED_SHORT":
        return fb.getUint16(at, true);
      case "INT":
        return fb.getInt32(at, true);
      case "UNSIGNED_INT":
        return fb.getUint32(at, true);
      case "DOUBLE":
        return fb.getFloat64(at, true);
      default:
        return fb.getFloat32(at, true);
    }
  };
  /** A per-instance property: `components` values per instance. */
  const property = (
    name: string,
    components: number,
    defaultType: string,
  ): Float64Array | undefined => {
    const value = ft[name];
    if (!value || typeof value.byteOffset !== "number") {
      return undefined;
    }
    const type: string = value.componentType ?? defaultType;
    const size = SIZES[type] ?? 4;
    const out = new Float64Array(n * components);
    for (let i = 0; i < out.length; i++) {
      out[i] = readOne(value.byteOffset + i * size, type);
    }
    return out;
  };
  /** A global property: an inline array or a binary reference. */
  const global = (name: string, components: number): number[] | undefined => {
    const value = ft[name];
    if (Array.isArray(value)) {
      return value as number[];
    }
    if (value && typeof value.byteOffset === "number") {
      return Array.from({ length: components }, (_, k) =>
        fb.getFloat32(value.byteOffset + k * 4, true),
      );
    }
    return undefined;
  };

  let positions = property("POSITION", 3, "FLOAT");
  if (!positions) {
    const quantized = property("POSITION_QUANTIZED", 3, "UNSIGNED_SHORT");
    const qOffset = global("QUANTIZED_VOLUME_OFFSET", 3);
    const qScale = global("QUANTIZED_VOLUME_SCALE", 3);
    if (!quantized || !qOffset || !qScale) {
      throw new Error("i3dm: no POSITION or POSITION_QUANTIZED");
    }
    positions = quantized.map(
      (q, i) => (q / 65535) * qScale[i % 3]! + qOffset[i % 3]!,
    );
  }
  const rtc = global("RTC_CENTER", 3);
  // Translations relative to RTC_CENTER, else to the instances' center.
  const origin: [number, number, number] = [0, 0, 0];
  if (rtc && (rtc[0] !== 0 || rtc[1] !== 0 || rtc[2] !== 0)) {
    origin[0] = rtc[0]!;
    origin[1] = rtc[1]!;
    origin[2] = rtc[2]!;
  } else if (n > 0) {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        origin[k] = origin[k]! + positions[i * 3 + k]! / n;
      }
    }
  }
  const rtcOffset = rtc ?? [0, 0, 0];

  const up = property("NORMAL_UP", 3, "FLOAT");
  const right = property("NORMAL_RIGHT", 3, "FLOAT");
  const upOct = property("NORMAL_UP_OCT32P", 2, "UNSIGNED_SHORT");
  const rightOct = property("NORMAL_RIGHT_OCT32P", 2, "UNSIGNED_SHORT");
  const eastNorthUp = ft.EAST_NORTH_UP === true;
  const scale = property("SCALE", 1, "FLOAT");
  const scaleNonUniform = property("SCALE_NON_UNIFORM", 3, "FLOAT");
  const batch = property("BATCH_ID", 1, "UNSIGNED_SHORT");

  const matrices = new Float64Array(n * 16);
  const batchIds = new Uint32Array(n);
  const u = [0, 0, 1];
  const r = [1, 0, 0];
  const enu = new Float64Array(16);
  for (let i = 0; i < n; i++) {
    const p = [0, 1, 2].map((k) => positions[i * 3 + k]! + rtcOffset[k]!);
    let x = [1, 0, 0];
    let y = [0, 1, 0];
    let z = [0, 0, 1];
    if ((up && right) || (upOct && rightOct)) {
      if (up && right) {
        for (let k = 0; k < 3; k++) {
          u[k] = up[i * 3 + k]!;
          r[k] = right[i * 3 + k]!;
        }
      } else {
        octDecode(upOct![i * 2]!, upOct![i * 2 + 1]!, u);
        octDecode(rightOct![i * 2]!, rightOct![i * 2 + 1]!, r);
      }
      const f = [
        r[1]! * u[2]! - r[2]! * u[1]!,
        r[2]! * u[0]! - r[0]! * u[2]!,
        r[0]! * u[1]! - r[1]! * u[0]!,
      ];
      const length = Math.hypot(f[0]!, f[1]!, f[2]!) || 1;
      x = [...r];
      y = [...u];
      z = f.map((v) => v / length);
    } else if (eastNorthUp) {
      eastNorthUpToFixedFrame(Float64Array.from(p), Ellipsoid.WGS84, enu);
      x = [enu[0]!, enu[1]!, enu[2]!];
      y = [enu[4]!, enu[5]!, enu[6]!];
      z = [enu[8]!, enu[9]!, enu[10]!];
    }
    const s0 = scale?.[i] ?? 1;
    const sx = s0 * (scaleNonUniform?.[i * 3] ?? 1);
    const sy = s0 * (scaleNonUniform?.[i * 3 + 1] ?? 1);
    const sz = s0 * (scaleNonUniform?.[i * 3 + 2] ?? 1);
    const o = i * 16;
    for (let k = 0; k < 3; k++) {
      matrices[o + k] = x[k]! * sx;
      matrices[o + 4 + k] = y[k]! * sy;
      matrices[o + 8 + k] = z[k]! * sz;
      matrices[o + 12 + k] = p[k]! - origin[k]!;
    }
    matrices[o + 15] = 1;
    batchIds[i] = batch ? batch[i]! : i;
  }

  const batchLength: number =
    ft.BATCH_LENGTH ?? (batch ? Math.max(0, ...Array.from(batchIds)) + 1 : n);
  return {
    ...(gltfFormat === 1
      ? { glb: gltf }
      : { uri: decoder.decode(gltf).replace(/[\s\0]+$/, "") }),
    matrices,
    origin,
    batchIds,
    batchLength,
    batchTable: readLegacyBatchTable(batchJson, btBinary, batchLength),
  };
}

/** Oct-decodes a unit vector from two values in 0..65535 (1.x octDecodeInRange). */
function octDecode(xq: number, yq: number, out: number[]): void {
  let x = (xq / 65535) * 2 - 1;
  let y = (yq / 65535) * 2 - 1;
  const z = 1 - (Math.abs(x) + Math.abs(y));
  if (z < 0) {
    const ox = x;
    x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1);
    y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1);
  }
  const length = Math.hypot(x, y, z) || 1;
  out[0] = x / length;
  out[1] = y / length;
  out[2] = z / length;
}

/** A legacy batch-table value array: inline JSON or a binary reference. */
function legacyArray(
  value: Json,
  binary: DataView,
  count: number,
  defaultComponentType: string,
): FeatureValue[] | undefined {
  if (Array.isArray(value)) {
    return value as FeatureValue[];
  }
  if (!value || typeof value.byteOffset !== "number") {
    return undefined;
  }
  const componentType =
    LEGACY_COMPONENT_TYPES[value.componentType ?? defaultComponentType];
  if (!componentType) {
    return undefined;
  }
  const components = TYPE_COMPONENTS[value.type ?? "SCALAR"] ?? 1;
  const size = COMPONENT_BYTES[componentType]!;
  const out: FeatureValue[] = [];
  for (let i = 0; i < count; i++) {
    const items: number[] = [];
    for (let c = 0; c < components; c++) {
      items.push(
        readComponent(
          binary,
          value.byteOffset + (i * components + c) * size,
          componentType,
        ),
      );
    }
    out.push(components === 1 ? items[0]! : items);
  }
  return out;
}

/**
 * `3DTILES_batch_table_hierarchy` (used by Cesium OSM Buildings): each
 * feature is an instance of a class with per-class property columns, and a
 * property missing on an instance is looked up through its parents, as 1.x
 * `BatchTableHierarchy.getProperty` does.
 */
function readBatchTableHierarchy(
  hierarchy: Json,
  binary: DataView,
  batchLength: number,
  columns: Record<string, FeatureValue[]>,
): void {
  const instances: number = hierarchy.instancesLength;
  const classIds = legacyArray(
    hierarchy.classIds,
    binary,
    instances,
    "UNSIGNED_SHORT",
  ) as number[] | undefined;
  if (!classIds) {
    return;
  }
  const parentCounts = hierarchy.parentCounts
    ? (legacyArray(
        hierarchy.parentCounts,
        binary,
        instances,
        "UNSIGNED_SHORT",
      ) as number[])
    : undefined;
  const parentIndexes: number[] = [];
  let parentIdsLength = instances;
  if (parentCounts) {
    parentIdsLength = 0;
    for (let i = 0; i < instances; i++) {
      parentIndexes.push(parentIdsLength);
      parentIdsLength += parentCounts[i]!;
    }
  }
  const parentIds = hierarchy.parentIds
    ? (legacyArray(
        hierarchy.parentIds,
        binary,
        parentIdsLength,
        "UNSIGNED_SHORT",
      ) as number[])
    : undefined;
  const classes: Array<{ properties: Record<string, FeatureValue[]> }> = (
    hierarchy.classes ?? []
  ).map((cls: Json) => {
    const properties: Record<string, FeatureValue[]> = {};
    for (const [name, value] of Object.entries<Json>(cls.instances ?? {})) {
      const column = legacyArray(value, binary, cls.length, "FLOAT");
      if (column) {
        properties[name] = column;
      }
    }
    return { properties };
  });
  const classCounts = new Array<number>(classes.length).fill(0);
  const classIndexes = classIds.map((id) => classCounts[id]!++);

  for (let feature = 0; feature < batchLength; feature++) {
    const visited = new Set<number>();
    const stack = [feature];
    while (stack.length > 0) {
      const instance = stack.pop()!;
      if (visited.has(instance)) {
        continue;
      }
      visited.add(instance);
      const cls = classes[classIds[instance]!];
      if (cls) {
        for (const [name, column] of Object.entries(cls.properties)) {
          const target = (columns[name] ??= new Array<FeatureValue>(
            batchLength,
          ).fill(null));
          if (target[feature] === null || target[feature] === undefined) {
            target[feature] = column[classIndexes[instance]!] ?? null;
          }
        }
      }
      if (parentIds) {
        const count = parentCounts ? parentCounts[instance]! : 1;
        const base = parentCounts ? parentIndexes[instance]! : instance;
        for (let k = 0; k < count; k++) {
          const parent = parentIds[base + k]!;
          if (parent !== instance) {
            stack.push(parent);
          }
        }
      }
    }
  }
}

const LEGACY_COMPONENT_TYPES: Record<string, string> = {
  BYTE: "INT8",
  UNSIGNED_BYTE: "UINT8",
  SHORT: "INT16",
  UNSIGNED_SHORT: "UINT16",
  INT: "INT32",
  UNSIGNED_INT: "UINT32",
  FLOAT: "FLOAT32",
  DOUBLE: "FLOAT64",
};

/**
 * Columns that typically name a feature, in order of preference. `element`
 * is the iTwin element ID in iModel-derived tilesets.
 */
const NAME_COLUMNS = [
  "name",
  "Name",
  "NAME",
  "title",
  "id",
  "ID",
  "Id",
  "element",
];

/** A display name for feature `index` of `table`. */
export function featureName(
  table: FeatureTable,
  index: number,
): string | undefined {
  for (const column of NAME_COLUMNS) {
    const value = table.columns[column]?.[index];
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }
  return undefined;
}

/** All properties of feature `index`. */
export function featureProperties(
  table: FeatureTable,
  index: number,
): Record<string, FeatureValue> {
  const out: Record<string, FeatureValue> = {};
  for (const [name, column] of Object.entries(table.columns)) {
    out[name] = column[index]!;
  }
  return out;
}
