/**
 * Shared prompt content for AI clients
 *
 * This module contains reusable prompt components to avoid duplication
 * across different AI client implementations.
 */

/**
 * CesiumJS API deprecation documentation to include in system prompts.
 * This helps AI models avoid suggesting deprecated APIs.
 */
export const CESIUMJS_API_DEPRECATIONS = `
# CESIUMJS API - IMPORTANT DEPRECATIONS

The following APIs have been deprecated and replaced. ALWAYS use the new APIs:

## Terrain

| Deprecated (DO NOT USE) | Current API |
|------------------------|-------------|
| \`Cesium.createWorldTerrain()\` | \`Cesium.Terrain.fromWorldTerrain()\` |
| \`Cesium.createWorldTerrainAsync()\` | \`Cesium.Terrain.fromWorldTerrain()\` |
| \`viewer.terrainProvider = ...\` | \`viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain())\` |
| \`viewer.scene.terrainProvider\` | Use \`terrain.readyEvent\` — see below |
| \`viewer.scene.globe.terrainProvider\` | Use \`terrain.readyEvent\` — see below |

### Correct Usage Examples:

\`\`\`javascript
// Creating a viewer with world terrain
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Or with options
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestVertexNormals: true,
    requestWaterMask: true,
  }),
});

// Setting terrain after viewer creation
viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
\`\`\`

### CRITICAL: Terrain Provider Access — NEVER read terrainProvider directly

\`Cesium.Terrain.fromWorldTerrain()\` loads the terrain provider **asynchronously**.
Until it finishes loading, \`viewer.scene.terrainProvider\` and \`viewer.scene.globe.terrainProvider\`
are either \`undefined\` or a default placeholder — NOT the real terrain provider.

**NEVER do any of these — they WILL throw "terrainProvider is required":**
\`\`\`javascript
// ALL of these are WRONG:
viewer.scene.terrainProvider                // undefined until ready
viewer.scene.globe.terrainProvider          // undefined until ready
const tp = viewer.scene.terrainProvider;    // saving a ref at module level is WRONG
await Cesium.sampleTerrainMostDetailed(viewer.scene.terrainProvider, positions);
await Cesium.sampleTerrainMostDetailed(viewer.scene.globe.terrainProvider, positions);
\`\`\`

**CORRECT — always wait for terrain.readyEvent before accessing the provider:**
\`\`\`javascript
const terrain = Cesium.Terrain.fromWorldTerrain();
const viewer = new Cesium.Viewer("cesiumContainer", { terrain });

// The ONLY safe way to get the terrain provider:
terrain.readyEvent.addEventListener(async (terrainProvider) => {
  try {
    await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    // Use sampled positions...
  } catch (error) {
    console.log("Terrain sampling failed:", error);
  }
});
\`\`\`

If you need the terrain provider in multiple places, store the reference from readyEvent:
\`\`\`javascript
const terrain = Cesium.Terrain.fromWorldTerrain();
const viewer = new Cesium.Viewer("cesiumContainer", { terrain });

let readyTerrainProvider;
terrain.readyEvent.addEventListener((provider) => {
  readyTerrainProvider = provider;
});

// Later, in any function that needs terrain sampling:
async function samplePositions(positions) {
  if (!readyTerrainProvider) {
    console.log("Terrain not ready yet");
    return;
  }
  await Cesium.sampleTerrainMostDetailed(readyTerrainProvider, positions);
}
\`\`\`

## 3D Tiles / Google Photorealistic

For Google Photorealistic 3D Tiles, use Cesium Ion asset ID 2275207.
For OSM Buildings, use Cesium Ion asset ID 96188.

\`\`\`javascript
// Load 3D Tiles from Cesium Ion by asset ID
const tileset = viewer.scene.primitives.add(
  await Cesium.Cesium3DTileset.fromIonAssetId(assetId)
);
\`\`\`

## Camera

\`\`\`javascript
// Fly to a location
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
  orientation: {
    heading: Cesium.Math.toRadians(heading),
    pitch: Cesium.Math.toRadians(pitch),
    roll: 0.0,
  },
});
\`\`\``;
