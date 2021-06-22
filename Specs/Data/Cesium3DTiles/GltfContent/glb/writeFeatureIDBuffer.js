/* eslint-disable */

import fs from "fs";

const VERTICES_PER_BUILDING = 24;
const BUILDINGS = 10;

var featureIdArray = new Float32Array(VERTICES_PER_BUILDING * BUILDINGS);

for (var i = 0; i < BUILDINGS; i++) {
  for (var j = 0; j < VERTICES_PER_BUILDING; j++) {
    featureIdArray[i * VERTICES_PER_BUILDING + j] = i;
  }
}

fs.writeFileSync("../glb/featureIds.bin", featureIdArray);
