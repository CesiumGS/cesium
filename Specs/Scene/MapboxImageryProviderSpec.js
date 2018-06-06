defineSuite([
        'Scene/MapboxImageryProvider',
        'Core/DefaultProxy',
        'Core/Math',
        'Core/Rectangle',
        'Core/RequestScheduler',
        'Core/Resource',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/pollToPromise'
    ], function(
        MapboxImageryProvider,
        DefaultProxy,
        CesiumMath,
        Rectangle,
        RequestScheduler,
        Resource,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        pollToPromise) {
    'use strict';

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
    });

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(MapboxImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('requires the mapId to be specified', function() {
        expect(function() {
            return new MapboxImageryProvider({});
        }).toThrowDeveloperError();
    });

    it('resolves readyPromise', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
        });

        return provider.readyPromise.then(function (result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with Resource', function() {
        var resource = new Resource({
            url : 'made/up/mapbox/server/'
        });

        var provider = new MapboxImageryProvider({
            url : resource,
            mapId: 'test-id'
        });

        return provider.readyPromise.then(function (result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('supports a slash at the end of the URL', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
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
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server',
            mapId: 'test-id'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url).toContain('made/up/mapbox/server/');

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
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
        });

        expect(provider.url).toEqual('made/up/mapbox/server/');

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

    it('rectangle passed to constructor does not affect tile numbering', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            rectangle : rectangle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
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
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            maximumLevel : 5
        });
        expect(provider.maximumLevel).toEqual(5);
    });

    it('uses minimumLevel passed to constructor', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            minimumLevel : 1
        });
        expect(provider.minimumLevel).toEqual(1);
    });

    it('when no credit is supplied, the provider adds a default credit', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
        });
        expect(provider.credit).toBe(MapboxImageryProvider._defaultCredit);
    });

    it('turns the supplied credit into a logo', function() {
        var creditText = 'Thanks to our awesome made up source of this imagery!';
        var providerWithCredit = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            credit: creditText
        });
        expect(providerWithCredit.credit.html).toEqual(creditText);
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id'
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

    it('appends specified format', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            format: '@2x.png'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(/made\/up\/mapbox\/server\/test-id\/0\/0\/0@2x\.png\?access_token=/.test(url)).toBe(true);

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
            });
        });
    });

    it('adds missing period for format', function() {
        var provider = new MapboxImageryProvider({
            url : 'made/up/mapbox/server/',
            mapId: 'test-id',
            format: 'png'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(/made\/up\/mapbox\/server\/test-id\/0\/0\/0\.png\?access_token=/.test(url)).toBe(true);

                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(Resource._Implementations.createImage).toHaveBeenCalled();
            });
        });
    });
});
