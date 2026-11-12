// The geo smooth transforms (plan section 13.37): the height-based
// transforms of a body's ellipsoid (vertical exaggeration, height offset,
// flatten) and the reprojection nodes between geographic, geocentric and
// projected coordinates. Each is a descriptor like src/transforms/'s and a
// constructor returning the `smooth` edge (`verticalExaggerationEdge`,
// `heightOffsetEdge`, `flatten`, …); `verticalExaggeration` and
// `heightOffset` are the live helpers for a smooth frame (`smoothFrame`),
// and `Georeference` (placing a design model on a body) lives with the
// tiles it places.
export {
  verticalExaggerationEdge,
  verticalExaggerationDescriptor,
} from "./verticalExaggeration.ts";
export { heightOffsetEdge, heightOffsetDescriptor } from "./heightOffset.ts";
export {
  verticalExaggeration,
  heightOffset,
  type HeightOffset,
  type HeightOffsetOptions,
  type ReferenceSurface,
  type VerticalExaggeration,
  type VerticalExaggerationOptions,
} from "./heightWarps.ts";
export { flatten, flattenDescriptor } from "./flatten.ts";
export {
  transverseMercator,
  transverseMercatorDescriptor,
  utm,
} from "./transverseMercator.ts";
export {
  lambertConformalConic,
  lambertConformalConicDescriptor,
} from "./lambertConformalConic.ts";
export { webMercator, webMercatorDescriptor } from "./webMercator.ts";
export {
  geocentricToGeographic,
  geocentricToGeographicDescriptor,
  geographicToGeocentric,
  geographicToGeocentricDescriptor,
} from "./geocentric.ts";
export { WGS84_RADII, type Radii } from "./ellipsoid.ts";
