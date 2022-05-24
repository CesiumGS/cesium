"use strict";

// TODO: Can we run this in specs?

const {
  CesiumTerrainProvider,
  Cartographic,
  sampleTerrainMostDetailed,
} = require("cesium");

const provider = new CesiumTerrainProvider({
  url:
    "https://berlin.virtualcitymap.de/datasource-data/5d2c8614-d474-442d-8975-c2b4a4c0ae94/",
});
sampleTerrainMostDetailed(provider, [Cartographic.fromDegrees(0, 0)])
  .then((updated) => {
    console.log(updated);
  })
  .catch((err) => {
    console.error(err);
  });
