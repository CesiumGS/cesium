"use strict";

const assert = require("node:assert");
const {
  Cartographic,
  createWorldTerrainAsync,
  sampleTerrain,
} = require("cesium");

// NodeJS smoke screen test

async function test() {
  const provider = await createWorldTerrainAsync();
  const results = await sampleTerrain(provider, 11, [
    Cartographic.fromDegrees(86.925145, 27.988257),
    Cartographic.fromDegrees(87.0, 28.0),
  ]);
  assert(results[0].height > 5000);
  assert(results[0].height < 10000);
  assert(results[1].height > 5000);
  assert(results[1].height < 10000);
}

test();
