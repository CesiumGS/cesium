import { Ellipsoid, fromDegrees, vec3 } from "@cesium/next";

/** A named place: degrees, and the label it carries. Its height is the ground's, read from the terrain once it has loaded. */
export interface Place {
  readonly id: string;
  readonly name: string;
  readonly longitude: number;
  readonly latitude: number;
  /** A summit, drawn with a pin at its top. */
  readonly kind: "summit" | "town";
}

/** The Zermatt valley and the Matterhorn: 4,000 m summits within 15 km of a town in a valley at 1,600 m. */
export const PLACES: readonly Place[] = [
  {
    id: "zermatt",
    name: "Zermatt",
    longitude: 7.7491,
    latitude: 46.0207,
    kind: "town",
  },
  {
    id: "matterhorn",
    name: "Matterhorn",
    longitude: 7.6586,
    latitude: 45.9763,
    kind: "summit",
  },
  {
    id: "breithorn",
    name: "Breithorn",
    longitude: 7.7453,
    latitude: 45.9403,
    kind: "summit",
  },
  {
    id: "monte-rosa",
    name: "Dufourspitze",
    longitude: 7.8667,
    latitude: 45.9369,
    kind: "summit",
  },
  {
    id: "weisshorn",
    name: "Weisshorn",
    longitude: 7.7164,
    latitude: 46.1006,
    kind: "summit",
  },
  {
    id: "dom",
    name: "Dom",
    longitude: 7.8581,
    latitude: 46.0939,
    kind: "summit",
  },
];

/** A camera shot: where it looks (degrees, and the true height of that point, m), heading and pitch (degrees), and range (m). */
export interface Shot {
  readonly target: { longitude: number; latitude: number; height: number };
  readonly heading: number;
  readonly pitch: number;
  readonly range: number;
}

/** The camera's first look: from the valley's north, down it to the Matterhorn at its end. */
export const CAMERA: Shot = {
  target: { longitude: 7.74, latitude: 46.0, height: 3000 },
  heading: 200,
  pitch: -10,
  range: 32_000,
};

/** Close over Zermatt, to see the buildings and the truck. */
export const CLOSE_UP: Shot = {
  target: { longitude: 7.7491, latitude: 46.0207, height: 1660 },
  heading: 215,
  pitch: -22,
  range: 1_600,
};

/** Where a place is in ITRF (m), at a true height above the ellipsoid (m). */
export const positionOf = (
  p: Pick<Place, "longitude" | "latitude">,
  height: number,
): Float64Array =>
  Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(p.longitude, p.latitude, height),
    vec3.vec3(),
  );
