import { createVerticesFromHeightmap } from "./WorkersES6/createVerticesFromHeightmap.js";
// import defaultValue from "./Core/defaultValue";
import Ellipsoid from "./Core/Ellipsoid.js";
import Cartesian2 from "./Core/Cartesian2.js";
// import WebMercatorTilingScheme from "./Core/WebMercatorTilingScheme";
import fs from "fs";
// import GeographicProjection from "./Core/GeographicProjection";
// import ArcGISTiledElevationTerrainProvider from "./Core/ArcGISTiledElevationTerrainProvider.js";
//
// const terrainProvider = new ArcGISTiledElevationTerrainProvider({
//   url:
//     "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
// });
//
// function err(e) {
//   console.error(e);
// }
// terrainProvider.readyPromise
//   .then(() => {
//     return terrainProvider.requestTileGeometry(214, 379, 9);
//   }, err)
//   .then((resp) => {
//     console.log(resp);
//     return resp.createMesh();
//     // createVerticesFromHeightmap({}, [])
//   }, err)
//   .then((data) => {
//     console.log(data);
//   }, err);

const buffer = fs.readFileSync(
  "../Specs/Data/ArcGIS/9_214_379/tile_9_214_379.tile"
);

const encoding = 1;

const structure = {
  elementMultiplier: 1,
  elementsPerHeight: 1,
  heightOffset: 0,
  heightScale: 1,
  highestEncodedHeight: 8700,
  isBigEndian: false,
  lowestEncodedHeight: -450,
  stride: 1,
};
const childTileMask = 15;
const nativeRectangle = {
  east: 9705667.861350555,
  north: 3287403.5782812536,
  south: 3209132.0607031286,
  west: 9627396.346339665,
  height: 78271.517578125,
  width: 78271.51501088962,
};
const rect = {
  east: 1.521708903610969,
  north: 0.49400461712949895,
  south: 0.48316869491204795,
  west: 1.5094370576141065,
  height: 0.010835922217451,
  width: 0.012271845996862485,
};
const center = {
  x: 311082.51182547904,
  y: 5627442.764580406,
  z: 2975913.6065032477,
};
const skirtHeight = 304.55843176661665;
var ellipsoid = Ellipsoid.WGS84;
var tilingSchemeOptions = {
  ellipsoid: ellipsoid,
};
var extent = {
  xmin: -2.0037507842788246e7,
  ymin: -2.0037508659999996e7,
  xmax: 2.0037507842788246e7,
  ymax: 2.0037508340000004e7,
  spatialReference: {
    wkid: 102100,
    latestWkid: 3857,
  },
};
tilingSchemeOptions.rectangleSouthwestInMeters = new Cartesian2(
  extent.xmin,
  extent.ymin
);
tilingSchemeOptions.rectangleNortheastInMeters = new Cartesian2(
  extent.xmax,
  extent.ymax
);
//const tilingScheme = new WebMercatorTilingScheme(tilingSchemeOptions);

const params = {
  heightmap: buffer,
  structure: structure,
  includeWebMercatorT: true,
  width: 257,
  height: 257,
  nativeRectangle: nativeRectangle,
  rectangle: rect,
  relativeToCenter: center,
  ellipsoid: ellipsoid,
  skirtHeight: skirtHeight,
  isGeographic: false,
  exaggeration: 1,
  encoding: encoding,
};

createVerticesFromHeightmap(params, [buffer]);

// level == 9 && y == 214 && x == 379;
