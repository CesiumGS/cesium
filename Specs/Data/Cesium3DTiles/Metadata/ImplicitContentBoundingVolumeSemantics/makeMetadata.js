#!/usr/bin/env node
import fs from "fs";
import MortonOrder from "../../../../../Source/Core/MortonOrder.js";

// These constants must agree with the subtreeLevels from tileset.json
var subtreeLevels = 4;

var nodeCount = (Math.pow(8, subtreeLevels) - 1) / 7;

var sizeOfFloat64 = 8;
var sizeOfBoundingSphere = 4 * sizeOfFloat64;
var bufferByteLength = sizeOfBoundingSphere * nodeCount;

var buffer = new Uint8Array(bufferByteLength);
var boundingSpheres = new Float64Array(buffer.buffer);

// This will be scaled up in the tileset.json via a transform. This
// keeps this metadata generation simple, as everything is computed within
// the unit.
var radius = 1.0;

// Make smaller bounding volumes in a 3D cantor dust pattern.
// https://en.wikipedia.org/wiki/Cantor_set#Cantor_dust
var index = 0;
var scratchCoordinates = [];
for (var level = 0; level < subtreeLevels; level++) {
  var nodesAtLevel = Math.pow(8, level);
  var nodesPerSide = 1 << level;
  var radiusAtLevel = radius / nodesPerSide;
  var diameterAtLevel = 2 * radiusAtLevel;
  for (var mortonIndex = 0; mortonIndex < nodesAtLevel; mortonIndex++) {
    var coordinates = MortonOrder.decode3D(mortonIndex, scratchCoordinates);

    // Since the bounding sphere will be centered in the tile bounding box,
    // we can measure the center in multiples of the radius for simplicity
    var centerX = radiusAtLevel + coordinates[0] * diameterAtLevel;
    var centerY = radiusAtLevel + coordinates[1] * diameterAtLevel;
    var centerZ = radiusAtLevel + coordinates[2] * diameterAtLevel;

    centerX -= radius;
    centerY -= radius;
    centerZ -= radius;

    boundingSpheres[4 * index] = centerX;
    boundingSpheres[4 * index + 1] = centerY;
    boundingSpheres[4 * index + 2] = centerZ;
    boundingSpheres[4 * index + 3] = radiusAtLevel;
    index++;
  }
}

fs.writeFileSync("subtrees/metadata.bin", buffer);

// print information for updating subtree file byteLength values
console.log("buffer byteLength:", bufferByteLength);
