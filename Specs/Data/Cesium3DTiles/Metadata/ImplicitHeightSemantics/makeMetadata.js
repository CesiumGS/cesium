#!/usr/bin/env node
import fs from "fs";

// These constants must agree with the subtreeLevels from tileset.json
var subtreeLevels = 3;

var nodeCount = (Math.pow(4, subtreeLevels) - 1) / 3;

var sizeOfFloat64 = 8;
var bufferViewByteLength = sizeOfFloat64 * nodeCount;
var bufferByteLength = 2 * bufferViewByteLength;

var buffer = new Uint8Array(bufferByteLength);
var minimumHeightValues = new Float64Array(buffer.buffer, 0, nodeCount);
var maximumHeightValues = new Float64Array(
  buffer.buffer,
  bufferViewByteLength,
  nodeCount
);

var bottom = 1000.0;
var top = 5000.0;
var heightDifference = top - bottom;

// make a staircase of bounding volumes that follow the morton curve
var index = 0;
for (var i = 0; i < subtreeLevels; i++) {
  var nodesAtLevel = Math.pow(4, i);
  var stepHeight = heightDifference / nodesAtLevel;
  for (var j = 0; j < nodesAtLevel; j++) {
    minimumHeightValues[index] = bottom + j * stepHeight;
    maximumHeightValues[index] = bottom + (j + 1) * stepHeight;
    index++;
  }
}

fs.writeFileSync("subtrees/metadata.bin", buffer);

// print information for updating subtree file byteLength values
console.log("buffer byteLength:", bufferByteLength);
console.log("bufferView byteLength:", bufferViewByteLength);
