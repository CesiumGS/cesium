// The geo smooth transforms (plan section 13.37): the height-based
// transforms of a body's ellipsoid (vertical exaggeration, height offset,
// flatten) and the reprojection nodes between geographic, geocentric and
// projected coordinates. Each is a descriptor like src/transforms/'s and a
// constructor returning the `smooth` edge.
export {
  verticalExaggeration,
  verticalExaggerationDescriptor,
} from "./verticalExaggeration.ts";
export { heightOffset, heightOffsetDescriptor } from "./heightOffset.ts";
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
