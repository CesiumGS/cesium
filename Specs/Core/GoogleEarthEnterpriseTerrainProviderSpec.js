/*global defineSuite*/
defineSuite([
    'Core/GoogleEarthEnterpriseTerrainProvider',
    'Core/DefaultProxy',
    'Core/defaultValue',
    'Core/defined',
    'Core/Ellipsoid',
    'Core/GeographicTilingScheme',
    'Core/GoogleEarthEnterpriseMetadata',
    'Core/GoogleEarthEnterpriseTerrainData',
    'Core/loadImage',
    'Core/loadWithXhr',
    'Core/Math',
    'Core/TerrainProvider',
    'Specs/pollToPromise',
    'ThirdParty/when'
], function(
    GoogleEarthEnterpriseTerrainProvider,
    DefaultProxy,
    defaultValue,
    defined,
    Ellipsoid,
    GeographicTilingScheme,
    GoogleEarthEnterpriseMetadata,
    GoogleEarthEnterpriseTerrainData,
    loadImage,
    loadWithXhr,
    CesiumMath,
    TerrainProvider,
    pollToPromise,
    when) {
    'use strict';

    function installMockGetQuadTreePacket() {
        spyOn(GoogleEarthEnterpriseMetadata.prototype, 'getQuadTreePacket').and.callFake(function(quadKey, version) {
            quadKey = defaultValue(quadKey, '');
            var t = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            t.ancestorHasTerrain = true;
            this._tileInfo[quadKey + '0'] = t;

            t = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            t.ancestorHasTerrain = true;
            this._tileInfo[quadKey + '1'] = t;

            t = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            t.ancestorHasTerrain = true;
            this._tileInfo[quadKey + '2'] = t;

            t = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            t.ancestorHasTerrain = true;
            this._tileInfo[quadKey + '3'] = t;

            return when();
        });
    }

    var terrainProvider;

    function waitForTile(level, x, y, f) {
        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return pollToPromise(function() {
            return terrainProvider.ready && terrainProvider.getTileDataAvailable(x, y, level);
        }).then(function() {
            var promise = terrainProvider.requestTileGeometry(level, x, y);

            return when(promise, f, function(error) {
                expect('requestTileGeometry').toBe('returning a tile.'); // test failure
            });
        });
    }

    afterEach(function() {
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to TerrainProvider interface', function() {
        expect(GoogleEarthEnterpriseTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new GoogleEarthEnterpriseTerrainProvider();
        }).toThrowDeveloperError();

        expect(function() {
            return new GoogleEarthEnterpriseTerrainProvider({});
        }).toThrowDeveloperError();
    });

    it('resolves readyPromise', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return terrainProvider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(terrainProvider.ready).toBe(true);
        });
    });

    it('uses geographic tiling scheme by default', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            var tilingScheme = terrainProvider.tilingScheme;
            expect(tilingScheme instanceof GeographicTilingScheme).toBe(true);
        });
    });

    it('can use a custom ellipsoid', function() {
        installMockGetQuadTreePacket();

        var ellipsoid = new Ellipsoid(1, 2, 3);
        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url',
            ellipsoid : ellipsoid
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            expect(terrainProvider.tilingScheme.ellipsoid).toEqual(ellipsoid);
        });
    });

    it('has error event', function() {
        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });
        expect(terrainProvider.errorEvent).toBeDefined();
        expect(terrainProvider.errorEvent).toBe(terrainProvider.errorEvent);
    });

    it('returns reasonable geometric error for various levels', function() {
        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        expect(terrainProvider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
        expect(terrainProvider.getLevelMaximumGeometricError(0)).toEqualEpsilon(terrainProvider.getLevelMaximumGeometricError(1) * 2.0, CesiumMath.EPSILON10);
        expect(terrainProvider.getLevelMaximumGeometricError(1)).toEqualEpsilon(terrainProvider.getLevelMaximumGeometricError(2) * 2.0, CesiumMath.EPSILON10);
    });

    it('logo is undefined if credit is not provided', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            expect(terrainProvider.credit).toBeUndefined();
        });
    });

    it('logo is defined if credit is provided', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            expect(terrainProvider.credit).toBeDefined();
        });
    });

    it('has a water mask is false', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            expect(terrainProvider.hasWaterMask).toBe(false);
        });
    });

    it('has vertex normals is false', function() {
        installMockGetQuadTreePacket();

        terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
            url : 'made/up/url'
        });

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            expect(terrainProvider.hasVertexNormals).toBe(false);
        });
    });

    describe('requestTileGeometry', function() {
        it('uses the proxy if one is supplied', function() {
            installMockGetQuadTreePacket();
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url.indexOf('/proxy/?')).toBe(0);

                loadWithXhr.defaultLoad('Data/GoogleEarthEnterprise/gee.terrain', responseType, method, data, headers, deferred);
            };

            terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            return pollToPromise(function() {
                return terrainProvider.ready;
            }).then(function() {
                return terrainProvider.requestTileGeometry(0, 0, 0);
            });
        });

        it('provides GoogleEarthEnterpriseTerrainData', function() {
            installMockGetQuadTreePacket();
            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                loadWithXhr.defaultLoad('Data/GoogleEarthEnterprise/gee.terrain', responseType, method, data, headers, deferred);
            };

            return waitForTile(0, 0, 0, function(loadedData) {
                expect(loadedData).toBeInstanceOf(GoogleEarthEnterpriseTerrainData);
            });
        });

        it('returns undefined if too many requests are already in progress', function() {
            installMockGetQuadTreePacket();
            var baseUrl = 'made/up/url';

            var deferreds = [];
            var loadRealTile = true;
            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                if (loadRealTile) {
                    loadRealTile = false;
                    return loadWithXhr.defaultLoad('Data/GoogleEarthEnterprise/gee.terrain', responseType, method, data, headers, deferred);
                }
                // Do nothing, so requests never complete
                deferreds.push(deferred);
            };

            terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
                url : baseUrl
            });

            var promises = [];
            return pollToPromise(function() {
                return terrainProvider.ready;
            })
                .then(function() {
                    return pollToPromise(function() {
                        var b = true;
                        for (var i = 0; i < 10; ++i) {
                            b = b && terrainProvider.getTileDataAvailable(i, i, i);
                        }
                        return b && terrainProvider.getTileDataAvailable(1, 2, 3);
                    });
                })
                .then(function() {
                    var promise = terrainProvider.requestTileGeometry(1, 2, 3);
                    expect(promise).toBeDefined();
                    return promise;
                })
                .then(function(terrainData) {
                    expect(terrainData).toBeDefined();
                    for (var i = 0; i < 10; ++i) {
                        promises.push(terrainProvider.requestTileGeometry(i, i, i));
                    }

                    return terrainProvider.requestTileGeometry(1, 2, 3);
                })
                .then(function(terrainData) {
                    expect(terrainData).toBeUndefined();
                    for (var i = 0; i < deferreds.length; ++i) {
                        deferreds[i].resolve();
                    }

                    // Parsing terrain will fail, so just eat the errors and request the tile again
                    return when.all(promises)
                        .otherwise(function() {
                            loadRealTile = true;
                            return terrainProvider.requestTileGeometry(1, 2, 3);
                        });
                })
                .then(function(terrainData) {
                    expect(terrainData).toBeDefined();
                });
        });

        it('supports getTileDataAvailable()', function() {
            installMockGetQuadTreePacket();
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.terrain', responseType, method, data, headers, deferred);
            };

            terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
                url : baseUrl
            });

            return pollToPromise(function() {
                return terrainProvider.ready;
            }).then(function() {
                var tileInfo = terrainProvider._metadata._tileInfo;
                var info = tileInfo[GoogleEarthEnterpriseMetadata.tileXYToQuadKey(0, 1, 0)];
                info._bits = 0x7F; // Remove terrain bit from 0,1,0 tile
                info.terrainState = 1; // NONE
                info.ancestorHasTerrain = true;

                expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
                expect(terrainProvider.getTileDataAvailable(0, 1, 0)).toBe(false);
                expect(terrainProvider.getTileDataAvailable(1, 0, 0)).toBe(true);
                expect(terrainProvider.getTileDataAvailable(1, 1, 0)).toBe(true);
                expect(terrainProvider.getTileDataAvailable(0, 0, 2)).toBe(false);
            });
        });
    });
});
