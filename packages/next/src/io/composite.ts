/**
 * Composite (`cmpt`) tiles: one tile's content made of several inner tiles
 * (b3dm, i3dm, nested composites), each with its own RTC center, batch table
 * and instances. `splitComposite` reads the container; `mergeAssets` makes
 * the parsed inner tiles one asset, so that selection, placement, picks,
 * feature tables, memory accounting and unloading see one tile's content.
 */
import type { GltfAsset } from "./gltfTypes.ts";

/** Composites inside composites: real data nests once, if at all. */
export const MAX_COMPOSITE_DEPTH = 8;
/** Inner tiles in one composite's whole tree. */
export const MAX_COMPOSITE_TILES = 256;

const HEADER_BYTES = 16;
/** Every inner tile starts: magic, version, byteLength. */
const INNER_HEADER_BYTES = 12;

/** Formats a composite may hold that this engine doesn't draw, and why. */
const SKIPPED: Record<string, string> = {
  pnts: "point clouds are deferred until the vector renderer",
  vctr: "vector tiles are deferred until the vector renderer",
  geom: "geometry tiles are deferred until the vector renderer",
};
/** Why a format isn't drawn, for a tile that is only that format. */
export function deferredReason(magic: string): string | undefined {
  return SKIPPED[magic];
}
/** Parsed by `parseGltf`; 1.x's composites accept a glb as well. */
const DRAWN = new Set(["b3dm", "i3dm", "glTF"]);

/** A composite tile whose lengths or structure can't be read. */
export class CompositeFormatError extends Error {
  override readonly name = "CompositeFormatError";
  constructor(detail: string) {
    // The name goes in the message: a worker's error crosses as its message.
    super(`malformed composite tile: ${detail}`);
  }
}

function magicAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

/** True for a Composite tile (magic "cmpt"). */
export function isComposite(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 4 && magicAt(bytes, 0) === "cmpt";
}

/**
 * The drawable inner tiles of a composite, nested ones walked, in order.
 * Formats the engine doesn't draw are skipped with one warning each (added
 * to `warnings`). Refuses malformed lengths with `CompositeFormatError`,
 * and depth or inner tile counts past the bounds above.
 */
export function splitComposite(
  bytes: Uint8Array,
  warnings: string[],
): Uint8Array[] {
  const out: Uint8Array[] = [];
  const skipped = new Set<string>();
  const count = { tiles: 0 };
  walkComposite(bytes, 0, out, skipped, count);
  for (const magic of skipped) {
    warnings.push(
      `${magic} content in a composite tile was skipped: ${SKIPPED[magic]}`,
    );
  }
  return out;
}

function walkComposite(
  bytes: Uint8Array,
  depth: number,
  out: Uint8Array[],
  skipped: Set<string>,
  count: { tiles: number },
): void {
  if (depth > MAX_COMPOSITE_DEPTH) {
    throw new CompositeFormatError(
      `nested past ${MAX_COMPOSITE_DEPTH} composites`,
    );
  }
  if (bytes.byteLength < HEADER_BYTES) {
    throw new CompositeFormatError(
      `${bytes.byteLength} bytes can't hold the ${HEADER_BYTES}-byte header`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint32(4, true);
  if (version !== 1) {
    throw new CompositeFormatError(`version ${version}, not 1`);
  }
  const byteLength = view.getUint32(8, true);
  if (byteLength < HEADER_BYTES || byteLength > bytes.byteLength) {
    throw new CompositeFormatError(
      `byteLength ${byteLength} with ${bytes.byteLength} bytes present`,
    );
  }
  const tilesLength = view.getUint32(12, true);
  const room = Math.floor((byteLength - HEADER_BYTES) / INNER_HEADER_BYTES);
  if (tilesLength > room) {
    throw new CompositeFormatError(
      `tilesLength ${tilesLength}, with room for ${room}`,
    );
  }
  let offset = HEADER_BYTES;
  for (let i = 0; i < tilesLength; i++) {
    if (++count.tiles > MAX_COMPOSITE_TILES) {
      throw new CompositeFormatError(
        `more than ${MAX_COMPOSITE_TILES} inner tiles`,
      );
    }
    if (offset + INNER_HEADER_BYTES > byteLength) {
      throw new CompositeFormatError(
        `inner tile ${i} starts ${byteLength - offset} bytes from the end`,
      );
    }
    const magic = magicAt(bytes, offset);
    const length = view.getUint32(offset + 8, true);
    if (length < INNER_HEADER_BYTES || offset + length > byteLength) {
      throw new CompositeFormatError(
        `inner tile ${i} claims ${length} bytes, with ${byteLength - offset} left`,
      );
    }
    if (magic === "cmpt") {
      walkComposite(
        bytes.subarray(offset, offset + length),
        depth + 1,
        out,
        skipped,
        count,
      );
    } else if (DRAWN.has(magic)) {
      out.push(aligned(bytes.subarray(offset, offset + length)));
    } else if (SKIPPED[magic]) {
      skipped.add(magic);
    } else {
      throw new CompositeFormatError(
        `inner tile ${i} has unknown format ${JSON.stringify(magic)}`,
      );
    }
    offset += length;
  }
}

/**
 * The spec pads inner tiles to 8 bytes, and their tables' typed arrays rely
 * on it; older writers don't, so those are copied.
 */
function aligned(bytes: Uint8Array): Uint8Array {
  return bytes.byteOffset % 8 === 0 ? bytes : bytes.slice();
}

/**
 * Parsed inner tiles as one asset: lists joined, indices offset, and each
 * draw (and light) naming its part (`GltfAsset.parts`) for its RTC center
 * and instances. One part stays as it is.
 */
export function mergeAssets(parts: GltfAsset[]): GltfAsset {
  if (parts.length === 1) {
    return parts[0]!;
  }
  const merged: GltfAsset = {
    meshes: [],
    materials: [],
    textures: [],
    images: [],
    draws: [],
    featureTables: [],
    parts: [],
    warnings: [],
  };
  const lights: NonNullable<GltfAsset["lights"]> = [];
  const warnings = new Set<string>();
  const credits = new Set<string>();
  parts.forEach((part, index) => {
    const meshBase = merged.meshes.length;
    const materialBase = merged.materials.length;
    const textureBase = merged.textures.length;
    const imageBase = merged.images.length;
    const tableBase = merged.featureTables.length;
    const shift = (texture: number | undefined) =>
      texture === undefined ? undefined : texture + textureBase;
    for (const mesh of part.meshes) {
      // A lone i3dm's meshes read its first table (its batch table).
      const table = mesh.featureTable ?? (part.instances ? 0 : undefined);
      merged.meshes.push({
        ...mesh,
        ...(table !== undefined ? { featureTable: table + tableBase } : {}),
        ...(mesh.propertyTextures
          ? {
              propertyTextures: mesh.propertyTextures.map((p) => ({
                ...p,
                texture: p.texture + textureBase,
              })),
            }
          : {}),
      });
    }
    for (const material of part.materials) {
      const moved = { ...material };
      for (const key of [
        "baseColorTexture",
        "metallicRoughnessTexture",
        "normalTexture",
        "occlusionTexture",
        "emissiveTexture",
      ] as const) {
        const texture = shift(material[key]);
        if (texture !== undefined) {
          moved[key] = texture;
        }
      }
      merged.materials.push(moved);
    }
    for (const texture of part.textures) {
      merged.textures.push({ ...texture, image: texture.image + imageBase });
    }
    merged.images.push(...part.images);
    merged.featureTables.push(...part.featureTables);
    for (const draw of part.draws) {
      merged.draws.push({
        ...draw,
        mesh: draw.mesh + meshBase,
        material:
          draw.material < 0 ? draw.material : draw.material + materialBase,
        part: index,
      });
    }
    for (const light of part.lights ?? []) {
      lights.push({ ...light, part: index });
    }
    merged.parts!.push({
      ...(part.rtcCenter ? { rtcCenter: part.rtcCenter } : {}),
      ...(part.instances ? { instances: part.instances } : {}),
    });
    part.warnings.forEach((w) => warnings.add(w));
    if (part.copyright) {
      credits.add(part.copyright);
    }
  });
  if (lights.length > 0) {
    merged.lights = lights;
  }
  if (credits.size > 0) {
    // `Tileset3D.credits` splits a copyright on semicolons.
    merged.copyright = [...credits].join("; ");
  }
  merged.warnings = [...warnings];
  return merged;
}
