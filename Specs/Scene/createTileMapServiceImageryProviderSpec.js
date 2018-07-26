defineSuite([
        'Scene/createTileMapServiceImageryProvider',
        'Core/Cartesian2',
        'Core/Cartographic',
        'Core/DefaultProxy',
        'Core/GeographicProjection',
        'Core/GeographicTilingScheme',
        'Core/getAbsoluteUri',
        'Core/Math',
        'Core/Rectangle',
        'Core/RequestScheduler',
        'Core/Resource',
        'Core/WebMercatorProjection',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryState',
        'Scene/UrlTemplateImageryProvider',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        createTileMapServiceImageryProvider,
        Cartesian2,
        Cartographic,
        DefaultProxy,
        GeographicProjection,
        GeographicTilingScheme,
        getAbsoluteUri,
        CesiumMath,
        Rectangle,
        RequestScheduler,
        Resource,
        WebMercatorProjection,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryState,
        UrlTemplateImageryProvider,
        pollToPromise,
        when) {
    'use strict';

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
    });

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
        Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;
    });

    it('return a UrlTemplateImageryProvider', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
        });
        expect(provider).toBeInstanceOf(UrlTemplateImageryProvider);
    });

    it('resolves readyPromise', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise when promise url is used', function() {
        var provider = createTileMapServiceImageryProvider({
            url : when.resolve('made/up/tms/server/')
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with Resource', function() {
        var resource = new Resource({
            url : 'made/up/tms/server/'
        });

        var provider = createTileMapServiceImageryProvider({
            url : resource
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise if options.url rejects', function() {
        var error = new Error();
        var provider = createTileMapServiceImageryProvider({
            url : when.reject(error)
        });
        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(result) {
            expect(result).toBe(error);
            expect(provider.ready).toBe(false);
        });
    });

    it('rejects readyPromise on error', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            // We can't resolve the promise immediately, because then the error would be raised
            // before we could subscribe to it.  This a problem particular to tests.
            setTimeout(function() {
                var parser = new DOMParser();
                var xmlString =
                    '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                    '   <Title/>' +
                    '   <Abstract/>' +
                    '   <SRS>EPSG:4326</SRS>' +
                    '   <BoundingBox minx="-10.0" miny="-123.0" maxx="11.0" maxy="-110.0"/>' +
                    '   <Origin x="-90.0" y="-180.0"/>' +
                    '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                    '   <TileSets profile="foobar">' +
                    '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                    '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                    '   </TileSets>' +
                    '</TileMap>';
                var xml = parser.parseFromString(xmlString, 'text/xml');
                deferred.resolve(xml);
            }, 1);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain('unsupported profile');
        });
    });

    it('rejects readyPromise on invalid xml', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            // We can't resolve the promise immediately, because then the error would be raised
            // before we could subscribe to it.  This a problem particular to tests.
            setTimeout(function() {
                var parser = new DOMParser();
                var xmlString =
                    '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                    '   <Title/>' +
                    '   <Abstract/>' +
                    '   <SRS>EPSG:4326</SRS>' +
                    '   <Origin x="-90.0" y="-180.0"/>' +
                    '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                    '   <TileSets profile="foobar">' +
                    '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                    '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                    '   </TileSets>' +
                    '</TileMap>';
                var xml = parser.parseFromString(xmlString, 'text/xml');
                deferred.resolve(xml);
            }, 1);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain('expected tilesets or bbox attributes');
        });
    });

    it('requires the url to be specified', function() {
        function createWithoutUrl() {
            return createTileMapServiceImageryProvider({});
        }

        expect(createWithoutUrl).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('supports a slash at the end of the URL', function() {
        var baseUrl = 'made/up/tms/server/';
        var provider = createTileMapServiceImageryProvider({
            url : baseUrl
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toStartWith(getAbsoluteUri(baseUrl));

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('supports no slash at the endof the URL', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'http://made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toContain('made/up/tms/server/');

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('supports a query string at the end of the URL', function() {
        var baseUrl = 'made/up/tms/server/';
        var provider = createTileMapServiceImageryProvider({
            url : baseUrl + '?a=some&b=query'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toStartWith(getAbsoluteUri(baseUrl));
                expect(url).toContain('?a=some&b=query');
                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.url).toEqual(getAbsoluteUri('made/up/tms/server/{z}/{x}/{reverseY}.png'));
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('when no credit is supplied, the provider has no logo', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });
        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.credit).toBeUndefined();
        });
    });

    it('turns the supplied credit into a logo', function() {
        var providerWithCredit = createTileMapServiceImageryProvider({
            url : 'made/up/gms/server',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        return pollToPromise(function() {
            return providerWithCredit.ready;
        }).then(function() {
            expect(providerWithCredit.credit).toBeDefined();
        });
    });

    it('resource request takes a query string', function() {
        /*eslint-disable no-unused-vars*/
        var requestMetadata = when.defer();
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestMetadata.resolve(url);
            deferred.reject(); //since the TMS server doesn't exist (and doesn't need too) we can just reject here.
        });

        var provider = createTileMapServiceImageryProvider({
            url : 'http://server.invalid?query=1'
        });

        return requestMetadata.promise.then(function(url) {
            expect(/\?query=1$/.test(url)).toEqual(true);
        });
        /*eslint-enable no-unused-vars*/
    });

    it('rectangle passed to constructor does not affect tile numbering', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            rectangle : rectangle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle.west).toEqualEpsilon(rectangle.west, CesiumMath.EPSILON14);
            expect(provider.rectangle.east).toEqualEpsilon(rectangle.east, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toEqualEpsilon(rectangle.north, CesiumMath.EPSILON14);
            expect(provider.rectangle.south).toEqualEpsilon(rectangle.south, CesiumMath.EPSILON14);
            expect(provider.tileDiscardPolicy).toBeUndefined();

            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toContain('/0/0/0');

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('uses maximumLevel passed to constructor', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            maximumLevel : 5
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.maximumLevel).toEqual(5);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
            setTimeout(function() {
                RequestScheduler.update();
            }, 1);
        });

        Resource._Implementations.createImage = function(url, crossOrigin, deferred) {
            if (tries === 2) {
                // Succeed after 2 tries
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            var imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);
            RequestScheduler.update();

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeInstanceOf(Image);
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });

    it('keeps the rectangle within the bounds allowed by the tiling scheme no matter what the tilemapresource.xml says.', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                "<TileMap version='1.0.0' tilemapservice='http://tms.osgeo.org/1.0.0'>" +
                '  <Title>dnb_land_ocean_ice.2012.54000x27000_geo.tif</Title>' +
                '  <Abstract/>' +
                '  <SRS>EPSG:900913</SRS>' +
                "  <BoundingBox miny='-88.0' minx='-185.0' maxy='88.0' maxx='185.0'/>" +
                "  <Origin y='-88.0' x='-180.00000000000000'/>" +
                "  <TileFormat width='256' height='256' mime-type='image/png' extension='png'/>" +
                "  <TileSets profile='mercator'>" +
                "    <TileSet href='8' units-per-pixel='611.49622617187504' order='8'/>" +
                '  </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.rectangle.west).toEqualEpsilon(CesiumMath.toRadians(-180.0), CesiumMath.EPSILON14);
            expect(provider.rectangle.west).toBeGreaterThanOrEqualTo(provider.tilingScheme.rectangle.west);
            expect(provider.rectangle.east).toEqualEpsilon(CesiumMath.toRadians(180.0), CesiumMath.EPSILON14);
            expect(provider.rectangle.east).toBeLessThanOrEqualTo(provider.tilingScheme.rectangle.east);
            expect(provider.rectangle.south).toEqualEpsilon(-WebMercatorProjection.MaximumLatitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.south).toBeGreaterThanOrEqualTo(provider.tilingScheme.rectangle.south);
            expect(provider.rectangle.north).toEqualEpsilon(WebMercatorProjection.MaximumLatitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toBeLessThanOrEqualTo(provider.tilingScheme.rectangle.north);
        });
    });

    it('uses a minimum level if the tilemapresource.xml specifies one and it is reasonable', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                "<TileMap version='1.0.0' tilemapservice='http://tms.osgeo.org/1.0.0'>" +
                '  <Title>dnb_land_ocean_ice.2012.54000x27000_geo.tif</Title>' +
                '  <Abstract/>' +
                '  <SRS>EPSG:900913</SRS>' +
                "  <BoundingBox minx='-10.0' miny='5.0' maxx='-9.0' maxy='6.0'/>" +
                "  <Origin x='-88.0' y='-180.00000000000000'/>" +
                "  <TileFormat width='256' height='256' mime-type='image/png' extension='png'/>" +
                "  <TileSets profile='mercator'>" +
                "    <TileSet href='7' units-per-pixel='1222.99245234375008' order='7'/>" +
                "    <TileSet href='8' units-per-pixel='611.49622617187504' order='8'/>" +
                '  </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.maximumLevel).toBe(8);
            expect(provider.minimumLevel).toBe(7);
        });
    });

    it('ignores the minimum level in the tilemapresource.xml if it is unreasonable', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                "<TileMap version='1.0.0' tilemapservice='http://tms.osgeo.org/1.0.0'>" +
                '  <Title>dnb_land_ocean_ice.2012.54000x27000_geo.tif</Title>' +
                '  <Abstract/>' +
                '  <SRS>EPSG:900913</SRS>' +
                "  <BoundingBox minx='-170.0' miny='-85.0' maxx='170.0' maxy='85.0'/>" +
                "  <Origin x='-88.0' y='-180.00000000000000'/>" +
                "  <TileFormat width='256' height='256' mime-type='image/png' extension='png'/>" +
                "  <TileSets profile='mercator'>" +
                "    <TileSet href='7' units-per-pixel='1222.99245234375008' order='7'/>" +
                "    <TileSet href='8' units-per-pixel='611.49622617187504' order='8'/>" +
                '  </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.maximumLevel).toBe(8);
            expect(provider.minimumLevel).toBe(0);
        });
    });

    it('handles XML with casing differences', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                "<Tilemap version='1.0.0' tilemapservice='http://tms.osgeo.org/1.0.0'>" +
                '  <Title>dnb_land_ocean_ice.2012.54000x27000_geo.tif</Title>' +
                '  <Abstract/>' +
                '  <SRS>EPSG:900913</SRS>' +
                "  <boundingbox minx='-10.0' miny='5.0' maxx='-9.0' maxy='6.0'/>" +
                "  <Origin x='-88.0' y='-180.00000000000000'/>" +
                "  <Tileformat width='256' height='256' mime-type='image/png' extension='png'/>" +
                "  <TileSets profile='mercator'>" +
                "    <tiLeset href='7' units-per-pixel='1222.99245234375008' order='7'/>" +
                "    <tileset href='8' units-per-pixel='611.49622617187504' order='8'/>" +
                '  </TileSets>' +
                '</Tilemap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.maximumLevel).toBe(8);
            expect(provider.minimumLevel).toBe(7);
        });
    });

    it('supports the global-mercator profile with a non-flipped, mercator bounding box', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                '   <Title/>' +
                '   <Abstract/>' +
                '   <SRS>EPSG:900913</SRS>' +
                '   <BoundingBox minx="-11877789.66764229300000" miny="1707163.75952051670000" maxx="-4696205.45407573510000" maxy="7952627.07365330120000"/>' +
                '   <Origin x="-20037508.34278924400000" y="-20037508.34278924400000"/>' +
                '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                '   <TileSets profile="global-mercator">' +
                '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                '   </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tilingScheme.projection).toBeInstanceOf(WebMercatorProjection);

            var projection = provider.tilingScheme.projection;
            var expectedSW = projection.unproject(new Cartesian2(-11877789.66764229300000, 1707163.75952051670000));
            var expectedNE = projection.unproject(new Cartesian2(-4696205.45407573510000, 7952627.07365330120000));

            expect(provider.rectangle.west).toEqual(expectedSW.longitude);
            expect(provider.rectangle.south).toEqual(expectedSW.latitude);
            expect(provider.rectangle.east).toBeCloseTo(expectedNE.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toEqual(expectedNE.latitude);
        });
    });

    it('supports the global-geodetic profile with a non-flipped, geographic bounding box', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                '   <Title/>' +
                '   <Abstract/>' +
                '   <SRS>EPSG:4326</SRS>' +
                '   <BoundingBox minx="-123.0" miny="-10.0" maxx="-110.0" maxy="11.0"/>' +
                '   <Origin x="-180.0" y="-90.0"/>' +
                '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                '   <TileSets profile="global-geodetic">' +
                '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                '   </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tilingScheme.projection).toBeInstanceOf(GeographicProjection);

            var expectedSW = Cartographic.fromDegrees(-123.0, -10.0);
            var expectedNE = Cartographic.fromDegrees(-110.0, 11.0);

            expect(provider.rectangle.west).toBeCloseTo(expectedSW.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.south).toEqual(expectedSW.latitude);
            expect(provider.rectangle.east).toBeCloseTo(expectedNE.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toEqual(expectedNE.latitude);
        });
    });

    it('supports the old mercator profile with a flipped, geographic bounding box', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                '   <Title/>' +
                '   <Abstract/>' +
                '   <SRS>EPSG:900913</SRS>' +
                '   <BoundingBox minx="-10.0" miny="-123.0" maxx="11.0" maxy="-110.0"/>' +
                '   <Origin x="-90.0" y="-180.0"/>' +
                '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                '   <TileSets profile="mercator">' +
                '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                '   </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            flipXY : true
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tilingScheme.projection).toBeInstanceOf(WebMercatorProjection);

            var expectedSW = Cartographic.fromDegrees(-123.0, -10.0);
            var expectedNE = Cartographic.fromDegrees(-110.0, 11.0);

            expect(provider.rectangle.west).toBeCloseTo(expectedSW.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.south).toEqual(expectedSW.latitude);
            expect(provider.rectangle.east).toBeCloseTo(expectedNE.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toEqual(expectedNE.latitude);
        });
    });

    it('supports the old geodetic profile with a flipped, geographic bounding box', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            var parser = new DOMParser();
            var xmlString =
                '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                '   <Title/>' +
                '   <Abstract/>' +
                '   <SRS>EPSG:4326</SRS>' +
                '   <BoundingBox minx="-10.0" miny="-123.0" maxx="11.0" maxy="-110.0"/>' +
                '   <Origin x="-90.0" y="-180.0"/>' +
                '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                '   <TileSets profile="geodetic">' +
                '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                '   </TileSets>' +
                '</TileMap>';
            var xml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve(xml);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            flipXY : true
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tilingScheme.projection).toBeInstanceOf(GeographicProjection);

            var expectedSW = Cartographic.fromDegrees(-123.0, -10.0);
            var expectedNE = Cartographic.fromDegrees(-110.0, 11.0);

            expect(provider.rectangle.west).toBeCloseTo(expectedSW.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.south).toEqual(expectedSW.latitude);
            expect(provider.rectangle.east).toBeCloseTo(expectedNE.longitude, CesiumMath.EPSILON14);
            expect(provider.rectangle.north).toEqual(expectedNE.latitude);
        });
    });

    it('raises an error if tilemapresource.xml specifies an unsupported profile', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            // We can't resolve the promise immediately, because then the error would be raised
            // before we could subscribe to it.  This a problem particular to tests.
            setTimeout(function() {
                var parser = new DOMParser();
                var xmlString =
                    '<TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">' +
                    '   <Title/>' +
                    '   <Abstract/>' +
                    '   <SRS>EPSG:4326</SRS>' +
                    '   <BoundingBox minx="-10.0" miny="-123.0" maxx="11.0" maxy="-110.0"/>' +
                    '   <Origin x="-90.0" y="-180.0"/>' +
                    '   <TileFormat width="256" height="256" mime-type="image/png" extension="png"/>' +
                    '   <TileSets profile="foobar">' +
                    '       <TileSet href="2" units-per-pixel="39135.75848201024200" order="2"/>' +
                    '       <TileSet href="3" units-per-pixel="19567.87924100512100" order="3"/>' +
                    '   </TileSets>' +
                    '</TileMap>';
                var xml = parser.parseFromString(xmlString, 'text/xml');
                deferred.resolve(xml);
            }, 1);
        };

        var provider = createTileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        var errorRaised = false;
        provider.errorEvent.addEventListener(function(e) {
            expect(e.message).toContain('unsupported profile');
            errorRaised = true;
        });

        return pollToPromise(function() {
            return errorRaised;
        }).then(function() {
            expect(errorRaised).toBe(true);
        });
    });
});
