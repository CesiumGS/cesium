define([
    'Core/defined',
    'Core/GeographicTilingScheme',
    'Core/RuntimeError',
    'Core/TerrainProvider',
    './createTileKey',
    './runLater'
], function(
    defined,
    GeographicTilingScheme,
    RuntimeError,
    TerrainProvider,
    createTileKey,
    runLater) {
    'use strict';

    function MockTerrainProvider() {
        this.tilingScheme = new GeographicTilingScheme();
        this.heightmapWidth = 65;
        this.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this.tilingScheme.ellipsoid, this.heightmapWidth, this.tilingScheme.getNumberOfXTilesAtLevel(0));
        this.ready = true;
        this.hasWaterMask = true;

        this._tileDataAvailable = {};
        this._requestTileGeometryWillSucceed = {};
        this._willHaveWaterMask = {};
        this._willHaveBvh = {};
        this._createMeshWillSucceed = {};
        this._upsampleWillSucceed = {};
        this._nearestBvhLevel = {};
    }

    MockTerrainProvider.prototype.requestTileGeometry = function(x, y, level, request) {
        var willSucceed = this._requestTileGeometryWillSucceed[createTileKey(x, y, level)];
        if (willSucceed === undefined) {
            return undefined; // defer by default
        }

        var that = this;
        return runLater(function() {
            if (willSucceed) {
                var terrainData = createTerrainData(that, x, y, level, false);

                var willHaveWaterMask = that._willHaveWaterMask[createTileKey(x, y, level)];
                if (defined(willHaveWaterMask)) {
                    if (willHaveWaterMask.includeLand && willHaveWaterMask.includeWater) {
                        terrainData.waterMask = new Uint8Array(4);
                        terrainData.waterMask[0] = 1;
                        terrainData.waterMask[1] = 1;
                        terrainData.waterMask[2] = 0;
                        terrainData.waterMask[3] = 0;
                    } else if (willHaveWaterMask.includeLand) {
                        terrainData.waterMask = new Uint8Array(1);
                        terrainData.waterMask[0] = 0;
                    } else if (willHaveWaterMask.includeWater) {
                        terrainData.waterMask = new Uint8Array(1);
                        terrainData.waterMask[0] = 1;
                    }
                }

                var willHaveBvh = that._willHaveBvh[createTileKey(x, y, level)];
                if (defined(willHaveBvh)) {
                    terrainData.bvh = willHaveBvh;
                }

                return terrainData;
            }
            throw new RuntimeError('requestTileGeometry failed as requested.');
        });
    };

    MockTerrainProvider.prototype.getTileDataAvailable = function(xOrTile, y, level) {
        return this._tileDataAvailable[createTileKey(xOrTile, y, level)];
    };

    MockTerrainProvider.prototype.getNearestBvhLevel = function(x, y, level) {
        return this._nearestBvhLevel[createTileKey(x, y, level)];
    };

    MockTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this.levelZeroMaximumGeometricError / (1 << level);
    };

    MockTerrainProvider.prototype.requestTileGeometryWillSucceed = function(xOrTile, y, level) {
        this._requestTileGeometryWillSucceed[createTileKey(xOrTile, y, level)] = true;
        return this;
    };

    MockTerrainProvider.prototype.requestTileGeometryWillFail = function(xOrTile, y, level) {
        this._requestTileGeometryWillSucceed[createTileKey(xOrTile, y, level)] = false;
        return this;
    };

    MockTerrainProvider.prototype.requestTileGeometryWillDefer = function(xOrTile, y, level) {
        this._requestTileGeometryWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
        return this;
    };

    MockTerrainProvider.prototype.willHaveWaterMask = function(includeLand, includeWater, xOrTile, y, level) {
        this._willHaveWaterMask[createTileKey(xOrTile, y, level)] = includeLand || includeWater ? {
            includeLand: includeLand,
            includeWater: includeWater
        } : undefined;
        return this;
    };

    MockTerrainProvider.prototype.willHaveBvh = function(bvh, xOrTile, y, level) {
        this._willHaveBvh[createTileKey(xOrTile, y, level)] = bvh;
        return this;
    };

    MockTerrainProvider.prototype.createMeshWillSucceed = function(xOrTile, y, level) {
        this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = true;
        return this;
    };

    MockTerrainProvider.prototype.createMeshWillFail = function(xOrTile, y, level) {
        this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = false;
        return this;
    };

    MockTerrainProvider.prototype.createMeshWillDefer = function(xOrTile, y, level) {
        this._createMeshWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
        return this;
    };

    MockTerrainProvider.prototype.upsampleWillSucceed = function(xOrTile, y, level) {
        this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = true;
        return this;
    };

    MockTerrainProvider.prototype.upsampleWillFail = function(xOrTile, y, level) {
        this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = false;
        return this;
    };

    MockTerrainProvider.prototype.upsampleWillDefer = function(xOrTile, y, level) {
        this._upsampleWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
        return this;
    };

    MockTerrainProvider.prototype.willBeAvailable = function(xOrTile, y, level) {
        this._tileDataAvailable[createTileKey(xOrTile, y, level)] = true;
        return this;
    };

    MockTerrainProvider.prototype.willBeUnavailable = function(xOrTile, y, level) {
        this._tileDataAvailable[createTileKey(xOrTile, y, level)] = false;
        return this;
    };

    MockTerrainProvider.prototype.willBeUnknownAvailability = function(xOrTile, y, level) {
        this._tileDataAvailable[createTileKey(xOrTile, y, level)] = undefined;
        return this;
    };

    MockTerrainProvider.prototype.willHaveNearestBvhLevel = function(nearestBvhLevel, xOrTile, y, level) {
        this._nearestBvhLevel[createTileKey(xOrTile, y, level)] = nearestBvhLevel;
        return this;
    };

    function createTerrainData(terrainProvider, x, y, level, upsampled) {
        var terrainData = jasmine.createSpyObj('MockTerrainData', ['createMesh', 'upsample', 'wasCreatedByUpsampling']);
        terrainData.wasCreatedByUpsampling.and.returnValue(upsampled);

        terrainData.createMesh.and.callFake(function(tilingScheme, x, y, level) {
            var willSucceed = terrainProvider._createMeshWillSucceed[createTileKey(x, y, level)];
            if (willSucceed === undefined) {
                return undefined; // defer by default
            }

            return runLater(function() {
                if (willSucceed) {
                    return {};
                }
                throw new RuntimeError('createMesh failed as requested.');
            });
        });

        terrainData.upsample.and.callFake(function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY) {
            var willSucceed = terrainProvider._upsampleWillSucceed[createTileKey(descendantX, descendantY, thisLevel + 1)];
            if (willSucceed === undefined) {
                return undefined; // defer by default
            }

            return runLater(function() {
                if (willSucceed) {
                    return createTerrainData(terrainProvider, descendantX, descendantY, thisLevel + 1, true);
                }
                throw new RuntimeError('upsample failed as requested.');
            });
        });

        return terrainData;
    }

    return MockTerrainProvider;
});
