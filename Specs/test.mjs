/* global process */
import { Cartographic, createWorldTerrainAsync, Ion, sampleTerrain } from "cesium";
import assert from "node:assert";

// NodeJS smoke screen test

// Use CESIUM_ACCESS_TOKEN env var if available
if (process.env.CESIUM_ACCESS_TOKEN) {
  Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;
}

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

test()

