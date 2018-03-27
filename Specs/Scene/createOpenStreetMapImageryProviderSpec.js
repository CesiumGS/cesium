defineSuite([
        'Scene/createOpenStreetMapImageryProvider',
        'Core/DefaultProxy',
        'Core/Math',
        'Core/Rectangle',
        'Core/RequestScheduler',
        'Core/Resource',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryState',
        'Scene/UrlTemplateImageryProvider',
        'Specs/pollToPromise'
    ], function(
        createOpenStreetMapImageryProvider,
        DefaultProxy,
        CesiumMath,
        Rectangle,
        RequestScheduler,
        Resource,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryState,
        UrlTemplateImageryProvider,
        pollToPromise) {
    'use strict';

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
    });

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
    });

    it('return a UrlTemplateImageryProvider', function() {
        var provider = createOpenStreetMapImageryProvider();
        expect(provider).toBeInstanceOf(UrlTemplateImageryProvider);
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server/'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('supports a Resource for the url', function() {
        var resource = new Resource({
            url : 'made/up/osm/server/'
        });

        var provider = createOpenStreetMapImageryProvider({
            url : resource
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).not.toContain('//');

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('supports a slash at the end of the URL', function() {
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server/'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).not.toContain('//');

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
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toContain('made/up/osm/server/');

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
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server/'
        });

        expect(provider.url).toContain('made/up/osm/server/');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
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

    it('when no credit is supplied, a default one is used', function() {
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
        });
        expect(provider.credit).toBeDefined();
    });

    it('turns the supplied credit into a logo', function() {
        var providerWithCredit = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.credit).toBeDefined();
    });

    it('rectangle passed to constructor does not affect tile numbering', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            rectangle : rectangle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle.west).toBeCloseTo(rectangle.west, CesiumMath.EPSILON10);
            expect(provider.rectangle.south).toBeCloseTo(rectangle.south, CesiumMath.EPSILON10);
            expect(provider.rectangle.east).toBeCloseTo(rectangle.east, CesiumMath.EPSILON10);
            expect(provider.rectangle.north).toBeCloseTo(rectangle.north, CesiumMath.EPSILON10);
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
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            maximumLevel : 5
        });
        expect(provider.maximumLevel).toEqual(5);
    });

    it('uses minimumLevel passed to constructor', function() {
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            minimumLevel : 1
        });
        expect(provider.minimumLevel).toEqual(1);
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = createOpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
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

    it('throws with more than four tiles at the minimum', function() {
        var rectangle = new Rectangle(0.0, 0.0, CesiumMath.toRadians(1.0), CesiumMath.toRadians(1.0));

        expect(function() {
            return createOpenStreetMapImageryProvider({
                minimumLevel : 9,
                rectangle : rectangle
            });
        }).toThrowDeveloperError();
    });
});
