// "Your own models" (plan 4b Task 20; DESIGN.md "Layout" 6): two empty slots
// for Cesium ion assets. Cesium ion records no CRS for a model, so each
// slot says what an application must supply before the model can be placed
// as the page's sites are. Nothing here loads anything: the page never
// fetches from ion and never reads the ion token.

export interface SlotNeed {
  readonly what: "CRS" | "Units" | "Site transform" | "Placement mode";
  readonly detail: string;
}

export interface IonSlot {
  readonly id: string;
  readonly name: string;
  /** Where the model would come from. */
  readonly source: string;
  /** Why it is empty. */
  readonly empty: string;
  readonly needs: readonly SlotNeed[];
}

const NEEDS: readonly SlotNeed[] = [
  {
    what: "CRS",
    detail:
      "EPSG codes for the horizontal CRS and its height system (EPSG:6420+6360), or WKT2",
  },
  {
    what: "Units",
    detail:
      "The design's units as the CAD file has them: metre, US survey foot or international foot",
  },
  {
    what: "Site transform",
    detail:
      "The site grid's origin in the CRS, its rotation from grid east and its scale; none when the model is in the CRS's own coordinates",
  },
  {
    what: "Placement mode",
    detail:
      "Rigid at an anchor (fine where its error stays under a centimetre) or reprojected, every vertex through the CRS",
  },
];

export const ION_SLOTS: readonly IonSlot[] = [
  {
    id: "metrostation",
    name: "Metrostation (share key)",
    source: "A Cesium ion asset shared by key",
    empty: "Empty until its frame is supplied.",
    needs: NEEDS,
  },
  {
    id: "imodel",
    name: "Your long iModel",
    source: "An iModel exported to 3D Tiles through Cesium ion",
    empty: "Empty: bring a long model, such as a rail line or a pipeline.",
    needs: NEEDS,
  },
];

/**
 * How an app places a slot's model once it has the four: an ion tileset
 * declares no frame, so the app makes one and gives the tileset its
 * placement (`TilesetOptions.placement`); the engine never guesses one.
 */
export const SLOT_CODE = `const frame = await EngineeringFrame.load(
  { name, body: EARTH, crs, site }, { proj, grids });
await Tileset3D.load(engine, world, url, {
  placement: placeReprojected(frame) });
// or placeRigid(frame, anchor)`;
