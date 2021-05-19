#!/usr/bin/env node
import fs from "fs";
import MortonOrder from "../../../../../Source/Core/MortonOrder.js";

// These constants must agree with the subtreeLevels from tileset.json
var subtreeLevels = 4;

var nodeCount = (Math.pow(8, subtreeLevels) - 1) / 7;

var sizeOfFloat64 = 8;
var sizeOfBoundingBox = 12 * sizeOfFloat64;
var bufferByteLength = sizeOfBoundingBox * nodeCount;

var buffer = new Uint8Array(bufferByteLength);
var boundingBoxes = new Float64Array(buffer.buffer);

// This will be scaled up in the tileset.json via a transform. This
// keeps this metadata generation simple, as everything is computed in the
// unit cube.
var halfWidth = 1.0;

/**
 * Compute the center of one of the intervals of an
 * iteration of the cantor set. The centers are the
 * dots in the following diagram of a cantor set:
 *
 * -1           0           +1
 * xxxxxxxxxxxxx.xxxxxxxxxxxxx level 0
 * xxxx.xxxx         xxxx.xxxx level 1
 * x.x   x.x         x.x   x.x level 2
 * . .   . .         . .   . . level 3
 *
 * This is done by interpreting x as a fractal
 * address in binary. Starting at the center of the largest
 * interval, a 0 bit means go left, a 1 means go right down
 * the binary tree. The step size starts at 2/3 and decreases
 * exponentially by a factor of 1/3 at each level
 */
function cantorSetCenter(x, level) {
  var position = 0.0;
  for (var i = 0; i < level; i++) {
    var bitIndex = level - 1 - i;
    var bit = (x >> bitIndex) & 1;
    var direction = bit === 1 ? 1 : -1;
    var exponent = i + 1;

    position += (direction * 2.0) / Math.pow(3.0, exponent);
  }
  return position;
}

// Make smaller bounding volumes in a 3D cantor dust pattern.
// https://en.wikipedia.org/wiki/Cantor_set#Cantor_dust
var index = 0;
var scratchCoordinates = [];
for (var level = 0; level < subtreeLevels; level++) {
  var nodesAtLevel = Math.pow(8, level);
  var halfWidthAtLevel = (halfWidth * 1.0) / Math.pow(3.0, level);
  for (var mortonIndex = 0; mortonIndex < nodesAtLevel; mortonIndex++) {
    var coordinates = MortonOrder.decode3D(mortonIndex, scratchCoordinates);

    // Since cantor dust is the cartesian product of cantor sets,
    // I can compute each coordinate independently
    var centerX = cantorSetCenter(coordinates[0], level);
    var centerY = cantorSetCenter(coordinates[1], level);
    var centerZ = cantorSetCenter(coordinates[2], level);

    boundingBoxes[12 * index] = centerX;
    boundingBoxes[12 * index + 1] = centerY;
    boundingBoxes[12 * index + 2] = centerZ;

    // Since the bounding volume is axis-aligned, we only need to set the
    // major diagonal of the half-axis matrix. Since Float64Array defaults
    // to 0s, only 3 elements need to be set. The overall bounding box
    // looks like this:
    // Cx, Cy, Cz
    // Hx,  0,  0
    //  0, Hy,  0
    //  0,  0, Hz
    boundingBoxes[12 * index + 3] = halfWidthAtLevel;
    boundingBoxes[12 * index + 7] = halfWidthAtLevel;
    boundingBoxes[12 * index + 11] = halfWidthAtLevel;

    index++;
  }
}

fs.writeFileSync("subtrees/metadata.bin", buffer);

// print information for updating subtree file byteLength values
console.log("buffer byteLength:", bufferByteLength);
