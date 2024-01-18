/*eslint-env node*/
"use strict";

const assert = require("node:assert");
const {
  Cartographic,
  createWorldTerrainAsync,
  sampleTerrain,
} = require("cesium");

// NodeJS smoke screen test

async function test() {
  console.log("start");
  const provider = await createWorldTerrainAsync();
  console.log("loaded terrain");
  const results = await sampleTerrain(provider, 11, [
    Cartographic.fromDegrees(86.925145, 27.988257),
    Cartographic.fromDegrees(87.0, 28.0),
  ]);
  console.log("sampled terrain");
  assert(results[0].height > 5000);
  assert(results[0].height < 10000);
  assert(results[1].height > 5000);
  assert(results[1].height < 10000);

  console.log("all assertions passed");
}

test().finally(() => console.log("done"));
