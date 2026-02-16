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
| \`Cesium.createWorldTerrainAsync()\` | \`Cesium.Terrain.fromWorldTerrain()\` or \`await Cesium.createWorldTerrainAsync()\` for TerrainProvider |
| \`viewer.terrainProvider = ...\` | \`viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain())\` |

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

### CRITICAL: Terrain Sampling (sampleTerrain / sampleTerrainMostDetailed)

When using \`Cesium.Terrain.fromWorldTerrain()\`, the terrain loads **asynchronously**.
\`viewer.scene.terrainProvider\` is \`undefined\` until the terrain is ready.

**WRONG - will throw "terrainProvider is required":**
\`\`\`javascript
const terrain = Cesium.Terrain.fromWorldTerrain();
const viewer = new Cesium.Viewer("cesiumContainer", { terrain });
// ERROR: terrain not ready yet!
await Cesium.sampleTerrainMostDetailed(viewer.scene.terrainProvider, positions);
\`\`\`

**CORRECT - wait for terrain.readyEvent:**
\`\`\`javascript
const terrain = Cesium.Terrain.fromWorldTerrain();
const viewer = new Cesium.Viewer("cesiumContainer", { terrain });

// Wait for terrain to be ready before sampling
terrain.readyEvent.addEventListener(async (terrainProvider) => {
  try {
    await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    // Use sampled positions...
  } catch (error) {
    console.log("Terrain sampling failed:", error);
  }
});
\`\`\`

**ALTERNATIVE - use createWorldTerrainAsync for immediate access:**
\`\`\`javascript
const viewer = new Cesium.Viewer("cesiumContainer");
const terrainProvider = await Cesium.createWorldTerrainAsync();
viewer.scene.terrainProvider = terrainProvider;
// Now safe to sample immediately
await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
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
