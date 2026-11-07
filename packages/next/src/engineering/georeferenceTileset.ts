// Placing a tileset by its EXT_engineering_frame declaration (plan 4b task
// 11): the part that needs the engineering modules (EngineeringFrame, PROJ),
// kept apart from the parser (georeference.ts) so a page that streams
// tilesets without georeferencing them doesn't load it.
import type { Mat4 } from "../math/mat4.ts";
import { EARTH, MOON } from "../scene/Body.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { strictWkt2 } from "./crs.ts";
import { EngineeringFrame } from "./EngineeringFrame.ts";
import {
  ENGINEERING_FRAME_EXTENSION,
  GEOREFERENCE_PATH,
  GeoreferenceError,
  parseGeoreference,
  type TilesetGeoreference,
} from "./georeference.ts";
import {
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "./placement.ts";
import type { GridSource } from "./proj.ts";
import type { ProjApi } from "./projApi.ts";

/**
 * The `EXT_engineering_frame` declaration of a parsed tileset.json, or
 * undefined when it has none (`parseGeoreference` with EARTH and MOON).
 * Throws a `GeoreferenceError` naming the JSON path for an unknown mode,
 * format or body, a missing `crs` or `placement`, a non-finite number, a
 * `wkt2` that isn't WKT2 in form (`wkt2Problem`: a PROJ string, AUTH:CODE or
 * PROJJSON) or is over 65,536 characters, or more than 64 alignments (or
 * 4,096 elements in one). Fields it doesn't know are ignored.
 */
export function readGeoreference(
  tilesetJson: unknown,
): TilesetGeoreference | undefined {
  return parseGeoreference(tilesetJson, { EARTH, MOON });
}

/** Metres: the drawn anchor's tolerance in `checkRigidTransform`. */
const ANCHOR_TOLERANCE = 1e-3;
/** Relative: a column's tolerance in `checkRigidTransform`. */
const COLUMN_TOLERANCE = 1e-9;
/** The longest piece of a PROJ message repeated in a warning. */
const MAX_SHOWN = 200;

/**
 * Throws a `GeoreferenceError` naming `placement.anchor` unless a rigid
 * tileset's root transform is its placement's matrix: the root transform
 * must draw the anchor within 1 mm of `placement.displayed(anchor)`, and each
 * of its columns must be within 1e-9 (relative to that column's length) of
 * `rigid.matrix`'s.
 */
export function checkRigidTransform(
  placement: TilesetPlacement,
  rootTransform: Mat4,
): void {
  const rigid = placement.rigid;
  if (placement.mode !== "rigid" || rigid === undefined) {
    throw new Error("checkRigidTransform: the placement isn't rigid");
  }
  const path = `${GEOREFERENCE_PATH}.placement.anchor`;
  const a = rigid.anchor;
  const m = rootTransform;
  const shownAt = placement.displayed(a);
  let gap = 0;
  for (let i = 0; i < 3; i++) {
    const drawn =
      m[i]! * a[0]! + m[4 + i]! * a[1]! + m[8 + i]! * a[2]! + m[12 + i]!;
    gap = Math.hypot(gap, drawn - shownAt[i]!);
  }
  if (!(gap <= ANCHOR_TOLERANCE)) {
    throw new GeoreferenceError(
      path,
      `the root transform draws the anchor ${gap.toPrecision(3)} m from where its rigid placement does (at most ${ANCHOR_TOLERANCE} m)`,
    );
  }
  for (let c = 0; c < 4; c++) {
    let difference = 0;
    let length = 0;
    for (let r = 0; r < 4; r++) {
      const expected = rigid.matrix[4 * c + r]!;
      difference = Math.hypot(difference, m[4 * c + r]! - expected);
      length = Math.hypot(length, expected);
    }
    const relative = difference / length;
    if (!(relative <= COLUMN_TOLERANCE)) {
      throw new GeoreferenceError(
        path,
        `the root transform's column ${c} differs from the rigid placement's at the anchor by ${relative.toPrecision(3)} relative (at most ${COLUMN_TOLERANCE})`,
      );
    }
  }
}

const isIdentity = (m: ArrayLike<number>) => {
  for (let i = 0; i < 16; i++) {
    if (m[i] !== (i % 5 === 0 ? 1 : 0)) {
      return false;
    }
  }
  return true;
};

/**
 * Places a tileset by its `EXT_engineering_frame` declaration: loads the
 * frame (`EngineeringFrame.load`, named by the declaration, else the
 * tileset's URL), builds the declared placement, checks a rigid one against
 * `tileset.root.transform` (`checkRigidTransform`), and sets
 * `tileset.placement`. PROJ is used here, never by `Tileset3D.load`.
 *
 * Every refusal is an error and a `warnings` entry:
 *  - a tileset that declares nothing (no placement is guessed);
 *  - a declared WKT2 that PROJ's strict WKT parser refuses (`strictWkt2`);
 *  - one whose `modelMatrix` isn't the identity, before the frame loads or
 *    after (`root.transform` includes it, and a change would leave the
 *    placement no longer what is drawn);
 *  - a frame that doesn't load (`EngineeringFrame.load`'s error, shortened);
 *  - a rigid anchor the root transform disagrees with.
 */
export async function georeferenceTileset(
  tileset: Tileset3D,
  options: { readonly proj: ProjApi; readonly grids?: GridSource },
): Promise<TilesetPlacement> {
  const refuse = (error: Error): never => {
    tileset.warnings.add(error.message);
    throw error;
  };
  const moved = () =>
    new Error(
      `georeferenceTileset: ${tileset.url} has a modelMatrix other than the identity, so its declared placement wouldn't be what is drawn; place it without one`,
    );
  const declared = tileset.georeference;
  if (declared === undefined) {
    return refuse(
      new Error(
        `georeferenceTileset: ${tileset.url} has no readable ${ENGINEERING_FRAME_EXTENSION} declaration; no placement is guessed`,
      ),
    );
  }
  if (!isIdentity(tileset.modelMatrix)) {
    return refuse(moved());
  }
  if (declared.crs.format === "wkt2") {
    // Untrusted WKT2: PROJ's strict parser first (the reader checked its
    // form, wkt2Problem).
    try {
      strictWkt2(options.proj, declared.crs, "the declared CRS");
    } catch (error) {
      return refuse(
        new GeoreferenceError(
          `${GEOREFERENCE_PATH}.crs.extensions.EXT_geospatial_crs_wkt2.wkt2`,
          (error as Error).message,
        ),
      );
    }
  }
  let frame: EngineeringFrame;
  try {
    frame = await EngineeringFrame.load(
      {
        name: declared.name ?? tileset.url,
        body: declared.body,
        crs: declared.crs,
        ...(declared.site ? { site: declared.site } : {}),
        ...(declared.alignments ? { alignments: declared.alignments } : {}),
        ...(declared.areaOfInterest
          ? { areaOfInterest: declared.areaOfInterest }
          : {}),
      },
      options.grids
        ? { proj: options.proj, grids: options.grids }
        : { proj: options.proj },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shown =
      message.length > MAX_SHOWN
        ? `${message.slice(0, MAX_SHOWN - 3)}...`
        : message;
    return refuse(
      new Error(
        `georeferenceTileset: ${tileset.url}'s engineering frame doesn't load: ${shown}`,
        { cause: error },
      ),
    );
  }
  // The load can take seconds (grids download): the application may have
  // moved the tileset meanwhile.
  if (!isIdentity(tileset.modelMatrix)) {
    return refuse(moved());
  }
  const placement =
    declared.placement.mode === "rigid"
      ? placeRigid(frame, declared.placement.anchor)
      : placeReprojected(frame);
  if (placement.mode === "rigid") {
    try {
      checkRigidTransform(placement, tileset.root.transform);
    } catch (error) {
      return refuse(error as Error);
    }
  }
  tileset.placement = placement;
  return placement;
}
