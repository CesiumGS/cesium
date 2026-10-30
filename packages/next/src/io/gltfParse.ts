import { MeshoptDecoder } from "meshoptimizer/decoder";
import {
  decodeDraco,
  transcodeKtx2,
  type DracoAttributeRequest,
  type TextureFormatSupport,
} from "./decoders.ts";
import {
  featureIdSource,
  isB3dm,
  readPropertyTables,
  toFeatureIds,
  unwrapB3dm,
  type B3dm,
} from "./features.ts";
import { resolveUri } from "./ion.ts";
import type {
  GltfAsset,
  GltfDraw,
  GltfImage,
  GltfMaterial,
  GltfMesh,
  GltfSampler,
  GltfTexture,
} from "./gltfTypes.ts";

/* eslint-disable @typescript-eslint/no-explicit-any -- glTF JSON is untyped here */
type Json = any;

const SUPPORTED_EXTENSIONS = new Set([
  "KHR_materials_unlit",
  "KHR_mesh_quantization",
  "KHR_draco_mesh_compression",
  "KHR_texture_basisu",
  "EXT_meshopt_compression",
  "KHR_meshopt_compression",
  "KHR_texture_transform", // tolerated; transforms are ignored (warning)
  "CESIUM_primitive_outline", // tolerated; outlines are not drawn yet
  "EXT_mesh_features", // vertex-attribute feature IDs
  "EXT_structural_metadata", // property tables
]);

const COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

/**
 * Parses a glTF 2.0 or GLB asset into GPU-ready streams. Runs in a worker:
 * fetching, decoding (meshopt, Draco, images, KTX2/Basis transcoding to the
 * device's block formats) and attribute conversion all happen off the main
 * thread. Returns the asset and the list of transferables.
 */
export async function parseGltf(
  url: string,
  textureSupport: TextureFormatSupport,
  headers?: Record<string, string>,
): Promise<{ asset: GltfAsset; transfer: Transferable[] }> {
  // Every request under the asset carries the same headers (ion auth).
  const fetchUri = (uri: string) =>
    fetch(resolveUri(uri, url), headers ? { headers } : undefined);
  const fetchStart = performance.now();
  const response = await fetch(url, headers ? { headers } : undefined);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  let bytes: Uint8Array = new Uint8Array(await response.arrayBuffer());
  const decodeStart = performance.now();
  const received = bytes.byteLength;
  const imageTypes: Record<string, number> = {};
  let b3dm: B3dm | undefined;
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (["pnts", "i3dm", "cmpt", "vctr", "geom"].includes(magic)) {
    throw new Error(`unsupported tile format: ${magic}`);
  }
  if (isB3dm(bytes)) {
    b3dm = unwrapB3dm(bytes);
    bytes = b3dm.glb;
  }
  const isGlb =
    bytes.byteLength >= 4 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "glTF";
  const { json, bin } = splitGlb(bytes);
  const warnings: string[] = [];

  for (const name of json.extensionsRequired ?? []) {
    if (!SUPPORTED_EXTENSIONS.has(name)) {
      throw new Error(`Unsupported required glTF extension: ${name}`);
    }
  }
  for (const name of json.extensionsUsed ?? []) {
    if (!SUPPORTED_EXTENSIONS.has(name)) {
      warnings.push(`ignored extension ${name}`);
    }
  }

  const buffers = await Promise.all(
    (json.buffers ?? []).map(async (buffer: Json, i: number) => {
      if (buffer.uri === undefined) {
        if (i === 0 && bin) {
          return bin;
        }
        // A meshopt fallback buffer carries no data; the compressed views
        // that reference it are decoded from their own source buffer.
        const ext =
          buffer.extensions?.EXT_meshopt_compression ??
          buffer.extensions?.KHR_meshopt_compression;
        if (ext?.fallback) {
          return new Uint8Array(0);
        }
        throw new Error(`Buffer ${i} has no data.`);
      }
      const r = await fetchUri(buffer.uri);
      return new Uint8Array(await r.arrayBuffer());
    }),
  );

  if (usesMeshopt(json)) {
    await MeshoptDecoder.ready;
  }
  const viewCache = new Map<number, Uint8Array>();
  const bufferView = (index: number): Uint8Array => {
    let view = viewCache.get(index);
    if (!view) {
      view = decodeBufferView(json, buffers, index);
      viewCache.set(index, view);
    }
    return view;
  };

  const readAccessor = (
    index: number,
  ): { data: Float32Array; components: number; count: number } => {
    const accessor = json.accessors[index];
    if (accessor.sparse) {
      warnings.push(`accessor ${index}: sparse data ignored`);
    }
    const components = COMPONENTS[accessor.type]!;
    const count: number = accessor.count;
    const out = new Float32Array(count * components);
    if (accessor.bufferView === undefined) {
      return { data: out, components, count };
    }
    const view = bufferView(accessor.bufferView);
    const stride = json.bufferViews[accessor.bufferView].byteStride ?? 0;
    readComponents(
      view,
      accessor.byteOffset ?? 0,
      stride,
      accessor.componentType,
      components,
      count,
      accessor.normalized ?? false,
      out,
    );
    return { data: out, components, count };
  };

  const readIndices = (index: number): Uint32Array => {
    const accessor = json.accessors[index];
    const view = bufferView(accessor.bufferView);
    const offset = view.byteOffset + (accessor.byteOffset ?? 0);
    const count: number = accessor.count;
    switch (accessor.componentType) {
      case 5121:
        return Uint32Array.from(new Uint8Array(view.buffer, offset, count));
      case 5123:
        return Uint32Array.from(
          new Uint16Array(copyAligned(view.buffer, offset, count * 2, 2)),
        );
      default:
        return new Uint32Array(copyAligned(view.buffer, offset, count * 4, 4));
    }
  };

  // Meshes: one entry per (mesh, primitive), deduplicated across nodes.
  // Collect the scene's node primitives with their world matrices (float64),
  // then build each distinct (mesh, primitive) once.
  const instances: Array<{
    key: string;
    meshIndex: number;
    primitive: number;
    matrix: Float64Array;
  }> = [];
  const visit = (nodeIndex: number, parent: Float64Array) => {
    const node = json.nodes[nodeIndex];
    const world = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      json.meshes[node.mesh].primitives.forEach((_: Json, p: number) => {
        instances.push({
          key: `${node.mesh}/${p}`,
          meshIndex: node.mesh,
          primitive: p,
          matrix: world,
        });
      });
    }
    for (const child of node.children ?? []) {
      visit(child, world);
    }
  };
  const scene = json.scenes?.[json.scene ?? 0];
  for (const root of scene?.nodes ?? []) {
    visit(root, identity());
  }

  const meshes: GltfMesh[] = [];
  const built = new Map<string, { mesh: number; material: number } | null>();
  for (const { key, meshIndex, primitive: p } of instances) {
    if (built.has(key)) {
      continue;
    }
    const primitive = json.meshes[meshIndex].primitives[p];
    const source = await attributeSource(
      json,
      primitive,
      bufferView,
      readAccessor,
      readIndices,
    );
    const mesh = buildMesh(primitive, source, warnings, key);
    const features = featureIdSource(primitive, b3dm?.batchLength, warnings);
    const ids = features && source.attribute(features.attribute);
    if (mesh && features && ids) {
      const local = toFeatureIds(ids.data, features.nullFeatureId);
      // flatShaded unwelds through the index list, as recorded in `unwelded`.
      mesh.featureIds = mesh.unwelded
        ? Uint32Array.from(mesh.unwelded, (v) => local[v]!)
        : local;
      mesh.featureCount = features.featureCount;
      if (features.table !== undefined) {
        mesh.featureTable = features.table;
      }
    }
    if (mesh) {
      delete mesh.unwelded;
      meshes.push(mesh);
    }
    built.set(
      key,
      mesh
        ? { mesh: meshes.length - 1, material: primitive.material ?? -1 }
        : null,
    );
  }
  const draws: GltfDraw[] = [];
  for (const { key, matrix } of instances) {
    const entry = built.get(key);
    if (entry) {
      draws.push({ mesh: entry.mesh, material: entry.material, matrix });
    }
  }

  const materials: GltfMaterial[] = (json.materials ?? []).map((m: Json) =>
    parseMaterial(m, warnings),
  );
  const textures: GltfTexture[] = (json.textures ?? []).map((t: Json) => ({
    image: t.extensions?.KHR_texture_basisu?.source ?? t.source,
    sampler: parseSampler(json.samplers?.[t.sampler]),
  }));
  const images: GltfImage[] = await Promise.all(
    (json.images ?? []).map(async (image: Json) => {
      const bytes =
        image.bufferView !== undefined
          ? bufferView(image.bufferView).slice()
          : new Uint8Array(await (await fetchUri(image.uri)).arrayBuffer());
      const ktx2 =
        image.mimeType === "image/ktx2" || /\.ktx2$/i.test(image.uri ?? "");
      const type = ktx2
        ? "image/ktx2"
        : (image.mimeType ??
          (/\.png$/i.test(image.uri ?? "") ? "image/png" : "image/jpeg"));
      imageTypes[type] = (imageTypes[type] ?? 0) + 1;
      if (ktx2) {
        return transcodeKtx2(bytes, textureSupport);
      }
      return createImageBitmap(new Blob([bytes], { type: image.mimeType }), {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
    }),
  );

  const featureTables = b3dm
    ? [b3dm.batchTable]
    : readPropertyTables(json, bufferView, warnings);

  const transfer: Transferable[] = [];
  for (const image of images) {
    if (image instanceof ImageBitmap) {
      transfer.push(image);
    } else {
      transfer.push(...image.levels.map((level) => level.buffer));
    }
  }
  for (const mesh of meshes) {
    for (const array of [
      mesh.positions,
      mesh.normals,
      mesh.uvs,
      mesh.colors,
      mesh.tangents,
      mesh.indices,
      mesh.featureIds,
    ]) {
      if (array) {
        transfer.push(array.buffer);
      }
    }
  }
  return {
    asset: {
      meshes,
      materials,
      textures,
      images,
      draws,
      featureTables,
      ...(b3dm?.rtcCenter ? { rtcCenter: b3dm.rtcCenter } : {}),
      ...(typeof json.asset?.copyright === "string" && json.asset.copyright
        ? { copyright: json.asset.copyright }
        : {}),
      warnings,
      timing: {
        format: b3dm ? "b3dm" : bin !== undefined || isGlb ? "glb" : "gltf",
        networkMs: decodeStart - fetchStart,
        bytes: received,
        decodeMs: performance.now() - decodeStart,
        images: imageTypes,
      },
    },
    transfer,
  };
}

function splitGlb(bytes: Uint8Array): { json: Json; bin?: Uint8Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= 12 && view.getUint32(0, true) === 0x46546c67) {
    let offset = 12;
    let json: Json;
    let bin: Uint8Array | undefined;
    while (offset < bytes.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      const chunk = bytes.subarray(offset + 8, offset + 8 + length);
      if (type === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(chunk));
      } else if (type === 0x004e4942) {
        bin = chunk;
      }
      offset += 8 + length;
    }
    return { json, bin };
  }
  return { json: JSON.parse(new TextDecoder().decode(bytes)) };
}

function usesMeshopt(json: Json): boolean {
  return (json.bufferViews ?? []).some(
    (v: Json) =>
      v.extensions?.EXT_meshopt_compression ||
      v.extensions?.KHR_meshopt_compression,
  );
}

function decodeBufferView(
  json: Json,
  buffers: Uint8Array[],
  index: number,
): Uint8Array {
  const view = json.bufferViews[index];
  const meshopt =
    view.extensions?.EXT_meshopt_compression ??
    view.extensions?.KHR_meshopt_compression;
  if (meshopt) {
    const source = buffers[meshopt.buffer]!.subarray(
      meshopt.byteOffset ?? 0,
      (meshopt.byteOffset ?? 0) + meshopt.byteLength,
    );
    const target = new Uint8Array(meshopt.count * meshopt.byteStride);
    MeshoptDecoder.decodeGltfBuffer(
      target,
      meshopt.count,
      meshopt.byteStride,
      source,
      meshopt.mode,
      meshopt.filter ?? "NONE",
    );
    return target;
  }
  const buffer = buffers[view.buffer]!;
  return buffer.subarray(
    view.byteOffset ?? 0,
    (view.byteOffset ?? 0) + view.byteLength,
  );
}

/** Copies a range into a fresh aligned buffer (glTF data need not be aligned in the GLB). */
function copyAligned(
  buffer: ArrayBufferLike,
  offset: number,
  length: number,
  align: number,
): ArrayBuffer {
  if (offset % align === 0) {
    return buffer.slice(offset, offset + length) as ArrayBuffer;
  }
  return new Uint8Array(buffer, offset, length).slice().buffer;
}

function readComponents(
  view: Uint8Array,
  byteOffset: number,
  byteStride: number,
  componentType: number,
  components: number,
  count: number,
  normalized: boolean,
  out: Float32Array,
): void {
  const data = new DataView(view.buffer, view.byteOffset, view.byteLength);
  const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[
    componentType as 5120
  ]!;
  const stride = byteStride || size * components;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < components; c++) {
      const at = byteOffset + i * stride + c * size;
      let v: number;
      switch (componentType) {
        case 5120:
          v = data.getInt8(at);
          v = normalized ? Math.max(v / 127, -1) : v;
          break;
        case 5121:
          v = data.getUint8(at);
          v = normalized ? v / 255 : v;
          break;
        case 5122:
          v = data.getInt16(at, true);
          v = normalized ? Math.max(v / 32767, -1) : v;
          break;
        case 5123:
          v = data.getUint16(at, true);
          v = normalized ? v / 65535 : v;
          break;
        case 5125:
          v = data.getUint32(at, true);
          break;
        default:
          v = data.getFloat32(at, true);
      }
      out[i * components + c] = v;
    }
  }
}

interface AttributeSource {
  attribute(
    name: string,
  ): { data: Float32Array; components: number } | undefined;
  indices: Uint32Array | undefined;
}

/** Attribute data for a primitive: Draco-decoded, or read from accessors. */
async function attributeSource(
  json: Json,
  primitive: Json,
  bufferView: (index: number) => Uint8Array,
  readAccessor: (i: number) => {
    data: Float32Array;
    components: number;
    count: number;
  },
  readIndices: (i: number) => Uint32Array,
): Promise<AttributeSource> {
  const fromAccessors = (name: string) => {
    const index = primitive.attributes[name];
    return index === undefined ? undefined : readAccessor(index);
  };
  const draco = primitive.extensions?.KHR_draco_mesh_compression;
  if (!draco) {
    return {
      attribute: fromAccessors,
      indices:
        primitive.indices !== undefined
          ? readIndices(primitive.indices)
          : undefined,
    };
  }
  const requests = new Map<string, DracoAttributeRequest>();
  for (const [name, id] of Object.entries(
    draco.attributes as Record<string, number>,
  )) {
    const accessor = json.accessors[primitive.attributes[name]];
    requests.set(name, {
      id,
      components: COMPONENTS[accessor.type]!,
      normalizeFrom:
        accessor.normalized && accessor.componentType !== 5126
          ? accessor.componentType
          : undefined,
    });
  }
  const decoded = await decodeDraco(bufferView(draco.bufferView), requests);
  return {
    attribute: (name) => {
      const data = decoded.attributes.get(name);
      return data
        ? { data, components: requests.get(name)!.components }
        : fromAccessors(name);
    },
    indices: decoded.indices,
  };
}

function buildMesh(
  primitive: Json,
  source: AttributeSource,
  warnings: string[],
  key: string,
): (GltfMesh & { unwelded?: Uint32Array }) | undefined {
  const mode = primitive.mode ?? 4;
  if (mode === 0) {
    warnings.push(`primitive ${key}: points not drawn yet`);
    return undefined;
  }
  const position = source.attribute("POSITION");
  if (!position) {
    return undefined;
  }
  const positions = position.data;
  const vertexCount = positions.length / 3;
  const normals = source.attribute("NORMAL")?.data;
  const uvs = source.attribute("TEXCOORD_0")?.data;
  let colors: Float32Array | undefined;
  const color = source.attribute("COLOR_0");
  if (color) {
    colors = color.components === 4 ? color.data : expandRgb(color.data);
  }
  const tangents = source.attribute("TANGENT")?.data;
  if (primitive.attributes.TEXCOORD_1 !== undefined) {
    warnings.push(`primitive ${key}: TEXCOORD_1 ignored`);
  }
  let indices =
    source.indices ?? Uint32Array.from({ length: vertexCount }, (_, i) => i);
  if (mode === 5) {
    indices = stripToList(indices);
  } else if (mode === 6) {
    indices = fanToList(indices);
  } else if (mode === 2 || mode === 3) {
    indices = lineStripToList(indices, mode === 2);
  }
  const mesh: GltfMesh = { positions, indices };
  if (mode >= 1 && mode <= 3) {
    // Lines: no flat-normal fallback; they are drawn unlit (as in 1.x).
    mesh.topology = "line-list";
    if (colors) {
      mesh.colors = colors;
    }
    return mesh;
  }
  if (uvs) {
    mesh.uvs = uvs;
  }
  if (colors) {
    mesh.colors = colors;
  }
  if (normals) {
    mesh.normals = normals;
    if (tangents) {
      mesh.tangents = tangents;
    }
    return mesh;
  }
  return flatShaded(mesh);
}

function expandRgb(rgb: Float32Array): Float32Array {
  const out = new Float32Array((rgb.length / 3) * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    out[j] = rgb[i]!;
    out[j + 1] = rgb[i + 1]!;
    out[j + 2] = rgb[i + 2]!;
    out[j + 3] = 1;
  }
  return out;
}

/** LINE_STRIP (or LINE_LOOP when `loop`) to a line list. */
function lineStripToList(strip: Uint32Array, loop: boolean): Uint32Array {
  const segments =
    Math.max(0, strip.length - 1) + (loop && strip.length > 2 ? 1 : 0);
  const out = new Uint32Array(segments * 2);
  for (let i = 0; i + 1 < strip.length; i++) {
    out[i * 2] = strip[i]!;
    out[i * 2 + 1] = strip[i + 1]!;
  }
  if (loop && strip.length > 2) {
    out[out.length - 2] = strip[strip.length - 1]!;
    out[out.length - 1] = strip[0]!;
  }
  return out;
}

function stripToList(strip: Uint32Array): Uint32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < strip.length; i++) {
    if (i % 2 === 0) {
      out.push(strip[i]!, strip[i + 1]!, strip[i + 2]!);
    } else {
      out.push(strip[i + 1]!, strip[i]!, strip[i + 2]!);
    }
  }
  return Uint32Array.from(out);
}

function fanToList(fan: Uint32Array): Uint32Array {
  const out: number[] = [];
  for (let i = 1; i + 1 < fan.length; i++) {
    out.push(fan[0]!, fan[i]!, fan[i + 1]!);
  }
  return Uint32Array.from(out);
}

/**
 * glTF requires flat normals when NORMAL is absent: unweld and use face
 * normals. `unwelded` maps each new vertex to its source vertex, for streams
 * attached afterwards (feature IDs).
 */
function flatShaded(mesh: GltfMesh): GltfMesh & { unwelded?: Uint32Array } {
  const n = mesh.indices.length;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const uvs = mesh.uvs ? new Float32Array(n * 2) : undefined;
  const colors = mesh.colors ? new Float32Array(n * 4) : undefined;
  for (let i = 0; i < n; i++) {
    const v = mesh.indices[i]!;
    positions.set(mesh.positions.subarray(v * 3, v * 3 + 3), i * 3);
    uvs?.set(mesh.uvs!.subarray(v * 2, v * 2 + 2), i * 2);
    colors?.set(mesh.colors!.subarray(v * 4, v * 4 + 4), i * 4);
  }
  for (let t = 0; t < n; t += 3) {
    const ax = positions[t * 3]!,
      ay = positions[t * 3 + 1]!,
      az = positions[t * 3 + 2]!;
    const ux = positions[t * 3 + 3]! - ax,
      uy = positions[t * 3 + 4]! - ay,
      uz = positions[t * 3 + 5]! - az;
    const vx = positions[t * 3 + 6]! - ax,
      vy = positions[t * 3 + 7]! - ay,
      vz = positions[t * 3 + 8]! - az;
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (let k = 0; k < 3; k++) {
      normals.set([nx, ny, nz], (t + k) * 3);
    }
  }
  const out: GltfMesh & { unwelded?: Uint32Array } = {
    positions,
    normals,
    indices: Uint32Array.from({ length: n }, (_, i) => i),
    unwelded: mesh.indices,
  };
  if (uvs) {
    out.uvs = uvs;
  }
  if (colors) {
    out.colors = colors;
  }
  return out;
}

function parseMaterial(m: Json, warnings: string[]): GltfMaterial {
  const pbr = m.pbrMetallicRoughness ?? {};
  const textureIndex = (info: Json, slot: string): number | undefined => {
    if (!info) {
      return undefined;
    }
    if ((info.texCoord ?? 0) !== 0) {
      warnings.push(
        `material ${m.name ?? ""}: ${slot} uses TEXCOORD_${info.texCoord}; ignored`,
      );
      return undefined;
    }
    if (info.extensions?.KHR_texture_transform) {
      warnings.push(
        `material ${m.name ?? ""}: ${slot} KHR_texture_transform ignored`,
      );
    }
    return info.index;
  };
  const material: GltfMaterial = {
    baseColor: pbr.baseColorFactor ?? [1, 1, 1, 1],
    metallic: pbr.metallicFactor ?? 1,
    roughness: pbr.roughnessFactor ?? 1,
    emissive: m.emissiveFactor ?? [0, 0, 0],
    alphaMode: m.alphaMode ?? "OPAQUE",
    alphaCutoff: m.alphaCutoff ?? 0.5,
    doubleSided: m.doubleSided ?? false,
    unlit: m.extensions?.KHR_materials_unlit !== undefined,
    normalScale: m.normalTexture?.scale ?? 1,
    occlusionStrength: m.occlusionTexture?.strength ?? 1,
  };
  const slots = {
    baseColorTexture: textureIndex(pbr.baseColorTexture, "baseColorTexture"),
    metallicRoughnessTexture: textureIndex(
      pbr.metallicRoughnessTexture,
      "metallicRoughnessTexture",
    ),
    normalTexture: textureIndex(m.normalTexture, "normalTexture"),
    occlusionTexture: textureIndex(m.occlusionTexture, "occlusionTexture"),
    emissiveTexture: textureIndex(m.emissiveTexture, "emissiveTexture"),
  };
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined) {
      material[key as keyof typeof slots] = value;
    }
  }
  return material;
}

function parseSampler(s: Json): GltfSampler {
  const wrap = (mode: number | undefined): GPUAddressMode =>
    mode === 33071
      ? "clamp-to-edge"
      : mode === 33648
        ? "mirror-repeat"
        : "repeat";
  const min: number = s?.minFilter ?? 9987;
  const mag: number = s?.magFilter ?? 9729;
  return {
    magFilter: mag === 9728 ? "nearest" : "linear",
    minFilter:
      min === 9728 || min === 9984 || min === 9986 ? "nearest" : "linear",
    mipmapFilter: min === 9984 || min === 9985 ? "nearest" : "linear",
    addressModeU: wrap(s?.wrapS),
    addressModeV: wrap(s?.wrapT),
    mipmaps: min >= 9984,
  };
}

// ---- float64 4×4 column-major helpers -------------------------------------

function identity(): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function multiply(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r]! * b[c * 4]! +
        a[4 + r]! * b[c * 4 + 1]! +
        a[8 + r]! * b[c * 4 + 2]! +
        a[12 + r]! * b[c * 4 + 3]!;
    }
  }
  return out;
}

function nodeMatrix(node: Json): Float64Array {
  if (node.matrix) {
    return Float64Array.from(node.matrix);
  }
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const m = new Float64Array(16);
  m[0] = (1 - 2 * (y * y + z * z)) * sx;
  m[1] = 2 * (x * y + z * w) * sx;
  m[2] = 2 * (x * z - y * w) * sx;
  m[4] = 2 * (x * y - z * w) * sy;
  m[5] = (1 - 2 * (x * x + z * z)) * sy;
  m[6] = 2 * (y * z + x * w) * sy;
  m[8] = 2 * (x * z + y * w) * sz;
  m[9] = 2 * (y * z - x * w) * sz;
  m[10] = (1 - 2 * (x * x + y * y)) * sz;
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  m[15] = 1;
  return m;
}
