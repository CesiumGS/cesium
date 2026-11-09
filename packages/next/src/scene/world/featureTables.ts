// A mesh's feature tables: their columns' layout, and their rows' upload.
import type { FeatureTable } from "../../io/gltfTypes.ts";
import {
  MAX_DIRECTORY_ENTRIES,
  attributeHash,
  metadataKey,
  TABLE_PROPERTY,
} from "../../render/layout.ts";
import { CapacityError } from "../CapacityError.ts";
import type { CustomShader } from "../CustomShader.ts";
import type { Slab } from "../Slabs.ts";
import type { World } from "../World.ts";
import { stringIds } from "../stringIds.ts";
import type { TablePlan, TableColumn, MeshHandle } from "./types.ts";
import { queueUpload } from "./uploads.ts";
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { WorldScene } from "./worldScene.ts";

/** @internal Scene side, uploading through the rasterizer's per-tick computes. */
export interface FeatureTableWorld extends Pick<World, "ctx" | "slabs"> {
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
    "meshRanges" | "nextTableId" | "tableColumns" | "tableIds"
  >;
}

const tableColumnCache = new WeakMap<FeatureTable, TablePlan>();

/** Directory entries kept free of string columns (`plannedColumns`). */
const DIRECTORY_RESERVE = 32;

const NOT_WATCHED =
  "a string column is uploaded only for a style made before its content: make the FeatureStyle first";

/**
 * A feature table's columns as uploaded (`World.uploadTable`): numbers,
 * booleans (0 or 1) and numeric arrays of up to 4 (shorter rows padded
 * with zero), as float32 rows by local feature ID; missing values (null)
 * read 0. A column whose first value is a string is a string column
 * (`plannedColumns` decides whether it is uploaded). Computed once per
 * table; a column is told from its first value, so an unstyled scene's
 * string columns cost a look at one row each.
 */
function tableColumnData(table: FeatureTable): TablePlan {
  let plan = tableColumnCache.get(table);
  if (plan) {
    return plan;
  }
  plan = { columns: [], skipped: new Map() };
  for (const [name, values] of Object.entries(table.columns)) {
    if (typeof values.find((v) => v !== null) === "string") {
      plan.columns.push({ name, components: 1, text: true });
      continue;
    }
    let components = 0;
    let numeric = true;
    for (const v of values) {
      if (typeof v === "number" || typeof v === "boolean") {
        components = Math.max(components, 1);
      } else if (Array.isArray(v) && v.every((x) => typeof x === "number")) {
        components = Math.max(components, v.length);
      } else if (v !== null) {
        numeric = false;
        break;
      }
    }
    if (!numeric) {
      plan.skipped.set(
        name,
        "its values aren't all numbers, booleans, numeric arrays or strings",
      );
      continue;
    }
    if (components === 0) {
      continue;
    }
    if (components > 4) {
      plan.skipped.set(name, "its arrays are longer than 4");
      continue;
    }
    const data = new Float32Array(Math.max(1, table.count) * components);
    values.forEach((v, row) => {
      if (Array.isArray(v)) {
        data.set(v as number[], row * components);
      } else if (v !== null) {
        data[row * components] = Number(v);
      }
    });
    plan.columns.push({ name, components, data });
  }
  tableColumnCache.set(table, plan);
  return plan;
}

/**
 * The columns of `table` to upload now: the numeric ones, and the string
 * columns a style reads (`stringIds.watch`) that fit a mesh's directory,
 * which holds MAX_DIRECTORY_ENTRIES in all: they take only the room the
 * numeric ones leave, less what attributes and properties in textures may
 * use, so a table that fit before still does.
 */
export function plannedColumns(table: FeatureTable): TablePlan {
  const base = tableColumnData(table);
  const skipped = new Map(base.skipped);
  let room = Math.max(
    0,
    MAX_DIRECTORY_ENTRIES -
      DIRECTORY_RESERVE -
      base.columns.filter((c) => c.data).length,
  );
  const columns = base.columns.filter((c) => {
    if (!c.text) {
      return true;
    }
    if (!stringIds.isWatched(c.name)) {
      skipped.set(c.name, NOT_WATCHED);
      return false;
    }
    if (room-- <= 0) {
      skipped.set(c.name, "past the room a mesh's directory has for columns");
      return false;
    }
    return true;
  });
  return { columns, skipped };
}

/** The bytes a column takes in the arena. */
function columnBytes(table: FeatureTable, column: TableColumn): number {
  return column.data
    ? column.data.byteLength
    : Math.max(1, table.count) * Float32Array.BYTES_PER_ELEMENT;
}

/**
 * A string column as float32 ids, one per row (0 where missing), holding
 * a reference on each distinct string (`stringIds.retain`); the distinct
 * strings come back for the release. Or why it can't be: it mixes strings
 * with other values, or the string table is full (nothing is held then).
 */
function stringColumnData(
  table: FeatureTable,
  column: TableColumn,
): { data: Float32Array; held: string[] } | { skip: string } {
  const values = table.columns[column.name]!;
  const data = new Float32Array(Math.max(1, table.count));
  const held = new Map<string, number>();
  const giveBack = () => {
    for (const value of held.keys()) {
      stringIds.release(value);
    }
  };
  try {
    for (let row = 0; row < values.length && row < data.length; row++) {
      const value = values[row];
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value !== "string") {
        giveBack();
        return { skip: "it mixes strings with other values" };
      }
      let id = held.get(value);
      if (id === undefined) {
        id = stringIds.retain(value);
        held.set(value, id);
      }
      data[row] = id;
    }
  } catch (error) {
    giveBack();
    if (error instanceof CapacityError) {
      return { skip: "the table of strings is full" };
    }
    throw error;
  }
  return { data, held: [...held.keys()] };
}

/** A mesh's reference to its table's columns in `slab` released. */
export function releaseTable(
  world: FeatureTableWorld,
  table: FeatureTable,
  slab: Slab,
): number {
  const key = tableKey(world, table, slab.id);
  const uploaded = world.scene.tableColumns.get(key);
  if (!uploaded || --uploaded.meshes > 0) {
    return 0;
  }
  world.scene.tableColumns.delete(key);
  for (const value of uploaded.strings) {
    stringIds.release(value);
  }
  let bytes = 0;
  for (const [offset, size] of uploaded.ranges) {
    slab.vertex.release(offset, size);
    bytes += size;
  }
  return bytes;
}

/** `tableColumns`' key: the table object's id and the slab. */
function tableKey(
  world: FeatureTableWorld,
  table: FeatureTable,
  slabId: number,
): string {
  let id = world.scene.tableIds.get(table);
  if (id === undefined) {
    id = world.scene.nextTableId++;
    world.scene.tableIds.set(table, id);
  }
  return `${id}|${slabId}`;
}

/** The bytes a feature table's uploaded columns take (`uploadTable`). */
export function tableBytes(
  world: FeatureTableWorld,
  table: FeatureTable,
): number {
  return plannedColumns(table).columns.reduce(
    (n, c) => n + columnBytes(table, c),
    0,
  );
}

/**
 * A feature table's columns in the arena, uploaded once per table
 * object: numbers, booleans (0 or 1) and numeric arrays of up to 4
 * (shorter rows padded with zero), as float32 rows by local feature ID;
 * missing values (null) read 0. A string column a style reads is
 * uploaded as the ids of its strings (`stringIds`), held until the table
 * is released; a column left out is recorded with its reason
 * (`warnUnavailable`).
 */
export function uploadTable(
  world: FeatureTableWorld,
  table: FeatureTable,
  slab: Slab,
): {
  entries: number[][];
} {
  // Once per table object and slab: a table used from two slabs is
  // copied into each (rare: a table belongs to one tile's content).
  const key = tableKey(world, table, slab.id);
  let uploaded = world.scene.tableColumns.get(key);
  if (!uploaded) {
    const entries: number[][] = [];
    const ranges: Array<[number, number]> = [];
    const strings: string[] = [];
    const plan = plannedColumns(table);
    const undo = () => {
      for (const [o, size] of ranges) {
        slab.vertex.release(o, size);
      }
      for (const value of strings) {
        stringIds.release(value);
      }
    };
    for (const column of plan.columns) {
      let data = column.data;
      let held: string[] = [];
      if (!data) {
        const ids = stringColumnData(table, column);
        if ("skip" in ids) {
          plan.skipped.set(column.name, ids.skip);
          continue;
        }
        data = ids.data;
        held = ids.held;
      }
      const offset = world.slabs.allocateVertex(slab, data.byteLength);
      if (offset === undefined) {
        for (const value of held) {
          stringIds.release(value);
        }
        undo();
        throw new CapacityError("vertex arena");
      }
      for (const value of held) {
        strings.push(value); // not push(...held): a long column overflows the stack
      }
      ranges.push([offset, data.byteLength]);
      queueUpload(world, slab.vertexBuffer, offset, data);
      entries.push([
        attributeHash(metadataKey(column.name)),
        offset / 4,
        TABLE_PROPERTY | column.components,
      ]);
    }
    uploaded = {
      entries,
      ranges,
      meshes: 0,
      strings,
      skipped: plan.skipped,
    };
    world.scene.tableColumns.set(key, uploaded);
  }
  uploaded.meshes++;
  return uploaded;
}

/**
 * Says (`Engine.errors`, once per message) that a custom shader reads a
 * property of a mesh's feature table that wasn't uploaded, naming it and
 * why: it reads 0 there, which a comparison can't tell from a value.
 */
export function warnUnavailable(
  world: FeatureTableWorld,
  mesh: MeshHandle,
  shader: CustomShader,
): void {
  const ranges = world.scene.meshRanges.get(mesh.id);
  if (!ranges?.table) {
    return;
  }
  const skipped = world.scene.tableColumns.get(
    tableKey(world, ranges.table, ranges.slab),
  )?.skipped;
  if (!skipped || skipped.size === 0) {
    return;
  }
  for (const field of Object.keys(shader.named.metadata)) {
    const property = shader.named.properties[field] ?? field;
    const reason = skipped.get(property);
    if (reason !== undefined) {
      world.ctx.errors.report(
        "resource",
        `${shader.label}: the property "${property}" of a feature table isn't uploaded (${reason}), so it reads 0 there`,
      );
    }
  }
}

/** Uploads changed table entries (a scatter is encoded into `pass`). */
export function uploadTables(
  world: FeatureTableWorld,
  pass: GPUComputePassEncoder,
): void {
  if (!world.raster.uploadsPending) {
    return;
  }
  world.raster.uploadsPending = false;
  world.raster.drawConstants.upload(pass);
  world.raster.transforms.upload(pass);
  world.raster.instances.upload(pass);
  // Kernels writing the tables each frame (tracks' instance rows), after
  // the uploads and before any view culls.
  for (const encode of world.raster.frameComputes) {
    encode(pass);
  }
}
