// A world's meshes: geometry into its slabs, through the upload queue.
import {
  TEXTURE_PROPERTY_WORDS,
  NO_STREAM,
  type MeshStreams,
  metadataKey,
  MAX_DIRECTORY_ENTRIES,
  attributeHash,
  COMPONENT_TYPE_CODES,
  TEXTURE_PROPERTY,
  ALL_VIEWS,
} from "../../render/layout.ts";
import { CapacityError } from "../CapacityError.ts";
import type { World } from "../World.ts";
import type { MeshData } from "../meshes.ts";
import {
  plannedColumns,
  tableBytes,
  uploadTable,
  releaseTable,
} from "./featureTables.ts";
import type { MeshHandle, PointMesh } from "./types.ts";
import { queueUpload } from "./uploads.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** @internal Scene side: geometry into the world's slabs. */
export interface MeshWorld extends Pick<
  World,
  "changedViews" | "ctx" | "flushUploads" | "slabs" | "version"
> {
  readonly raster: Pick<
    WorldRaster,
    | "drawConstants"
    | "frameComputes"
    | "instances"
    | "pendingUploads"
    | "transforms"
    | "uploadChunks"
    | "uploadsPending"
  >;
  readonly scene: Pick<
    WorldScene,
    "meshRanges" | "nextMeshId" | "nextTableId" | "tableColumns" | "tableIds"
  >;
}

/** Ritter-style bounding sphere around the AABB center, tightened by a pass. */
function boundingSphere(positions: Float32Array): {
  center: [number, number, number];
  radius: number;
} {
  if (positions.length === 0) {
    return { center: [0, 0, 0], radius: 0 };
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = positions[i + c]!;
      min[c] = Math.min(min[c]!, v);
      max[c] = Math.max(max[c]!, v);
    }
  }
  const center: [number, number, number] = [
    (min[0]! + max[0]!) / 2,
    (min[1]! + max[1]!) / 2,
    (min[2]! + max[2]!) / 2,
  ];
  let r2 = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i]! - center[0];
    const dy = positions[i + 1]! - center[1];
    const dz = positions[i + 2]! - center[2];
    r2 = Math.max(r2, dx * dx + dy * dy + dz * dz);
  }
  return { center, radius: Math.sqrt(r2) };
}

function align4(bytes: number): number {
  return Math.ceil(bytes / 4) * 4;
}

export function addMesh(world: MeshWorld, mesh: MeshData): MeshHandle {
  const vertexCount = mesh.positions.length / 3;
  const vertexRanges: Array<[number, number]> = [];
  // One slab holds all of it (and its draws' instance streams later):
  // room for the streams, the directory and table columns together.
  const named0 =
    Object.keys(mesh.attributes ?? {}).length +
    Object.keys(mesh.metadata ?? {}).length;
  const streamBytes =
    [
      mesh.positions,
      mesh.normals,
      mesh.uvs,
      mesh.colors,
      mesh.tangents,
      mesh.featureIds,
      ...Object.values(mesh.attributes ?? {}).map((a) => a.data),
      ...Object.values(mesh.metadata ?? {}).map((a) => a.data),
    ].reduce((n, d) => n + (d ? align4(d.byteLength) : 0), 0) +
    (mesh.propertyTextures?.length ?? 0) * TEXTURE_PROPERTY_WORDS * 4 +
    4 *
      (1 +
        (named0 +
          (mesh.propertyTextures?.length ?? 0) +
          (mesh.featureTable
            ? plannedColumns(mesh.featureTable).columns.length
            : 0)) *
          3) +
    (mesh.featureTable ? tableBytes(world, mesh.featureTable) : 0);
  const slab = world.slabs.pick(streamBytes, mesh.indices.byteLength);
  if (!slab) {
    throw new CapacityError("vertex arena");
  }
  const releaseRanges = () => {
    for (const [o, size] of vertexRanges) {
      slab.vertex.release(o, size);
    }
    world.slabs.tidy(slab);
  };
  const upload = (data: Float32Array | Uint32Array | undefined): number => {
    if (!data) {
      return NO_STREAM;
    }
    const offset = world.slabs.allocateVertex(slab, data.byteLength);
    if (offset === undefined) {
      releaseRanges();
      throw new CapacityError("vertex arena");
    }
    vertexRanges.push([offset, data.byteLength]);
    queueUpload(world, slab.vertexBuffer, offset, data);
    return offset / 4;
  };
  const streams: MeshStreams = {
    position: upload(mesh.positions),
    normal: upload(mesh.normals),
    uv: upload(mesh.uvs),
    color: upload(mesh.colors),
    tangent: upload(mesh.tangents),
    featureId: upload(mesh.featureIds),
    attributes: NO_STREAM,
  };
  // Metadata properties share the directory, their names prefixed.
  const named = [
    ...Object.entries(mesh.attributes ?? {}),
    ...Object.entries(mesh.metadata ?? {}).map(
      ([id, stream]) => [metadataKey(id), stream] as const,
    ),
  ];
  const textured = mesh.propertyTextures ?? [];
  let table: { entries: number[][] } | undefined;
  try {
    table = mesh.featureTable && uploadTable(world, mesh.featureTable, slab);
  } catch (error) {
    releaseRanges();
    throw error;
  }
  const tableEntries = table?.entries ?? [];
  const entries = named.length + textured.length + tableEntries.length;
  if (entries > MAX_DIRECTORY_ENTRIES) {
    // surface.slang `readNamed` reads this many at most.
    releaseRanges();
    if (mesh.featureTable) {
      releaseTable(world, mesh.featureTable, slab);
    }
    throw new RangeError(
      `addMesh: ${entries} named attributes, metadata properties and feature table columns; a mesh holds at most ${MAX_DIRECTORY_ENTRIES}.`,
    );
  }
  if (entries > 0) {
    const directory = new Uint32Array(1 + entries * 3);
    directory[0] = entries;
    named.forEach(([name, { data, components }], i) => {
      directory[1 + i * 3] = attributeHash(name);
      directory[2 + i * 3] = upload(data);
      directory[3 + i * 3] = components;
    });
    // Properties in textures: a block saying how to decode them, read
    // per fragment (opaque.wgsl `readFragmentProperty`).
    textured.forEach((p, j) => {
      const block = new Uint32Array(TEXTURE_PROPERTY_WORDS);
      const f32 = new Float32Array(block.buffer);
      block[0] = p.slot;
      block[1] = p.channels.length;
      block[2] = p.channels.reduce(
        (packed, c, k) => packed | (c << (k * 8)),
        0,
      );
      block[3] = COMPONENT_TYPE_CODES[p.componentType];
      block[4] = p.components;
      block[5] = p.normalized ? 1 : 0;
      for (let c = 0; c < 4; c++) {
        f32[6 + c] = p.offset?.[c] ?? 0;
        f32[10 + c] = p.scale?.[c] ?? 1;
      }
      const i = named.length + j;
      directory[1 + i * 3] = attributeHash(metadataKey(p.id));
      directory[2 + i * 3] = upload(block);
      directory[3 + i * 3] = TEXTURE_PROPERTY | p.components;
    });
    // Feature table columns, read by feature ID (`readNamed`).
    tableEntries.forEach((entry, j) => {
      directory.set(entry, 1 + (named.length + textured.length + j) * 3);
    });
    streams.attributes = upload(directory);
  }
  const indexOffset = world.slabs.allocateIndex(slab, mesh.indices.byteLength);
  if (indexOffset === undefined) {
    releaseRanges();
    if (mesh.featureTable) {
      releaseTable(world, mesh.featureTable, slab);
    }
    throw new CapacityError("index arena");
  }
  queueUpload(world, slab.indexBuffer, indexOffset, mesh.indices);
  const { center, radius } = boundingSphere(mesh.positions);
  const id = world.scene.nextMeshId++;
  world.scene.meshRanges.set(id, {
    slab: slab.id,
    vertex: vertexRanges,
    index: [indexOffset, mesh.indices.byteLength],
    ...(table ? { table: mesh.featureTable } : {}),
    ...(mesh.attributes
      ? {
          named: new Map(
            Object.entries(mesh.attributes).map(([name, a]) => [
              name,
              a.components,
            ]),
          ),
        }
      : {}),
  });
  return {
    id,
    slab: slab.id,
    firstIndex: indexOffset / 4,
    indexCount: mesh.indices.length,
    vertexCount,
    streams,
    featureCount: mesh.featureIds ? (mesh.featureCount ?? 1) : 1,
    topology: mesh.topology ?? "triangle-list",
    center,
    radius,
    ...(mesh.skirtStart !== undefined && mesh.skirtStart < vertexCount
      ? { skirtStart: mesh.skirtStart }
      : {}),
  };
}

export function addPointMesh(
  world: MeshWorld,
  capacity: number,
  streams?: {
    stride: number;
    layout?: Record<string, { offset: number; components: number }>;
  },
): PointMesh {
  const fields = Object.entries(streams?.layout ?? {});
  if (fields.length > MAX_DIRECTORY_ENTRIES) {
    // surface.slang `readInstance` reads this many at most.
    throw new RangeError(
      `addPointMesh: ${fields.length} fields; a point set holds at most ${MAX_DIRECTORY_ENTRIES}.`,
    );
  }
  for (const [name, { offset, components }] of fields) {
    if (
      components < 1 ||
      components > 4 ||
      offset < 0 ||
      offset + components > streams!.stride
    ) {
      throw new RangeError(`addPointMesh: field ${name} is outside the stride`);
    }
  }
  const directory = new Uint32Array(fields.length ? 1 + fields.length * 3 : 0);
  if (fields.length) {
    directory[0] = fields.length;
    fields.forEach(([name, { offset, components }], i) => {
      directory[1 + i * 3] = attributeHash(name);
      directory[2 + i * 3] = offset;
      directory[3 + i * 3] = components;
    });
  }
  const stride = streams?.stride ?? 0;
  const anchorBytes = Math.max(16, capacity * 16);
  const streamBytes = capacity * stride * 4;
  const bytes = anchorBytes + streamBytes + directory.byteLength;
  // Its draws' point lists go in the same slab (a word a point each).
  const wanted = bytes + Math.max(4, capacity * 4);
  const slab = world.slabs.pick(wanted, 0);
  const offset = slab && world.slabs.allocateVertex(slab, bytes);
  if (!slab || offset === undefined) {
    throw new CapacityError(
      "vertex arena",
      `a point set of ${capacity.toLocaleString("en-US")} points needs ${wanted.toLocaleString("en-US")} bytes; ${world.slabs.refusal(wanted, 0) ?? "no slab has a range that size free"}`,
    );
  }
  if (directory.byteLength) {
    queueUpload(
      world,
      slab.vertexBuffer,
      offset + anchorBytes + streamBytes,
      directory,
    );
  }
  const id = world.scene.nextMeshId++;
  world.scene.meshRanges.set(id, {
    slab: slab.id,
    vertex: [[offset, bytes]],
    index: [0, 0],
  });
  const anchors = offset / 4;
  return {
    id,
    slab: slab.id,
    firstIndex: 0,
    indexCount: capacity * 6,
    vertexCount: capacity,
    streams: {
      position: anchors,
      normal: NO_STREAM,
      uv: NO_STREAM,
      color: NO_STREAM,
      tangent: NO_STREAM,
      featureId: NO_STREAM,
      attributes: NO_STREAM,
    },
    featureCount: Math.max(1, capacity),
    topology: "triangle-list",
    center: [0, 0, 0],
    radius: 0,
    points: {
      capacity,
      anchors,
      streams: stride ? (offset + anchorBytes) / 4 : NO_STREAM,
      stride,
      directory: directory.byteLength
        ? (offset + anchorBytes + streamBytes) / 4
        : NO_STREAM,
    },
  };
}

export function setPointProperties(
  world: MeshWorld,
  mesh: PointMesh,
  first: number,
  data: Float32Array | Uint32Array,
): void {
  const { stride, streams, capacity } = mesh.points;
  if (
    stride === 0 ||
    first < 0 ||
    data.length % stride !== 0 ||
    first + data.length / stride > capacity
  ) {
    throw new RangeError(
      `setPointProperties: ${data.length / Math.max(1, stride)} points from ${first} don't fit`,
    );
  }
  queueUpload(
    world,
    world.slabs.get(mesh.slab).vertexBuffer,
    (streams + first * stride) * 4,
    data,
  );
  world.version++;
  world.changedViews = ALL_VIEWS;
}

export function removeMesh(world: MeshWorld, mesh: MeshHandle): number {
  const ranges = world.scene.meshRanges.get(mesh.id);
  if (!ranges) {
    return 0;
  }
  // Its ranges may be reused before the next frame: its queued data
  // must not land on their next owner's.
  world.flushUploads();
  world.scene.meshRanges.delete(mesh.id);
  const slab = world.slabs.get(ranges.slab);
  let bytes = 0;
  if (ranges.table) {
    bytes += releaseTable(world, ranges.table, slab);
  }
  for (const [offset, size] of ranges.vertex) {
    slab.vertex.release(offset, size);
    bytes += size;
  }
  if (ranges.index[1] > 0) {
    slab.index.release(ranges.index[0], ranges.index[1]);
  }
  // An emptied slab past the first closes.
  world.slabs.tidy(slab);
  return bytes + ranges.index[1];
}
