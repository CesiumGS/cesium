import { expectAssignable } from "tsd";

import { ArcGISTiledElevationTerrainProvider, CesiumTerrainProvider, EllipsoidTerrainProvider, GoogleEarthEnterpriseTerrainProvider, Terrain, TerrainProvider, VRTheWorldTerrainProvider } from "@cesium/engine";

// Verify TerrainProvider instances conform to the expected interface
expectAssignable<TerrainProvider>(new ArcGISTiledElevationTerrainProvider());
expectAssignable<TerrainProvider>(new CesiumTerrainProvider());
expectAssignable<TerrainProvider>(new EllipsoidTerrainProvider());
expectAssignable<TerrainProvider>(new VRTheWorldTerrainProvider());
expectAssignable<TerrainProvider>(new GoogleEarthEnterpriseTerrainProvider());