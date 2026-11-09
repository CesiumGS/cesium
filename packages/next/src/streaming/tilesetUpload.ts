// Puts a tileset's decoded tiles into its world, within the tick's upload budget.
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  RECORD_SIZE,
  DRAW_ITEM_SIZE,
  TRANSFORM_SIZE,
  MaterialFlags,
} from "../render/layout.ts";
import { isCapacityError } from "../scene/CapacityError.ts";
import type { SceneItem } from "../scene/SceneItem.ts";
import { type ModelPlacement, placeModel } from "../scene/gltfModel.ts";
import type { TileGeometry, Tile } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import { summarizeContent, accumulate } from "./pipeline.ts";
import {
  isCaster,
  CASTER_PRESSURE,
  dropCaster,
  noteCasterBytes,
} from "./tilesetCasters.ts";

/**
 * Bytes a loaded tile costs besides its content, counted in `Tile.bytes`
 * and so against the byte budget. Per draw: its rows in the world's tables
 * (a draw record, a draw item, five words of indirect arguments, and two
 * transforms: the content root's and the node's), on the GPU and in their
 * CPU copies, about 800 bytes.
 */
const DRAW_OVERHEAD_BYTES =
  2 * (RECORD_SIZE + DRAW_ITEM_SIZE + 20 + 2 * TRANSFORM_SIZE);
/**
 * Per tile: its objects on the heap (the tile, its placement and handles,
 * the map entries that find it), about 2 KB. Without these overheads the
 * ellipsoid's tiles (about 17 KB each) fit the 512 MiB budget by the 30,000,
 * and the transform table reached 90% before the budget did.
 */
const TILE_OVERHEAD_BYTES = 2048;
/** Recent content loads kept for stage percentiles. */
const PIPELINE_WINDOW = 256;

/**
 * Uploads decoded content within the per-frame cap, then adjusts the
 * screen-space error for memory as 1.x processTiles does: uploads stop
 * while the cache exceeds budget + overflow, the threshold rises ×1.02 per
 * frame while content is still waiting, and relaxes back below budget.
 */
export function upload(tileset: Tileset3D): void {
  const limit = tileset.cacheBytes + tileset.overflowBytes;
  let exceeded = false;
  const budget = tileset.engine.uploadBudget;
  // After a capacity failure that eviction couldn't relieve, wait before
  // retrying: each attempt creates (and rolls back) its textures.
  if (tileset.capacityWait > 0) {
    tileset.capacityWait--;
    exceeded = tileset.ready.length > 0;
  }
  for (
    let n = 0;
    n < tileset.uploadsPerFrame && tileset.ready.length > 0 && !exceeded;
    n++
  ) {
    // Casters don't hold back what views need: they leave first.
    if (tileset.stats.bytes - tileset.casterResident > limit) {
      exceeded = true;
      break;
    }
    // The engine-wide budget for this frame (one upload always goes).
    if (budget.uploads > 0 && budget.bytes <= 0) {
      break;
    }
    // Views' content first, in any tileset: the engine's budget is shared.
    const next = tileset.ready.findIndex((r) => !isCaster(r.tile));
    if (
      next < 0 &&
      tileset.engine.tilesets.some((t) =>
        t.ready.some((r) => !isCaster(r.tile)),
      )
    ) {
      break;
    }
    const { tile, asset, arrivedAt } = tileset.ready.splice(
      Math.max(next, 0),
      1,
    )[0]!;
    // A caster decoded while casters can't load, or that nothing wants
    // any more, is dropped, not uploaded. One over the byte budget isn't:
    // admission decided, and eviction makes the room.
    const caster = isCaster(tile);
    const pressure = caster ? tileset.world.pressure().fraction : 0;
    if (
      caster &&
      (!tileset.casterLoad ||
        pressure > CASTER_PRESSURE ||
        tile.touchedFrame < tileset.frame)
    ) {
      dropCaster(tileset, tile, asset);
      n--;
      continue;
    }
    asset.warnings.forEach((w) => tileset.warnings.add(w));
    // Before the upload, whose source data is released after placing.
    const summary = summarizeContent(asset);
    const uploadStart = performance.now();
    try {
      const placing = tileset.source?.modelOptions(tile);
      // The source kept until the placement succeeds: a capacity failure
      // anywhere leaves the asset whole for the retry.
      const model = tileset.engine.uploadModel(tileset.world, asset, {
        axes: placing?.axes ?? tileset.contentAxes,
        releaseSourceData: false,
      });
      let placement: ModelPlacement | undefined;
      try {
        const shader =
          tileset.options.customShader ?? tileset.options.style?.shader;
        placement = placeModel(model, {
          modelMatrix: placing?.modelMatrix ?? tile.transform,
          ...(placing?.underlay ? { underlay: true } : {}),
          parent: tileset.transform,
          viewMask: 0,
          collision: tileset.collision,
          ...(shader ? { shader } : {}),
        });
        for (const item of tileset.itemList) {
          item.place(tile, placement);
        }
      } catch (error) {
        for (const item of tileset.itemList) {
          item.unplace(tile);
        }
        placement?.remove();
        model.release();
        throw error;
      }
      model.releaseSourceData();
      // The placement holds the model: freed when the tile unloads.
      model.release();
      tile.placement = placement;
      applySurface(tileset, tile);
      for (const draw of placement.draws) {
        tileset.drawTiles.set(draw.index, {
          generation: draw.generation,
          tile,
        });
      }
      if (tileset.terrainRegions) {
        applyTerrainClip(tileset, tile);
      }
      tile.bytes =
        model.bytes +
        TILE_OVERHEAD_BYTES +
        placement.draws.length * DRAW_OVERHEAD_BYTES;
      for (const item of tileset.itemList) {
        tile.bytes += item.bytes(tile);
      }
      if (tileset.retainGeometry) {
        tile.geometry = retain(tileset, asset, placement);
        // A mesh drawn by several nodes is kept, and counted, once.
        const arrays = new Set<Float32Array | Uint32Array>();
        for (const g of tile.geometry) {
          arrays.add(g.positions).add(g.indices);
          for (const a of Object.values(g.attributes ?? {})) {
            arrays.add(a);
          }
        }
        for (const a of arrays) {
          tile.bytes += a.byteLength;
        }
      }
      tile.lastBytes = tile.bytes;
      if (caster) {
        noteCasterBytes(tileset, tile.bytes);
        // It stays while it may, and doesn't come back at this pressure.
        tile.noFitAt =
          tileset.world.pressure().fraction > CASTER_PRESSURE
            ? pressure
            : Infinity;
      } else {
        tileset.viewCapacityWait = false;
      }
      budget.bytes -= model.bytes;
      budget.uploads++;
      const uploaded = performance.now();
      const network = asset.timing?.networkMs ?? 0;
      const decode = asset.timing?.decodeMs ?? 0;
      tileset.recent.push({
        queued: tile.fetchStartAt - tile.wantedAt,
        network,
        worker: Math.max(0, arrivedAt - tile.fetchStartAt - network - decode),
        decode,
        uploadWait: uploadStart - arrivedAt,
        upload: uploaded - uploadStart,
      });
      if (tileset.recent.length > PIPELINE_WINDOW) {
        tileset.recent.shift();
      }
      const totals = tileset.recent
        .slice(-32)
        .map(
          (r) =>
            r.queued +
            r.network +
            r.worker +
            r.decode +
            r.uploadWait +
            r.upload,
        )
        .sort((a, b) => a - b);
      tileset.loadEstimateMs = totals[totals.length >> 1]!;
      tile.summary = summary;
      accumulate(tileset.resident, summary, 1);
      tileset.firstContentAt ??= uploaded;
      tile.copyright = asset.copyright;
      tile.appliedMask = 0;
      tile.state = "ready";
      tileset.loaded.add(tile);
      tileset.order.add(tile);
      tileset.markCastsOnly(tile, tile.purpose === "caster");
      for (let t = tile.parent; t; t = t.parent) {
        t.residentBelow++;
      }
      tileset.stats.loaded++;
      tileset.stats.bytes += tile.bytes;
      tileset.stats.bytesTotal += model.bytes;
    } catch (error) {
      if (isCapacityError(error) && caster) {
        // Casters yield: no wait, no eviction, nothing held in the queue,
        // and no second try until the pools have more room.
        tile.noFitAt = pressure;
        dropCaster(tileset, tile, asset);
        continue;
      }
      if (isCapacityError(error)) {
        // A pool is full, not the content bad (§13.15): the upload took
        // nothing, so the tile waits at the front of the queue while
        // eviction frees room and the error threshold rises, as for bytes.
        tileset.ready.unshift({ tile, asset, arrivedAt });
        tileset.viewCapacityWait = true;
        tileset.capacityFull = error.pool;
        tileset.capacityFailed = true;
        exceeded = true;
        break;
      }
      tile.state = "failed";
      tileset.viewCapacityWait &&= caster;
      tileset.undrawnTile(
        `upload failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    // Placed: the one point that announces it (a hook's own error is
    // not the upload's).
    if (tile.state === "ready" && tile.placement) {
      tileset.world.acceleration.tilePlaced(
        tileset,
        tile,
        tile.placement.draws,
      );
    }
  }
  const selection = tileset.policy;
  if (tileset.stats.bytes - tileset.casterResident < tileset.cacheBytes) {
    selection.memoryAdjustedScreenSpaceError = Math.max(
      selection.memoryAdjustedScreenSpaceError / 1.02,
      selection.maximumScreenSpaceError,
    );
  } else if (exceeded) {
    selection.memoryAdjustedScreenSpaceError *= 1.02;
  }
  tileset.stats.screenSpaceError = selection.memoryAdjustedScreenSpaceError;
}

/**
 * A placed asset's triangles for `Tile.geometry`: per draw (placing
 * keeps the asset's draw order), skipping lines and instanced draws.
 * Views into a larger buffer are copied so they don't keep it alive; draws
 * of one mesh share its arrays.
 */
function retain(
  tileset: Tileset3D,
  asset: GltfAsset,
  placement: ModelPlacement,
): TileGeometry[] {
  const kept: TileGeometry[] = [];
  if (asset.instances !== undefined) {
    return kept;
  }
  const meshes = new Map<
    number,
    {
      positions: Float32Array;
      indices: Uint32Array;
      attributes?: Record<string, Float32Array>;
    }
  >();
  asset.draws.forEach((d, i) => {
    const mesh = asset.meshes[d.mesh];
    const draw = placement.draws[i];
    const matrix = draw && tileset.world.drawMatrix(draw);
    if (
      mesh === undefined ||
      matrix === undefined ||
      d.instances !== undefined ||
      // A composite's i3dm, as a lone one above.
      (d.part !== undefined && asset.parts?.[d.part]?.instances) ||
      (mesh.topology ?? "triangle-list") !== "triangle-list"
    ) {
      return;
    }
    const own = <T extends Float32Array | Uint32Array>(a: T): T =>
      a.byteLength === a.buffer.byteLength ? a : (a.slice() as T);
    let arrays = meshes.get(d.mesh);
    if (arrays === undefined) {
      arrays = { positions: own(mesh.positions), indices: own(mesh.indices) };
      // Second positions, for a dual position (`TileGeometry`).
      for (const [name, a] of Object.entries(mesh.attributes ?? {})) {
        if (a.components === 3 && a.data instanceof Float32Array) {
          (arrays.attributes ??= {})[name] = own(a.data);
        }
      }
      meshes.set(d.mesh, arrays);
    }
    kept.push({ draw: draw!, ...arrays, matrix });
  });
  return kept;
}

/**
 * Collision and ground follow what is in the scene: on each tile, the first
 * opaque item (in the order added) that is drawn and not refused stands
 * for the tileset, at its own placement; with none, the first translucent
 * one does. Its draws are ground and take `enableCollision`; every other
 * item's draws, and the tile's own draws when no item holds them, are
 * neither. A globe's surface is no item and keeps its own.
 */
export function applySurface(tileset: Tileset3D, tile: Tile): void {
  if (tileset.source) {
    return;
  }
  let chosen: SceneItem | undefined;
  let best = 0;
  for (const item of tileset.itemList) {
    const rank = item.surfaceRank(tile);
    if (rank > best) {
      chosen = item;
      best = rank;
    }
  }
  for (const item of tileset.itemList) {
    item.setSurface(tile, item === chosen, tileset.collision);
  }
  if (tileset.baseItem === undefined) {
    for (const draw of tile.placement?.draws ?? []) {
      tileset.world.setGround(draw, false);
      tileset.world.setCollision(draw, false);
    }
  }
}

/**
 * Which regions a globe tile's draws test (a bit per region that changes
 * how it draws), and its material: the terrain's own, or its blended
 * twin where a region of opacity above 0 and below 1 reaches the tile.
 */
export function applyTerrainClip(tileset: Tileset3D, tile: Tile): void {
  const clips = tileset.source?.clips;
  if (!clips || !tile.placement || !tile.globe) {
    return;
  }
  const mask = clips.maskFor(tile.globe.rectangle);
  const blended = (mask & clips.blendedMask) !== 0;
  for (const draw of tile.placement.draws) {
    tileset.world.setTerrainClip(draw, mask);
    const current = tileset.world.drawMaterial(draw);
    if (current === undefined) {
      continue;
    }
    const own = tileset.ownMaterials.get(current) ?? current;
    let wanted = own;
    if (blended) {
      let twin = tileset.blendedTwins.get(own);
      if (twin === undefined) {
        twin = tileset.world.materialWithFlags(own, MaterialFlags.alphaBlend);
        tileset.blendedTwins.set(own, twin);
        tileset.ownMaterials.set(twin, own);
      }
      wanted = twin;
    }
    if (wanted !== current) {
      tileset.world.setDrawMaterial(draw, wanted);
    }
  }
}
