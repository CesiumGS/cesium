/*global defineSuite*/
defineSuite([
    'Scene/GoogleEarthEnterpriseImageryProvider',
    'Core/DefaultProxy',
    'Core/defaultValue',
    'Core/defined',
    'Core/GeographicTilingScheme',
    'Core/GoogleEarthEnterpriseMetadata',
    'Core/loadImage',
    'Core/loadWithXhr',
    'Core/Rectangle',
    'Scene/DiscardMissingTileImagePolicy',
    'Scene/Imagery',
    'Scene/ImageryLayer',
    'Scene/ImageryProvider',
    'Scene/ImageryState',
    'Specs/pollToPromise',
    'ThirdParty/when'
], function(
    GoogleEarthEnterpriseImageryProvider,
    DefaultProxy,
    defaultValue,
    defined,
    GeographicTilingScheme,
    GoogleEarthEnterpriseMetadata,
    loadImage,
    loadWithXhr,
    Rectangle,
    DiscardMissingTileImagePolicy,
    Imagery,
    ImageryLayer,
    ImageryProvider,
    ImageryState,
    pollToPromise,
    when) {
    'use strict';

    var oldDecode;
    beforeAll(function() {
        oldDecode = GoogleEarthEnterpriseMetadata.decode;
        GoogleEarthEnterpriseMetadata.decode = function(data) {
            return data;
        };
    });

    afterAll(function() {
        GoogleEarthEnterpriseMetadata.decode = oldDecode;
    });

    var imageryProvider;
    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthEnterpriseImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new GoogleEarthEnterpriseImageryProvider({});
        }

        expect(constructWithoutServer).toThrowDeveloperError();
    });

    function installMockGetQuadTreePacket() {
        spyOn(GoogleEarthEnterpriseMetadata.prototype, 'getQuadTreePacket').and.callFake(function(quadKey, version) {
            quadKey = defaultValue(quadKey, '');
            this._tileInfo[quadKey + '0'] = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            this._tileInfo[quadKey + '1'] = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            this._tileInfo[quadKey + '2'] = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            this._tileInfo[quadKey + '3'] = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);

            return when();
        });
    }

    function installFakeImageRequest(expectedUrl) {
        loadImage.createImage = function(url, crossOrigin, deferred) {
            if (/^blob:/.test(url)) {
                // load blob url normally
                loadImage.defaultCreateImage(url, crossOrigin, deferred);
            } else {
                if (defined(expectedUrl)) {
                    expect(url).toEqual(expectedUrl);
                }
                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            }
        };

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (defined(expectedUrl)) {
                expect(url).toEqual(expectedUrl);
            }

            // Just return any old image.
            loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
        };
    }

    it('resolves readyPromise', function() {
        installMockGetQuadTreePacket();
        var url = 'http://fake.fake.invalid';

        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return imageryProvider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(imageryProvider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var url = 'host.invalid';
        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return imageryProvider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(e) {
            expect(imageryProvider.ready).toBe(false);
            expect(e.message).toContain(url);
        });
    });

    it('returns false for hasAlphaChannel', function() {
        installMockGetQuadTreePacket();
        var url = 'http://fake.fake.invalid';

        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return pollToPromise(function() {
            return imageryProvider.ready;
        }).then(function() {
            expect(typeof imageryProvider.hasAlphaChannel).toBe('boolean');
            expect(imageryProvider.hasAlphaChannel).toBe(false);
        });
    });

    it('can provide a root tile', function() {
        installMockGetQuadTreePacket();
        var url = 'http://fake.fake.invalid/';

        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        expect(imageryProvider.url).toEqual(url);

        return pollToPromise(function() {
            return imageryProvider.ready;
        }).then(function() {
            expect(imageryProvider.tileWidth).toEqual(256);
            expect(imageryProvider.tileHeight).toEqual(256);
            expect(imageryProvider.maximumLevel).toEqual(23);
            expect(imageryProvider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            // Defaults to custom tile policy
            expect(imageryProvider.tileDiscardPolicy).not.toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(imageryProvider.rectangle).toEqual(new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI));
            expect(imageryProvider.credit).toBeUndefined();

            installFakeImageRequest('http://fake.fake.invalid/flatfile?f1-03-i.1');

            return imageryProvider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        installMockGetQuadTreePacket();
        var url = 'http://foo.bar.invalid/';

        var proxy = new DefaultProxy('/proxy/');

        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url,
            proxy : proxy
        });

        expect(imageryProvider.url).toEqual(url);
        expect(imageryProvider.proxy).toEqual(proxy);

        return pollToPromise(function() {
            return imageryProvider.ready;
        }).then(function() {
            installFakeImageRequest(proxy.getURL('http://foo.bar.invalid/flatfile?f1-03-i.1'));

            return imageryProvider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error on invalid url', function() {
        var url = 'host.invalid';
        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        var errorEventRaised = false;
        imageryProvider.errorEvent.addEventListener(function(error) {
            expect(error.message).toContain(url);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return imageryProvider.ready || errorEventRaised;
        }).then(function() {
            expect(imageryProvider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        installMockGetQuadTreePacket();
        var url = 'http://foo.bar.invalid';

        imageryProvider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        var layer = new ImageryLayer(imageryProvider);

        var tries = 0;
        imageryProvider.errorEvent.addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (tries === 2) {
                // Succeed after 2 tries
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        return pollToPromise(function() {
            return imageryProvider.ready;
        }).then(function() {
            var imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeInstanceOf(Image);
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });
});
