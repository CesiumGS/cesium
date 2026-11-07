import type { PortfolioSite } from "../../examples/design-globe/sites.ts";
import type { DesignTileMesh } from "./corridorMesh.mjs";

/** The footprint's centre at the building's base. */
export function buildingAnchor(site: PortfolioSite): [number, number, number];
/** A box per story, in the site's design coordinates. */
export function buildingMesh(site: PortfolioSite): DesignTileMesh;
