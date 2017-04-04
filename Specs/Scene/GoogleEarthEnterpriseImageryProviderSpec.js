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

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthEnterpriseImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new GoogleEarthEnterpriseImageryProvider({
            });
        }
        expect(constructWithoutServer).toThrowDeveloperError();
    });

    function installMockGetQuadTreePacket() {
        spyOn(GoogleEarthEnterpriseMetadata.prototype, '_getQuadTreePacket').and.callFake(function(quadKey, version) {
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

        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var url = 'host.invalid';
        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return provider.readyPromise.then(function () {
            fail('should not resolve');
        }).otherwise(function (e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain(url);
        });
    });

    it('returns false for hasAlphaChannel', function() {
        installMockGetQuadTreePacket();
        var url = 'http://fake.fake.invalid';

        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
            expect(provider.hasAlphaChannel).toBe(false);
        });
    });

    it('can provide a root tile', function() {
        installMockGetQuadTreePacket();
        var url = 'http://fake.fake.invalid/';

        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        expect(provider.url).toEqual(url);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(23);
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            // Defaults to custom tile policy
            expect(provider.tileDiscardPolicy).not.toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI));
            expect(provider.credit).toBeUndefined();

            installFakeImageRequest('http://fake.fake.invalid/flatfile?f1-03-i.1');

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        installMockGetQuadTreePacket();
        var url = 'http://foo.bar.invalid/';

        var proxy = new DefaultProxy('/proxy/');

        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url,
            proxy : proxy
        });

        expect(provider.url).toEqual(url);
        expect(provider.proxy).toEqual(proxy);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            installFakeImageRequest(proxy.getURL('http://foo.bar.invalid/flatfile?f1-03-i.1'));

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error on invalid url', function() {
        installMockGetQuadTreePacket();
        var url = 'host.invalid';
        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message).toContain(url);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return provider.ready || errorEventRaised;
        }).then(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        installMockGetQuadTreePacket();
        //installFakeImageRequest();
        var url = 'http://foo.bar.invalid';

        var provider = new GoogleEarthEnterpriseImageryProvider({
            url : url
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

        loadImage.createImage = function(url, crossOrigin, deferred) {
            if (/^blob:/.test(url)) {
                // load blob url normally
                loadImage.defaultCreateImage(url, crossOrigin, deferred);
            } else if (tries === 2) {
                // Succeed after 2 tries
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

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
            return provider.ready;
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
