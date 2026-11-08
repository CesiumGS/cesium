// Placing a tileset by its BENTLEY_engineering_frame declaration (plan 4b task
// 11): the part that needs the engineering modules (EngineeringFrame, PROJ),
// kept apart from the parser (georeference.ts) so a page that streams
// tilesets without georeferencing them doesn't load it.
import type { Mat4 } from "../math/mat4.ts";
import { EARTH, MOON } from "../scene/Body.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { crsObject, strictWkt2, type CrsRef } from "./crs.ts";
import {
  EngineeringFrame,
  type EngineeringFrameDefinition,
} from "./EngineeringFrame.ts";
import {
  ENGINEERING_FRAME_EXTENSION,
  GEOREFERENCE_PATH,
  GeoreferenceError,
  checkDeclaredGrids,
  parseGeoreference,
  shownDeclaredCrs,
  type TilesetGeoreference,
} from "./georeference.ts";
import {
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "./placement.ts";
import type { GridCatalog } from "./gridCatalog.ts";
import type { GridSource } from "./proj.ts";
import type { PJ, ProjApi } from "./projApi.ts";

/**
 * The `BENTLEY_engineering_frame` declaration of a parsed tileset.json
 * (or its old name, `EXT_engineering_frame`, with a warning in `warnings`),
 * composed with EXT_geospatial_crs_source, ESRI_crs, 3DTILES_ellipsoid and
 * BENTLEY_alignments, or undefined when it has none (`parseGeoreference`
 * with EARTH and MOON). Throws a `GeoreferenceError` naming the JSON path
 * for an unknown mode, format or body, no CRS anywhere, CRSs or bodies that
 * disagree, an ellipsoid neither EARTH's nor MOON's, a missing `placement`,
 * a non-finite number, a `wkt2` (wherever declared) that isn't WKT2 in form (`wkt2Problem`: a PROJ string, AUTH:CODE or
 * PROJJSON) or is over 65,536 characters, more than 64 alignments (or
 * 4,096 elements in one), a `pipeline` the reader refuses (over 4,096
 * characters or 32 steps, an operation or parameter outside its
 * allowlists, a value with "/", "\", ".." or ":", a grid that isn't a
 * plain file name), an unknown `geoidFallback` or a `fallbackSigma` that
 * isn't positive. Fields it doesn't know are ignored.
 */
export function readGeoreference(
  tilesetJson: unknown,
): TilesetGeoreference | undefined {
  return parseGeoreference(tilesetJson, { EARTH, MOON });
}

/**
 * The engineering frame a declaration describes: its name (else
 * `fallbackName`, such as the tileset's URL), body, CRS, site, alignments,
 * area of interest, and its pinned pipeline or geoid fallback. A declared
 * pipeline's grids are held to `catalog` first (`checkDeclaredGrids`), so
 * nothing gets a loadable definition without that check: throws its
 * `GeoreferenceError`.
 */
export function declaredDefinition(
  declared: TilesetGeoreference,
  fallbackName: string,
  catalog: GridCatalog | undefined,
): EngineeringFrameDefinition {
  checkDeclaredGrids(declared, catalog);
  return {
    name: declared.name ?? fallbackName,
    body: declared.body,
    crs: declared.crs,
    ...(declared.site && { site: declared.site }),
    ...(declared.alignments && { alignments: declared.alignments }),
    ...(declared.areaOfInterest && {
      areaOfInterest: declared.areaOfInterest,
    }),
    ...(declared.pipeline !== undefined && { pipeline: declared.pipeline }),
    ...(declared.geoidFallback !== undefined && {
      geoidFallback: declared.geoidFallback,
    }),
    ...(declared.fallbackSigma !== undefined && {
      fallbackSigma: declared.fallbackSigma,
      // The tileset's claim, not the app's: the accuracy says so.
      fallbackSigmaSource: "declaration" as const,
    }),
  };
}

/**
 * Throws a `GeoreferenceError` naming the other CRS's path, and the used
 * one's, unless each of `declared.otherCrs` is the same CRS to PROJ as
 * `declared.crs` (`proj_is_equivalent_to`, PJ_COMP_EQUIVALENT: metadata
 * aside), so a code and its WKT2 agree. Each WKT2 is parsed with PROJ's
 * strict WKT parser first (`strictWkt2`), a code by its definition; one
 * PROJ can't create is refused at its path.
 */
export function checkCrsAgreement(
  proj: ProjApi,
  declared: TilesetGeoreference,
): void {
  const others = declared.otherCrs ?? [];
  if (others.length === 0) {
    return;
  }
  const parse = (crs: CrsRef, path: string): PJ => {
    try {
      return crs.format === "wkt2"
        ? strictWkt2(proj, crs, "the declared CRS")
        : crsObject(proj, crs, "the declared CRS");
    } catch (error) {
      throw new GeoreferenceError(
        path,
        (error as Error).message.slice(0, MAX_SHOWN),
      );
    }
  };
  const used = parse(
    declared.crs,
    declared.sources.wkt2 ?? declared.sources.crs,
  );
  for (const other of others) {
    const object = parse(other.crs, other.wkt2Path ?? other.path);
    if (!proj.proj_is_equivalent_to(used, object, proj.PJ_COMP_EQUIVALENT)) {
      throw new GeoreferenceError(
        other.path,
        `disagrees with ${declared.sources.crs}: ${shownDeclaredCrs(other.crs)} isn't the same CRS to PROJ as ${shownDeclaredCrs(declared.crs)}; declare one CRS`,
      );
    }
  }
}

/** Metres: the drawn anchor's tolerance in `checkRigidTransform`. */
const ANCHOR_TOLERANCE = 1e-3;
/**
 * Relative: a column's tolerance in `checkRigidTransform`. A producer and a
 * consumer may run different PROJ builds (native in Node, WebAssembly in the
 * browser), which agree to about 1e-9 relative, so the bound sits ten times
 * above that: 1e-8 is 0.2 mm over 20 km, inside the anchor's 1 mm, and still
 * refuses a 1e-6 rad rotation a hundredfold.
 */
const COLUMN_TOLERANCE = 1e-8;
/** The longest piece of a PROJ message repeated in a warning. */
const MAX_SHOWN = 200;

/**
 * Throws a `GeoreferenceError` naming `placement.anchor` unless a rigid
 * tileset's root transform is its placement's matrix: the root transform
 * must draw the anchor within 1 mm of `placement.displayed(anchor)`, and each
 * of its columns must be within 1e-8 (relative to that column's length) of
 * `rigid.matrix`'s. `declaration` is the declaration's JSON path (the old
 * name's, for a tileset that uses it).
 */
export function checkRigidTransform(
  placement: TilesetPlacement,
  rootTransform: Mat4,
  declaration: string = GEOREFERENCE_PATH,
): void {
  const rigid = placement.rigid;
  if (placement.mode !== "rigid" || rigid === undefined) {
    throw new Error("checkRigidTransform: the placement isn't rigid");
  }
  const path = `${declaration}.placement.anchor`;
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
 * Places a tileset by its `BENTLEY_engineering_frame` declaration: loads the
 * frame (`EngineeringFrame.load`, named by the declaration, else the
 * tileset's URL, with its declared pipeline or geoid fallback), builds the
 * declared placement, checks a rigid one against `tileset.root.transform`
 * (`checkRigidTransform`), and sets `tileset.placement`. PROJ is used
 * here, never by `Tileset3D.load`.
 *
 * Every refusal is an error and a `warnings` entry:
 *  - a tileset that declares nothing (no placement is guessed);
 *  - a declared pipeline naming a grid that isn't a current entry of
 *    `options.grids`' catalog, or any pipeline without `options.grids`
 *    (`checkDeclaredGrids`);
 *  - a declared WKT2 (ours, ESRI_crs's or EXT_geospatial_crs_source's)
 *    that PROJ's strict WKT parser refuses (`strictWkt2`);
 *  - two declared CRSs that aren't the same CRS to PROJ
 *    (`checkCrsAgreement`);
 *  - one whose `modelMatrix` isn't the identity, before the frame loads or
 *    after (`root.transform` includes it, and a change would leave the
 *    placement no longer what is drawn);
 *  - a frame that doesn't load (`EngineeringFrame.load`'s error, shortened);
 *  - a tileset destroyed while its frame loaded (an error only: no warning);
 *  - a rigid anchor the frame can't place (a non-finite result), or that
 *    the root transform disagrees with.
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
  // The frame's definition, a declared pipeline's grids checked against the
  // catalog: before PROJ sees anything.
  let definition: EngineeringFrameDefinition;
  try {
    definition = declaredDefinition(
      declared,
      tileset.url,
      options.grids?.catalog,
    );
  } catch (error) {
    return refuse(error as Error);
  }
  if (declared.crs.format === "wkt2") {
    // Untrusted WKT2: PROJ's strict parser first (the reader checked its
    // form, wkt2Problem).
    try {
      strictWkt2(options.proj, declared.crs, "the declared CRS");
    } catch (error) {
      return refuse(
        new GeoreferenceError(
          declared.sources.wkt2 ??
            `${declared.sources.declaration}.crs.extensions.EXT_geospatial_crs_wkt2.wkt2`,
          (error as Error).message,
        ),
      );
    }
  }
  try {
    checkCrsAgreement(options.proj, declared);
  } catch (error) {
    return refuse(error as Error);
  }
  let frame: EngineeringFrame;
  try {
    frame = await EngineeringFrame.load(
      definition,
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
  // destroyed the tileset meanwhile (then nothing is placed or warned: it is
  // gone), or moved it.
  if (tileset.isDestroyed()) {
    throw new Error(
      `georeferenceTileset: ${tileset.url} was destroyed while its frame loaded`,
    );
  }
  if (!isIdentity(tileset.modelMatrix)) {
    return refuse(moved());
  }
  // A frame that can't place the anchor (PROJ gives a non-finite number,
  // which the transformer refuses) or places it at non-finite numbers
  // (which checkRigidTransform's comparisons refuse) places nothing.
  let placement: TilesetPlacement;
  try {
    if (declared.placement.mode === "rigid") {
      placement = placeRigid(frame, declared.placement.anchor);
      checkRigidTransform(
        placement,
        tileset.root.transform,
        declared.sources.declaration,
      );
    } else {
      placement = placeReprojected(frame);
    }
  } catch (error) {
    return refuse(
      error instanceof GeoreferenceError
        ? error
        : new GeoreferenceError(
            `${declared.sources.declaration}.placement.anchor`,
            `the frame can't place the anchor (${(error as Error).message.slice(0, MAX_SHOWN)})`,
          ),
    );
  }
  tileset.placement = placement;
  return placement;
}
