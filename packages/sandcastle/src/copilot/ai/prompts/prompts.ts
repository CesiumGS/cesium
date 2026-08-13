/** Injected into system prompts so models avoid suggesting deprecated CesiumJS APIs. */
export const CESIUMJS_API_DEPRECATIONS = `
# CESIUMJS API - IMPORTANT RULES

- Prefer \`Cesium.Terrain.fromWorldTerrain()\`. Do not use \`Cesium.createWorldTerrain()\` or \`Cesium.createWorldTerrainAsync()\`.
- To set terrain after viewer creation, call \`viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain())\`.
- \`Cesium.Terrain.fromWorldTerrain()\` resolves asynchronously. Do not read \`viewer.scene.terrainProvider\` or \`viewer.scene.globe.terrainProvider\` immediately after creation. Wait for \`terrain.readyEvent\` and use the provider from that callback.
- For Google Photorealistic 3D Tiles, use Cesium Ion asset ID \`2275207\`. For OSM Buildings, use asset ID \`96188\`.
- For camera moves, prefer \`viewer.camera.flyTo({ destination, orientation })\` with radians for heading and pitch.`;
