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
  isI3dm,
  readPropertyTables,
  toFeatureIds,
  unwrapB3dm,
  unwrapI3dm,
  type B3dm,
  type I3dm,
} from "./features.ts";
import {
  deferredReason,
  isComposite,
  mergeAssets,
  splitComposite,
} from "./composite.ts";
import { splitGlb } from "./glb.ts";
import { resolveUri } from "./resolveUri.ts";
import type {
  GltfAsset,
  GltfDraw,
  GltfImage,
  GltfLight,
  GltfMaterial,
  GltfMesh,
  GltfSampler,
  GltfTexture,
} from "./gltfTypes.ts";
import { readLight } from "./gltfLights.ts";

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
  "EXT_structural_metadata", // property tables and property attributes
  "EXT_mesh_gpu_instancing", // instance ranges, culled per instance
  "EXT_instance_features", // per-instance feature IDs
  "KHR_lights_punctual", // point and spot lights (directional ones skipped)
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
/**
 * A `data:` URI's bytes, decoded here: fetching one is a request that a
 * Content Security Policy checks against `connect-src` (as 1.x, which
 * decodes them too).
 */
function dataUriResponse(uri: string): Response {
  const comma = uri.indexOf(",");
  const meta = uri.slice(5, comma);
  const body = uri.slice(comma + 1);
  let bytes: Uint8Array<ArrayBuffer>;
  if (meta.endsWith(";base64")) {
    const binary = atob(body);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(body));
  }
  return new Response(bytes, {
    headers: { "Content-Type": meta.split(";")[0] || "text/plain" },
  });
}

export async function parseGltf(
  url: string,
  textureSupport: TextureFormatSupport,
  headers?: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ asset: GltfAsset; transfer: Transferable[] }> {
  // Every request under the asset carries the same headers (ion auth).
  const init: RequestInit = {
    ...(headers ? { headers } : {}),
    ...(signal ? { signal } : {}),
  };
  const fetchStart = performance.now();
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const bytes: Uint8Array = new Uint8Array(await response.arrayBuffer());
  const decodeStart = performance.now();
  const arrival: Arrival = {
    decodeStart,
    networkMs: decodeStart - fetchStart,
    network: resourceTiming(url),
    received: bytes.byteLength,
  };
  return isComposite(bytes)
    ? parseComposite(bytes, url, init, textureSupport, arrival)
    : parseTile(bytes, url, init, textureSupport, arrival);
}

/** Inner tiles of a composite parsed at once. */
const COMPOSITE_BATCH = 4;

/** How a content's bytes arrived, for its timing. */
interface Arrival {
  /** When decoding started (the bytes had arrived). */
  decodeStart: number;
  networkMs: number;
  network: ReturnType<typeof resourceTiming>;
  received: number;
}

type Parsed = { asset: GltfAsset; transfer: Transferable[] };

/**
 * A composite tile: its inner tiles parsed as any tile is, then merged into
 * one asset (`mergeAssets`). One inner tile failing fails the tile's content,
 * as in 1.x.
 */
async function parseComposite(
  bytes: Uint8Array,
  url: string,
  init: RequestInit,
  textureSupport: TextureFormatSupport,
  arrival: Arrival,
): Promise<Parsed> {
  const warnings: string[] = [];
  const inner = splitComposite(bytes, warnings);
  if (inner.length === 0) {
    throw new Error(
      `unsupported tile format: cmpt with nothing to draw (${warnings.join("; ") || "no inner tiles"})`,
    );
  }
  // A few inner tiles at a time: each can fetch and decode images, and a
  // hostile composite must not decode hundreds at once. The first failure
  // stops the rest.
  const stop = new AbortController();
  const outer = init.signal;
  const onOuterAbort = () => stop.abort(outer!.reason);
  if (outer) {
    if (outer.aborted) {
      stop.abort(outer.reason);
    } else {
      outer.addEventListener("abort", onOuterAbort, { once: true });
    }
  }
  const innerInit: RequestInit = { ...init, signal: stop.signal };
  const parsed: Parsed[] = [];
  const first: { failure?: { index: number; reason: unknown } } = {};
  try {
    for (
      let start = 0;
      start < inner.length && !first.failure;
      start += COMPOSITE_BATCH
    ) {
      const batch = inner.slice(start, start + COMPOSITE_BATCH);
      const results = await Promise.allSettled(
        batch.map((tile, i) =>
          parseTile(tile, url, innerInit, textureSupport, arrival).catch(
            (reason: unknown) => {
              first.failure ??= { index: start + i, reason };
              stop.abort(reason);
              throw reason;
            },
          ),
        ),
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          parsed.push(result.value);
        }
      }
    }
  } finally {
    outer?.removeEventListener("abort", onOuterAbort);
  }
  if (first.failure) {
    // The others' decoded images aren't going anywhere.
    for (const { asset } of parsed) {
      for (const image of asset.images) {
        if (image instanceof ImageBitmap) {
          image.close();
        }
      }
    }
    const { index, reason } = first.failure;
    if (reason instanceof DOMException) {
      throw reason; // a cancelled load stays a cancelled load
    }
    throw new Error(
      `composite inner tile ${index}: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  }
  const asset = mergeAssets(parsed.map((p) => p.asset));
  const images: Record<string, number> = {};
  for (const { asset: part } of parsed) {
    for (const [type, n] of Object.entries(part.timing?.images ?? {})) {
      images[type] = (images[type] ?? 0) + n;
    }
  }
  return {
    asset: {
      ...asset,
      warnings: [...new Set([...warnings, ...asset.warnings])],
      timing: {
        format: "cmpt",
        // The composite's own arrival: a merged asset has no timing, and
        // each part's held the whole tile's arrival already.
        networkMs: arrival.networkMs,
        ...arrival.network,
        bytes: arrival.received,
        decodeMs: performance.now() - arrival.decodeStart,
        images,
      },
    },
    // Inner tiles can share a buffer (the composite's); transferring one
    // twice is an error.
    transfer: [...new Set(parsed.flatMap((p) => p.transfer))],
  };
}

/** One tile's (or glTF's) bytes as an asset. */
async function parseTile(
  tileBytes: Uint8Array,
  url: string,
  init: RequestInit,
  textureSupport: TextureFormatSupport,
  arrival: Arrival,
): Promise<Parsed> {
  // External resources resolve against the glTF (an i3dm may point at one).
  let base = url;
  const fetchUri = (uri: string) =>
    uri.startsWith("data:")
      ? Promise.resolve(dataUriResponse(uri))
      : fetch(resolveUri(uri, base), init);
  let bytes = tileBytes;
  const imageTypes: Record<string, number> = {};
  let b3dm: B3dm | undefined;
  let i3dm: I3dm | undefined;
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  const deferred = deferredReason(magic);
  if (deferred) {
    throw new Error(`unsupported tile format: ${magic} (${deferred})`);
  }
  if (isB3dm(bytes)) {
    b3dm = unwrapB3dm(bytes);
    bytes = b3dm.glb;
  } else if (isI3dm(bytes)) {
    i3dm = unwrapI3dm(bytes);
    if (i3dm.glb) {
      bytes = i3dm.glb;
    } else {
      base = resolveUri(i3dm.uri!, url);
      const gltf = await fetch(base, init);
      if (!gltf.ok) {
        throw new Error(`Failed to fetch ${base}: ${gltf.status}`);
      }
      bytes = new Uint8Array(await gltf.arrayBuffer());
    }
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
    gpuInstances?: { matrices: Float32Array; featureIds?: Uint32Array };
  }> = [];
  const lights: GltfLight[] = [];
  const lightDefs: Json[] = json.extensions?.KHR_lights_punctual?.lights ?? [];
  const visit = (nodeIndex: number, parent: Float64Array) => {
    const node = json.nodes[nodeIndex];
    const world = multiply(parent, nodeMatrix(node));
    const lightIndex = node.extensions?.KHR_lights_punctual?.light;
    if (lightIndex !== undefined) {
      const light = readLight(lightDefs[lightIndex], world, warnings);
      if (light) {
        lights.push(light);
      }
    }
    if (node.mesh !== undefined) {
      const gpuInstances = gpuInstancing(node, readAccessor, warnings);
      json.meshes[node.mesh].primitives.forEach((_: Json, p: number) => {
        instances.push({
          key: `${node.mesh}/${p}`,
          meshIndex: node.mesh,
          primitive: p,
          matrix: world,
          ...(gpuInstances ? { gpuInstances } : {}),
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
      const attributes = namedAttributes(primitive, source, mesh.unwelded);
      if (attributes) {
        mesh.attributes = attributes;
      }
      const metadata = propertyAttributes(
        json,
        primitive,
        source,
        mesh.unwelded,
        warnings,
      );
      if (metadata) {
        mesh.metadata = metadata;
      }
      const textured = propertyTextures(json, primitive, warnings);
      if (textured) {
        mesh.propertyTextures = textured;
      }
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
  for (const { key, matrix, gpuInstances } of instances) {
    const entry = built.get(key);
    if (entry) {
      draws.push({
        mesh: entry.mesh,
        material: entry.material,
        matrix,
        ...(gpuInstances
          ? {
              instances: gpuInstances.matrices,
              ...(gpuInstances.featureIds
                ? { instanceFeatureIds: gpuInstances.featureIds }
                : {}),
            }
          : {}),
      });
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
    : i3dm
      ? [i3dm.batchTable]
      : readPropertyTables(json, bufferView, warnings);

  const transfer: Transferable[] = [];
  for (const image of images) {
    if (image instanceof ImageBitmap) {
      transfer.push(image);
    } else {
      transfer.push(...image.levels.map((level) => level.buffer));
    }
  }
  if (i3dm) {
    transfer.push(i3dm.matrices.buffer, i3dm.batchIds.buffer);
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
      ...Object.values(mesh.attributes ?? {}).map((a) => a.data),
      ...Object.values(mesh.metadata ?? {}).map((a) => a.data),
    ]) {
      // Streams may share a buffer (an attribute not unwelded).
      if (array && !transfer.includes(array.buffer)) {
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
      ...(lights.length > 0 ? { lights } : {}),
      featureTables,
      ...(b3dm?.rtcCenter ? { rtcCenter: b3dm.rtcCenter } : {}),
      ...(i3dm
        ? {
            instances: {
              matrices: i3dm.matrices,
              origin: i3dm.origin,
              featureIds: i3dm.batchIds,
            },
          }
        : {}),
      ...(typeof json.asset?.copyright === "string" && json.asset.copyright
        ? { copyright: json.asset.copyright }
        : {}),
      warnings,
      timing: {
        format: b3dm
          ? "b3dm"
          : i3dm
            ? "i3dm"
            : bin !== undefined || isGlb
              ? "glb"
              : "gltf",
        networkMs: arrival.networkMs,
        ...arrival.network,
        bytes: arrival.received,
        decodeMs: performance.now() - arrival.decodeStart,
        images: imageTypes,
      },
    },
    transfer,
  };
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

/** Semantics the engine reads itself (or doesn't draw yet: skinning). */
const CORE_ATTRIBUTE =
  /^(POSITION|NORMAL|TANGENT|TEXCOORD_0|COLOR_0|JOINTS_\d+|WEIGHTS_\d+|_FEATURE_ID_\d+|_BATCHID)$/;

/**
 * The primitive's other attributes (`_TEMPERATURE`, `TEXCOORD_1`, …) by
 * glTF semantic, for custom shaders that declare them; unwelded like the
 * mesh's own streams.
 */
function namedAttributes(
  primitive: Json,
  source: AttributeSource,
  unwelded: Uint32Array | undefined,
): GltfMesh["attributes"] {
  let out: GltfMesh["attributes"];
  for (const semantic of Object.keys(primitive.attributes)) {
    if (CORE_ATTRIBUTE.test(semantic)) {
      continue;
    }
    const attribute = source.attribute(semantic);
    if (attribute) {
      (out ??= {})[semantic] = unweld(attribute, unwelded);
    }
  }
  return out;
}

/** Components of the property types a stream holds (MAT2 as 4). */
const PROPERTY_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
};

/**
 * `EXT_structural_metadata` property attributes of the primitive, by
 * property ID, as float streams with the property's offset and scale
 * applied (the property attribute's own, else its class's). Normalized
 * integers are already in [0, 1] (or [-1, 1]) from the accessor.
 */
function propertyAttributes(
  json: Json,
  primitive: Json,
  source: AttributeSource,
  unwelded: Uint32Array | undefined,
  warnings: string[],
): GltfMesh["metadata"] {
  const metadata = json.extensions?.EXT_structural_metadata;
  const used: number[] =
    primitive.extensions?.EXT_structural_metadata?.propertyAttributes ?? [];
  let out: GltfMesh["metadata"];
  for (const index of used) {
    const table = metadata?.propertyAttributes?.[index];
    const schema = metadata?.schema?.classes?.[table?.class];
    if (!table || !schema) {
      warnings.push(
        `EXT_structural_metadata: property attribute ${index} not found`,
      );
      continue;
    }
    for (const [id, property] of Object.entries(
      table.properties as Record<string, Json>,
    )) {
      const definition = schema.properties?.[id];
      const components = PROPERTY_COMPONENTS[definition?.type];
      const attribute = source.attribute(property.attribute);
      if (!definition || components === undefined || !attribute) {
        warnings.push(`EXT_structural_metadata: property ${id} not read`);
        continue;
      }
      const offset = property.offset ?? definition.offset;
      const scale = property.scale ?? definition.scale;
      const data = Float32Array.from(attribute.data);
      if (offset !== undefined || scale !== undefined) {
        const component = (
          v: number | number[] | undefined,
          c: number,
          none: number,
        ) =>
          v === undefined ? none : typeof v === "number" ? v : (v[c] ?? none);
        for (let i = 0; i < data.length; i++) {
          const c = i % components;
          data[i] = data[i]! * component(scale, c, 1) + component(offset, c, 0);
        }
      }
      (out ??= {})[id] = unweld({ data, components }, unwelded);
    }
  }
  return out;
}

const COMPONENT_TYPES = new Set([
  "UINT8",
  "INT8",
  "UINT16",
  "INT16",
  "UINT32",
  "INT32",
  "FLOAT32",
]);

/**
 * `EXT_structural_metadata` property textures of the primitive: per
 * property its texture, channels and type, to decode per fragment. Arrays,
 * texture coordinates other than TEXCOORD_0 and texture transforms aren't
 * read yet.
 */
function propertyTextures(
  json: Json,
  primitive: Json,
  warnings: string[],
): GltfMesh["propertyTextures"] {
  const metadata = json.extensions?.EXT_structural_metadata;
  const used: number[] =
    primitive.extensions?.EXT_structural_metadata?.propertyTextures ?? [];
  let out: GltfMesh["propertyTextures"];
  for (const index of used) {
    const table = metadata?.propertyTextures?.[index];
    const schema = metadata?.schema?.classes?.[table?.class];
    if (!table || !schema) {
      warnings.push(
        `EXT_structural_metadata: property texture ${index} not found`,
      );
      continue;
    }
    for (const [id, property] of Object.entries(
      table.properties as Record<string, Json>,
    )) {
      const definition = schema.properties?.[id];
      const components = PROPERTY_COMPONENTS[definition?.type];
      const componentType = definition?.componentType ?? "UINT8";
      const why = !definition
        ? "no definition"
        : components === undefined
          ? `type ${definition.type}`
          : definition.array
            ? "arrays"
            : !COMPONENT_TYPES.has(componentType)
              ? componentType
              : (property.texCoord ?? 0) !== 0
                ? `TEXCOORD_${property.texCoord}`
                : property.extensions?.KHR_texture_transform
                  ? "texture transforms"
                  : undefined;
      if (why !== undefined) {
        warnings.push(
          `EXT_structural_metadata: property texture ${id} not read (${why})`,
        );
        continue;
      }
      const vector = (v: number | number[] | undefined) =>
        v === undefined ? undefined : typeof v === "number" ? [v] : v;
      const offset = vector(property.offset ?? definition.offset);
      const scale = vector(property.scale ?? definition.scale);
      (out ??= []).push({
        id,
        texture: property.index,
        channels: property.channels ?? [0],
        componentType,
        components: components!,
        normalized: definition.normalized ?? false,
        ...(offset ? { offset } : {}),
        ...(scale ? { scale } : {}),
      });
    }
  }
  return out;
}

/** A stream copied through flat shading's vertex map (`unwelded`), if any. */
function unweld(
  stream: { data: Float32Array; components: number },
  unwelded: Uint32Array | undefined,
): { data: Float32Array; components: number } {
  if (!unwelded) {
    return stream;
  }
  const { data: welded, components } = stream;
  const data = new Float32Array(unwelded.length * components);
  for (let i = 0; i < unwelded.length; i++) {
    const v = unwelded[i]!;
    data.set(
      welded.subarray(v * components, (v + 1) * components),
      i * components,
    );
  }
  return { data, components };
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

/**
 * Protocol and time to first byte of a finished fetch, from Resource Timing
 * (cross-origin servers expose details only with `Timing-Allow-Origin`).
 * The buffer is cleared as it fills; a few entries may go unread.
 */
function resourceTiming(url: string): {
  protocol?: string;
  ttfbMs?: number;
  cached?: boolean;
} {
  const entries = performance.getEntriesByName(
    url,
    "resource",
  ) as PerformanceResourceTiming[];
  const e = entries[entries.length - 1];
  if (performance.getEntriesByType("resource").length > 200) {
    performance.clearResourceTimings();
  }
  if (!e) {
    return {};
  }
  return {
    ...(e.nextHopProtocol ? { protocol: e.nextHopProtocol } : {}),
    ...(e.requestStart > 0 && e.responseStart > e.requestStart
      ? { ttfbMs: e.responseStart - e.requestStart }
      : {}),
    // Served from the HTTP cache: nothing crossed the network (visible
    // only where the server allows timing detail).
    ...(e.transferSize === 0 && e.encodedBodySize > 0 ? { cached: true } : {}),
  };
}

/**
 * `EXT_mesh_gpu_instancing`: per-instance translation, rotation and scale
 * (node space, applied before the node's own transform) as column-major
 * matrices, and per-instance feature IDs (`EXT_instance_features`, else
 * `_FEATURE_ID_0`).
 */
function gpuInstancing(
  node: Json,
  readAccessor: (i: number) => { data: Float32Array; count: number },
  warnings: string[],
): { matrices: Float32Array; featureIds?: Uint32Array } | undefined {
  const attributes = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
  if (!attributes) {
    return undefined;
  }
  const read = (name: string) =>
    attributes[name] !== undefined ? readAccessor(attributes[name]) : undefined;
  const t = read("TRANSLATION");
  const r = read("ROTATION");
  const sc = read("SCALE");
  const count = t?.count ?? r?.count ?? sc?.count ?? 0;
  if (count === 0) {
    warnings.push("EXT_mesh_gpu_instancing: no instance attributes");
    return undefined;
  }
  const out = new Float32Array(count * 16);
  for (let i = 0; i < count; i++) {
    const [x, y, z, w] = r
      ? [
          r.data[i * 4]!,
          r.data[i * 4 + 1]!,
          r.data[i * 4 + 2]!,
          r.data[i * 4 + 3]!,
        ]
      : [0, 0, 0, 1];
    const [sx, sy, sz] = sc
      ? [sc.data[i * 3]!, sc.data[i * 3 + 1]!, sc.data[i * 3 + 2]!]
      : [1, 1, 1];
    const o = i * 16;
    // T × R × S, column-major (quaternion x, y, z, w as glTF).
    out[o] = (1 - 2 * (y * y + z * z)) * sx;
    out[o + 1] = 2 * (x * y + z * w) * sx;
    out[o + 2] = 2 * (x * z - y * w) * sx;
    out[o + 4] = 2 * (x * y - z * w) * sy;
    out[o + 5] = (1 - 2 * (x * x + z * z)) * sy;
    out[o + 6] = 2 * (y * z + x * w) * sy;
    out[o + 8] = 2 * (x * z + y * w) * sz;
    out[o + 9] = 2 * (y * z - x * w) * sz;
    out[o + 10] = (1 - 2 * (x * x + y * y)) * sz;
    out[o + 12] = t ? t.data[i * 3]! : 0;
    out[o + 13] = t ? t.data[i * 3 + 1]! : 0;
    out[o + 14] = t ? t.data[i * 3 + 2]! : 0;
    out[o + 15] = 1;
  }
  const featureIds = node.extensions?.EXT_instance_features?.featureIds?.[0];
  const ids = read(
    featureIds?.attribute !== undefined
      ? `_FEATURE_ID_${featureIds.attribute}`
      : "_FEATURE_ID_0",
  );
  return ids
    ? {
        matrices: out,
        featureIds: Uint32Array.from(ids.data, (v) =>
          v === featureIds?.nullFeatureId ? 0xffffffff : Math.round(v),
        ),
      }
    : { matrices: out };
}
