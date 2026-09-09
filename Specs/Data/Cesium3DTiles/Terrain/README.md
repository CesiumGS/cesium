# Meshopt terrain fixture

`meshopt-compressed-terrain.glb` contains the four-vertex sample from
`Cesium3DTilesTerrainDataSpec.js`. It uses `GeographicTilingScheme` tile
`(level, x, y) = (0, 0, 0)` with corner heights of 0, 1, 2, and 3 meters.
The fixture includes normals and `CESIUM_tile_edges` metadata.
Only the triangle indices use `EXT_meshopt_compression`.

The generator uses the repository's Cesium source and installed
`meshoptimizer` package. The current fixture uses meshoptimizer 1.2.0.
The tests load the fixture directly and do not run the generator.

After installing the repository dependencies, run these commands from the
repository root to generate a temporary copy and compare it with the fixture:

```sh
node Specs/Data/Cesium3DTiles/Terrain/generateMeshoptTerrain.js /tmp/meshopt-terrain.glb
cmp Specs/Data/Cesium3DTiles/Terrain/meshopt-compressed-terrain.glb /tmp/meshopt-terrain.glb
```

A successful `cmp` produces no output. The generator does not read the existing
fixture or require a Cesium build.

To replace the fixture, use its path as the output argument:

```sh
node Specs/Data/Cesium3DTiles/Terrain/generateMeshoptTerrain.js Specs/Data/Cesium3DTiles/Terrain/meshopt-compressed-terrain.glb
```
