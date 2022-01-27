import createTileKey from "./createTileKey.js";
import runLater from "./runLater.js";
import { defined } from "../Source/Cesium.js";
import { GeographicTilingScheme } from "../Source/Cesium.js";
import { HeightmapTerrainData } from "../Source/Cesium.js";
import { RuntimeError } from "../Source/Cesium.js";
import { TerrainProvider } from "../Source/Cesium.js";
import { when } from "../Source/Cesium.js";

function MockTerrainProvider() {
  this.tilingScheme = new GeographicTilingScheme();
  this.heightmapWidth = 65;
  this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    this.tilingScheme.ellipsoid,
    this.heightmapWidth,
    this.tilingScheme.getNumberOfXTilesAtLevel(0)
  );
  this.ready = true;
  this.readyPromise = when.resolve();
  this.hasWaterMask = true;

  this._tileDataAvailable = {};
  this._requestTileGeometryWillSucceed = {};
  this._requestTileGeometryWillSucceedWith = {};
  this._willHaveWaterMask = {};
  this._createMeshWillSucceed = {};
  this._upsampleWillSucceed = {};
}

MockTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  const willSucceed = this._requestTileGeometryWillSucceed[
    createTileKey(x, y, level)
  ];
  if (willSucceed === undefined) {
    return undefined; // defer by default
  }

  const that = this;
  return runLater(function () {
    if (willSucceed === true) {
      return createTerrainData(that, x, y, level, false);
    } else if (willSucceed === false) {
      throw new RuntimeError("requestTileGeometry failed as requested.");
    }

    return when(willSucceed).then(function () {
      return createTerrainData(that, x, y, level, false);
    });
  });
};

MockTerrainProvider.prototype.getTileDataAvailable = function (
  xOrTile,
  y,
  level
) {
  return this._tileDataAvailable[createTileKey(xOrTile, y, level)];
};

MockTerrainProvider.prototype.getLevelMaximumGeometricError = function (level) {
  return this.levelZeroMaximumGeometricError / (1 << level);
};

MockTerrainProvider.prototype.requestTileGeometryWillSucceed = function (
  xOrTile,
  y,
  level
) {
  this._requestTileGeometryWillSucceed[createTileKey(xOrTile, y, level)] = true;
  return this;
};

MockTerrainProvider.prototype.requestTileGeometryWillSucceedWith = function (
  terrainData,
  xOrTile,
  y,
  level
) {
  this._requestTileGeometryWillSucceed[createTileKey(xOrTile, y, level)] = true;
  this._requestTileGeometryWillSucceedWith[
    createTileKey(xOrTile, y, level)
  ] = terrainData;
  return this;
};

MockTerrainProvider.prototype.requestTileGeometryWillFail = function (
  xOrTile,
  y,
  level
) {
  this._requestTileGeometryWillSucceed[
    createTileKey(xOrTile, y, level)
  ] = false;
  return this;
};

MockTerrainProvider.prototype.requestTileGeometryWillDefer = function (
  xOrTile,
  y,
  level
) {
  this._requestTileGeometryWillSucceed[
    createTileKey(xOrTile, y, level)
  ] = undefined;
  return this;
};

MockTerrainProvider.prototype.requestTileGeometryWillWaitOn = function (
  promise,
  xOrTile,
  y,
  level
) {
  this._requestTileGeometryWillSucceed[
    createTileKey(xOrTile, y, level)
  ] = promise;
  return this;
};

MockTerrainProvider.prototype.willHaveWaterMask = function (
  includeLand,
  includeWater,
  xOrTile,
  y,
  level
) {
  this._willHaveWaterMask[createTileKey(xOrTile, y, level)] =
    includeLand || includeWater
      ? {
          includeLand: includeLand,
          includeWater: includeWater,
        }
      : undefined;
  return this;
};

MockTerrainProvider.prototype.createMeshWillSucceed = function (
  xOrTile,
  y,
  level
) {
  this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = true;
  return this;
};

MockTerrainProvider.prototype.createMeshWillFail = function (
  xOrTile,
  y,
  level
) {
  this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = false;
  return this;
};

MockTerrainProvider.prototype.createMeshWillDefer = function (
  xOrTile,
  y,
  level
) {
  this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
  return this;
};

MockTerrainProvider.prototype.createMeshWillWaitOn = function (
  promise,
  xOrTile,
  y,
  level
) {
  this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = promise;
  return this;
};

MockTerrainProvider.prototype.upsampleWillSucceed = function (
  xOrTile,
  y,
  level
) {
  this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = true;
  return this;
};

MockTerrainProvider.prototype.upsampleWillFail = function (xOrTile, y, level) {
  this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = false;
  return this;
};

MockTerrainProvider.prototype.upsampleWillDefer = function (xOrTile, y, level) {
  this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
  return this;
};

MockTerrainProvider.prototype.willBeAvailable = function (xOrTile, y, level) {
  this._tileDataAvailable[createTileKey(xOrTile, y, level)] = true;
  return this;
};

MockTerrainProvider.prototype.willBeUnavailable = function (xOrTile, y, level) {
  this._tileDataAvailable[createTileKey(xOrTile, y, level)] = false;
  return this;
};

MockTerrainProvider.prototype.willBeUnknownAvailability = function (
  xOrTile,
  y,
  level
) {
  this._tileDataAvailable[createTileKey(xOrTile, y, level)] = undefined;
  return this;
};

function createTerrainData(terrainProvider, x, y, level, upsampled) {
  let terrainData =
    terrainProvider._requestTileGeometryWillSucceedWith[
      createTileKey(x, y, level)
    ];

  if (!defined(terrainData)) {
    const options = {
      width: 5,
      height: 5,
      buffer: new Float32Array(25),
      createdByUpsampling: upsampled,
    };

    const willHaveWaterMask =
      terrainProvider._willHaveWaterMask[createTileKey(x, y, level)];
    if (defined(willHaveWaterMask)) {
      if (willHaveWaterMask.includeLand && willHaveWaterMask.includeWater) {
        options.waterMask = new Uint8Array(4);
        options.waterMask[0] = 1;
        options.waterMask[1] = 1;
        options.waterMask[2] = 0;
        options.waterMask[3] = 0;
      } else if (willHaveWaterMask.includeLand) {
        options.waterMask = new Uint8Array(1);
        options.waterMask[0] = 0;
      } else if (willHaveWaterMask.includeWater) {
        options.waterMask = new Uint8Array(1);
        options.waterMask[0] = 1;
      }
    }

    terrainData = new HeightmapTerrainData(options);
  }

  const originalUpsample = terrainData.upsample;
  terrainData.upsample = function (
    tilingScheme,
    thisX,
    thisY,
    thisLevel,
    descendantX,
    descendantY
  ) {
    const willSucceed =
      terrainProvider._upsampleWillSucceed[
        createTileKey(descendantX, descendantY, thisLevel + 1)
      ];
    if (willSucceed === undefined) {
      return undefined; // defer by default
    }

    if (willSucceed) {
      return originalUpsample.apply(terrainData, arguments);
    }

    return runLater(function () {
      throw new RuntimeError("upsample failed as requested.");
    });
  };

  const originalCreateMesh = terrainData.createMesh;
  terrainData.createMesh = function (options) {
    const x = options.x;
    const y = options.y;
    const level = options.level;

    const willSucceed =
      terrainProvider._createMeshWillSucceed[createTileKey(x, y, level)];
    if (willSucceed === undefined) {
      return undefined; // defer by default
    }

    if (willSucceed === true) {
      return originalCreateMesh.apply(terrainData, arguments);
    } else if (willSucceed === false) {
      return runLater(function () {
        throw new RuntimeError("createMesh failed as requested.");
      });
    }

    const args = arguments;

    return runLater(function () {
      return when(willSucceed).then(function () {
        return originalCreateMesh.apply(terrainData, args);
      });
    });
  };

  return terrainData;
}
export default MockTerrainProvider;
