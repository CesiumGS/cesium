import { Ellipsoid } from '../../Source/Cesium.js';
import { GeographicTilingScheme } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { Imagery } from '../../Source/Cesium.js';
import { ImageryLayer } from '../../Source/Cesium.js';
import { ImageryProvider } from '../../Source/Cesium.js';
import { ImageryState } from '../../Source/Cesium.js';
import { SingleTileImageryProvider } from '../../Source/Cesium.js';
import pollToPromise from '../pollToPromise.js';
import { when } from '../../Source/Cesium.js';

describe('Scene/SingleTileImageryProvider', function() {

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(SingleTileImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('resolves readyPromise', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with Resource', function() {
        var resource = new Resource({
            url : 'Data/Images/Red16x16.png'
        });

        var provider = new SingleTileImageryProvider({
            url : resource
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var provider = new SingleTileImageryProvider({
            url : 'invalid.image.url'
        });

        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function (e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain(provider.url);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('properties are gettable', function() {
        var url = 'Data/Images/Red16x16.png';
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var credit = 'hi';
        var provider = new SingleTileImageryProvider({
            url : url,
            rectangle : rectangle,
            credit : credit
        });

        expect(provider.url).toEqual(url);
        expect(provider.rectangle).toEqual(rectangle);
        expect(provider.hasAlphaChannel).toEqual(true);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tilingScheme.rectangle).toEqual(rectangle);
            expect(provider.tileWidth).toEqual(16);
            expect(provider.tileHeight).toEqual(16);
            expect(provider.maximumLevel).toEqual(0);
            expect(provider.tileDiscardPolicy).toBeUndefined();
        });
    });

    it('url is required', function() {
        function constructWithoutUrl() {
            return new SingleTileImageryProvider({});
        }
        expect(constructWithoutUrl).toThrowDeveloperError();
    });

    it('can use a custom ellipsoid', function() {
        var ellipsoid = new Ellipsoid(1, 2, 3);
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png',
            ellipsoid : ellipsoid
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
        });
    });

    it('requests the single image immediately upon construction', function() {
        var imageUrl = 'Data/Images/Red16x16.png';

        spyOn(Resource._Implementations, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
            expect(url).toEqual(imageUrl);
            Resource._DefaultImplementations.createImage(url, crossOrigin, deferred);
        });

        var provider = new SingleTileImageryProvider({
            url : imageUrl
        });

        expect(Resource._Implementations.createImage).toHaveBeenCalled();

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            return when(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeImageOrImageBitmap();
            });
        });
    });

    it('turns the supplied credit into a logo', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.credit).toBeUndefined();

            var providerWithCredit = new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png',
                credit : 'Thanks to our awesome made up source of this imagery!'
            });

            return pollToPromise(function() {
                return providerWithCredit.ready;
            }).then(function() {
                expect(providerWithCredit.credit).toBeDefined();
            });
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new SingleTileImageryProvider({
            url : 'made/up/url'
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
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

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeImageOrImageBitmap();
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });
});
