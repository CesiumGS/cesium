/*global defineSuite*/
defineSuite([
        'Core/CesiumTerrainProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/loadWithXhr',
        'Core/Math',
        'Core/QuantizedMeshTerrainData',
        'Core/TerrainProvider',
        'ThirdParty/when'
    ], function(
        CesiumTerrainProvider,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        HeightmapTerrainData,
        loadWithXhr,
        CesiumMath,
        QuantizedMeshTerrainData,
        TerrainProvider,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    function returnTileJson(path) {
        var oldLoad = loadWithXhr.load;
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (url.indexOf('layer.json') >= 0) {
                return loadWithXhr.defaultLoad(path, responseType, method, data, headers, deferred);
            } else {
                return oldLoad(url, responseType, method, data, headers, deferred, overrideMimeType);
            }
        };
    }

    function returnHeightmapTileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/StandardHeightmap.tile.json');
    }

    function returnQuantizedMeshTileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/QuantizedMesh.tile.json');
    }

    function returnQuantizedMesh20TileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/QuantizedMesh2.0.tile.json');
    }

    function returnQuantizedMesh11TileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/QuantizedMesh1.1.tile.json');
    }

    function returnVertexNormalTileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/VertexNormals.tile.json');
    }

    function returnPartialAvailabilityTileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/PartialAvailability.tile.json');
    }

    it('conforms to TerrainProvider interface', function() {
        expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new CesiumTerrainProvider();
        }).toThrowDeveloperError();

        expect(function() {
            return new CesiumTerrainProvider({
            });
        }).toThrowDeveloperError();
    });

    it('uses geographic tiling scheme by default', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            var tilingScheme = provider.tilingScheme;
            expect(tilingScheme instanceof GeographicTilingScheme).toBe(true);
        });
    });

    it('has error event', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.errorEvent).toBeDefined();
        expect(provider.errorEvent).toBe(provider.errorEvent);
    });

    it('returns reasonable geometric error for various levels', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
        expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(provider.getLevelMaximumGeometricError(1) * 2.0, CesiumMath.EPSILON10);
        expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(provider.getLevelMaximumGeometricError(2) * 2.0, CesiumMath.EPSILON10);
    });

    it('logo is undefined if credit is not provided', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.credit).toBeUndefined();
        });
    });

    it('logo is defined if credit is provided', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.credit).toBeDefined();
        });
    });

    it('has a water mask', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.hasWaterMask).toBe(true);
        });
    });

    it('has vertex normals', function() {
        returnVertexNormalTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url',
            requestVertexNormals : true
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.requestVertexNormals).toBe(true);
            expect(provider.hasVertexNormals).toBe(true);
        });
    });

    it('does not request vertex normals', function() {
        returnVertexNormalTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url',
            requestVertexNormals : false
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.requestVertexNormals).toBe(false);
            expect(provider.hasVertexNormals).toBe(false);
        });
    });

    it('raises an error if layer.json does not specify a format', function() {
        returnTileJson('Data/CesiumTerrainTileJson/NoFormat.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return defined(error);
        }, 'error to be raised');

        runs(function() {
            expect(error.message).toContain('format is not specified');
        });
    });

    it('raises an error if layer.json specifies an unknown format', function() {
        returnTileJson('Data/CesiumTerrainTileJson/InvalidFormat.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return defined(error);
        }, 'error to be raised');

        runs(function() {
            expect(error.message).toContain('invalid or not supported');
        });
    });

    it('raises an error if layer.json does not specify quantized-mesh 1.x format', function() {
        returnTileJson('Data/CesiumTerrainTileJson/QuantizedMesh2.0.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return defined(error);
        }, 'error to be raised');

        runs(function() {
            expect(error.message).toContain('invalid or not supported');
        });
    });

    it('supports quantized-mesh1.x minor versions', function() {
        returnTileJson('Data/CesiumTerrainTileJson/QuantizedMesh1.1.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(error).not.toBeDefined();
        });
    });

    it('raises an error if layer.json does not specify a tiles property', function() {
        returnTileJson('Data/CesiumTerrainTileJson/NoTiles.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return defined(error);
        }, 'error to be raised');

        runs(function() {
            expect(error.message).toContain('does not specify any tile URL templates');
        });
    });

    it('raises an error if layer.json tiles property is an empty array', function() {
        returnTileJson('Data/CesiumTerrainTileJson/EmptyTilesArray.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var error;
        provider.errorEvent.addEventListener(function(e) {
            error = e;
        });

        waitsFor(function() {
            return defined(error);
        }, 'error to be raised');

        runs(function() {
            expect(error.message).toContain('does not specify any tile URL templates');
        });
    });

    it('uses attribution specified in layer.json', function() {
        returnTileJson('Data/CesiumTerrainTileJson/WithAttribution.tile.json');

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.ready;
        });

        runs(function() {
            expect(provider.credit.text).toBe('This amazing data is courtesy The Amazing Data Source!');
        });
    });

    describe('requestTileGeometry', function() {
        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url.indexOf('/proxy/?')).toBe(0);

                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loaded = false;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loaded = true;
                });
            });

            waitsFor(function() {
                return loaded;
            }, 'request to complete');
        });

        it('provides HeightmapTerrainData', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
            });
        });

        it('provides QuantizedMeshTerrainData', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.terrain', responseType, method, data, headers, deferred);
            };

            returnQuantizedMeshTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
            });
        });

        it('provides QuantizedMeshTerrainData with VertexNormals', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.vertexnormals.terrain', responseType, method, data, headers, deferred);
            };

            returnVertexNormalTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                requestVertexNormals : true
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
                expect(loadedData._encodedNormals).toBeDefined();
            });
        });

        it('provides QuantizedMeshTerrainData with VertexNormals and unknown extensions', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.vertexnormals.unknownext.terrain', responseType, method, data, headers, deferred);
            };

            returnVertexNormalTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                requestVertexNormals : true
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
                expect(loadedData._encodedNormals).toBeDefined();
            });
        });

        it('provides QuantizedMeshTerrainData with unknown extension', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.unknownext.terrain', responseType, method, data, headers, deferred);
            };

            returnVertexNormalTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                requestVertexNormals : true
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
            });
        });

        it('returns undefined if too many requests are already in progress', function() {
            var baseUrl = 'made/up/url';

            var deferreds = [];

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                // Do nothing, so requests never complete
                deferreds.push(deferred);
            };

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);
                expect(promise).toBeDefined();

                var i;
                for (i = 0; i < 10; ++i) {
                    promise = terrainProvider.requestTileGeometry(0, 0, 0);
                }

                promise = terrainProvider.requestTileGeometry(0, 0, 0);
                expect(promise).toBeUndefined();

                for (i = 0; i < deferreds.length; ++i) {
                    deferreds[i].resolve();
                }
            });
        });

        it('supports getTileDataAvailable()', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.terrain', responseType, method, data, headers, deferred);
            };

            returnQuantizedMeshTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
                expect(terrainProvider.getTileDataAvailable(0, 0, 2)).toBe(false);
            });
        });

        it('getTileDataAvailable() converts xyz to tms', function() {
            var baseUrl = 'made/up/url';

            returnPartialAvailabilityTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.ready;
            });

            runs(function() {
                expect(terrainProvider.getTileDataAvailable(1, 3, 2)).toBe(true);
                expect(terrainProvider.getTileDataAvailable(1, 0, 2)).toBe(false);
            });
        });
    });
});
