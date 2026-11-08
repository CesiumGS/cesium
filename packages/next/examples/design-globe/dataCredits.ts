// The page's data credits (UX review I3), beside the frame's grid credits
// in the viewer's "Data attribution" list, for each site whose model is
// drawn: the ground data the designs were fitted to or stand on.
import { escapeHtml } from "./stores.ts";

/** A credit as the viewer lists it (widgets/Viewer.ts `addAttributions`). */
export interface DataCredit {
  readonly html: string;
  readonly collapsible: boolean;
}

/** The Open Government Licence v3.0, which the Environment Agency's lidar is under. */
export const OGL_V3 =
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
/** USGS 3DEP, public domain. */
export const USGS_3DEP = "https://www.usgs.gov/3d-elevation-program";

/** The Environment Agency's attribution statement, as the OGL asks for it. */
export const EA_LIDAR_CREDIT =
  "Contains Environment Agency information © Environment Agency and/or database right 2022, Open Government Licence v3.0";

/**
 * London's poles stand on the Environment Agency's lidar
 * (scripts/poleLineGround.mjs). The corridor's profile, side slopes and
 * daylight lines, and the site-grid building's ground, are fitted to USGS
 * 3DEP (scripts/corridorGround.mjs, corridorDaylight.mjs; sites.ts).
 */
const GROUND: Readonly<Record<string, DataCredit>> = {
  london: {
    html: `<a href="${OGL_V3}">${escapeHtml(EA_LIDAR_CREDIT)}</a>`,
    collapsible: true,
  },
  corridor: {
    html: `<a href="${USGS_3DEP}">Ground: USGS 3D Elevation Program (3DEP), public domain</a>`,
    collapsible: true,
  },
  "site-building": {
    html: `<a href="${USGS_3DEP}">Ground: USGS 3D Elevation Program (3DEP), public domain</a>`,
    collapsible: true,
  },
};

/** A site's credits: its frame's grids (escaped: catalog fields are data), then its ground data. */
export function siteCredits(
  site: string,
  gridCredits: readonly string[],
): DataCredit[] {
  const ground = GROUND[site];
  return [
    ...gridCredits.map((c) => ({
      html: `Grids: ${escapeHtml(c)}`,
      collapsible: true,
    })),
    ...(ground !== undefined ? [ground] : []),
  ];
}
