/*global defineSuite*/
defineSuite([
         'Scene/VRTheWorldTerrainProvider',
         'Core/loadImage',
         'Core/loadXML',
         'Core/DefaultProxy',
         'Core/Ellipsoid',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/HeightmapTerrainData',
         'Scene/TerrainProvider',
         'ThirdParty/when'
     ], function(
          VRTheWorldTerrainProvider,
         loadImage,
         loadXML,
         DefaultProxy,
         Ellipsoid,
         CesiumMath,
         GeographicTilingScheme,
         HeightmapTerrainData,
         TerrainProvider,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    beforeEach(function() {
        loadXML.loadXML = function(url, headers, deferred) {
            setTimeout(function() {
                var parser = new DOMParser();
                var xmlString =
                    '<TileMap version="1.0.0" tilemapservice="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/">' +
                    '<!--  Additional data: tms_type is default  -->' +
                    '<Title>Hawaii World elev</Title>' +
                    '<Abstract>layer to make cesium work right</Abstract>' +
                    '<SRS>EPSG:4326</SRS>' +
                    '<BoundingBox minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000"/>' +
                    '<Origin x="-180.000000" y="-90.000000"/>' +
                    '<TileFormat width="32" height="32" mime-type="image/tif" extension="tif"/>' +
                    '<TileSets>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/0" units-per-pixel="5.62500000000000000000" order="0"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/1" units-per-pixel="2.81250000000000000000" order="1"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/2" units-per-pixel="1.40625000000000000000" order="2"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/3" units-per-pixel="0.70312500000000000000" order="3"/>' +
                    '</TileSets>' +
                    '<DataExtents>' +
                    '<DataExtent minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000" minlevel="0" maxlevel="9"/>' +
                    '<DataExtent minx="24.999584" miny="-0.000417" maxx="30.000417" maxy="5.000417" minlevel="0" maxlevel="13"/>' +
                    '</DataExtents>' +
                    '</TileMap>';
                var xml = parser.parseFromString(xmlString, "text/xml");
                deferred.resolve(xml);
            }, 1);
        };
    });

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadXML.loadXML = loadXML.defaultLoadXML;
    });

    it('conforms to TerrainProvider interface', function() {
        expect(VRTheWorldTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new VRTheWorldTerrainProvider();
        }).toThrow();

        expect(function() {
            return new VRTheWorldTerrainProvider({
            });
        }).toThrow();
    });

    it('has error event', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getErrorEvent()).toBeDefined();
        expect(provider.getErrorEvent()).toBe(provider.getErrorEvent());
    });

    it('returns reasonable geometric error for various levels', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'provider to be ready');

        runs(function() {
            expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
            expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(provider.getLevelMaximumGeometricError(1) * 2.0, CesiumMath.EPSILON10);
            expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(provider.getLevelMaximumGeometricError(2) * 2.0, CesiumMath.EPSILON10);
        });
    });

    it('getLevelMaximumGeometricError must not be called before isReady returns true', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });

        expect(function() {
            provider.getLevelMaximumGeometricError(0);
        }).toThrow();
    });

    it('getTilingScheme must not be called before isReady returns true', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });

        expect(function() {
            provider.getTilingScheme();
        }).toThrow();
    });

    it('logo is undefined if credit is not provided', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getLogo()).toBeUndefined();
    });

    it('logo is defined if credit is provided', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });
        expect(provider.getLogo()).toBeDefined();
    });

    it('does not have a water mask', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.hasWaterMask()).toBe(false);
    });

    it('is not ready immediately', function() {
        var provider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.isReady()).toBe(false);
    });

    it('raises an error if the SRS is not supported', function() {
        loadXML.loadXML = function(url, headers, deferred) {
            setTimeout(function() {
                var parser = new DOMParser();
                var xmlString =
                    '<TileMap version="1.0.0" tilemapservice="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/">' +
                    '<!--  Additional data: tms_type is default  -->' +
                    '<Title>Hawaii World elev</Title>' +
                    '<Abstract>layer to make cesium work right</Abstract>' +
                    '<SRS>EPSG:foo</SRS>' +
                    '<BoundingBox minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000"/>' +
                    '<Origin x="-180.000000" y="-90.000000"/>' +
                    '<TileFormat width="32" height="32" mime-type="image/tif" extension="tif"/>' +
                    '<TileSets>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/0" units-per-pixel="5.62500000000000000000" order="0"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/1" units-per-pixel="2.81250000000000000000" order="1"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/2" units-per-pixel="1.40625000000000000000" order="2"/>' +
                    '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/3" units-per-pixel="0.70312500000000000000" order="3"/>' +
                    '</TileSets>' +
                    '<DataExtents>' +
                    '<DataExtent minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000" minlevel="0" maxlevel="9"/>' +
                    '<DataExtent minx="24.999584" miny="-0.000417" maxx="30.000417" maxy="5.000417" minlevel="0" maxlevel="13"/>' +
                    '</DataExtents>' +
                    '</TileMap>';
                var xml = parser.parseFromString(xmlString, "text/xml");
                deferred.resolve(xml);
            }, 1);
        };

        var terrainProvider = new VRTheWorldTerrainProvider({
            url : 'made/up/url'
        });

        var errorRaised = false;
        terrainProvider.getErrorEvent().addEventListener(function() {
            errorRaised = true;
        });

        waitsFor(function() {
            return errorRaised;
        }, 'error to be raised');
    });

    describe('requestTileGeometry', function() {
        it('must not be called before isReady returns true', function() {
            var terrainProvider = new VRTheWorldTerrainProvider({
                url : 'made/up/url',
                proxy : new DefaultProxy('/proxy/')
            });

            expect(function() {
                terrainProvider.requestTileGeometry(0, 0, 0);
            }).toThrow();
        });

        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('/proxy/?')).toBe(0);
                expect(url.indexOf(encodeURIComponent('.tif?cesium=true'))).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new VRTheWorldTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            waitsFor(function() {
                return terrainProvider.isReady();
            });

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                var loaded = false;
                when(promise, function(terrainData) {
                    loaded = true;
                });

                waitsFor(function() {
                    return loaded;
                }, 'request to complete');
            });
        });

        it('provides HeightmapTerrainData', function() {
            var baseUrl = 'made/up/url';

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('.tif?cesium=true')).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new VRTheWorldTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.isReady();
            });

            var loadedData;

            runs(function() {
                expect(terrainProvider.getTilingScheme() instanceof GeographicTilingScheme).toBe(true);
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
            });

            waitsFor(function() {
                return typeof loadedData !== 'undefined';
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
            });
        });

        it('returns undefined if too many requests are already in progress', function() {
            var baseUrl = 'made/up/url';

            var deferreds = [];

            loadImage.createImage = function(url, crossOrigin, deferred) {
                // Do nothing, so requests never complete
                deferreds.push(deferred);
            };

            var terrainProvider = new VRTheWorldTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
               return terrainProvider.isReady();
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
    });
});
