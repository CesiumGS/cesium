/*global defineSuite*/
defineSuite([
        'Scene/GridImageryProvider',
        'Core/GeographicTilingScheme',
        'Core/WebMercatorTilingScheme',
        'Scene/ImageryProvider',
        'Specs/waitsForPromise'
    ], function(
        GridImageryProvider,
        GeographicTilingScheme,
        WebMercatorTilingScheme,
        ImageryProvider,
        waitsForPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('conforms to ImageryProvider interface', function() {
        expect(GridImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new GridImageryProvider();

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can provide a root tile', function() {
        var provider = new GridImageryProvider();

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tileDiscardPolicy).toBeUndefined();
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeDefined();
            });
        });
    });

    it('uses alternate tiling scheme if provided', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new GridImageryProvider({
            tilingScheme : tilingScheme
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tilingScheme).toBe(tilingScheme);
        });
    });

    it('uses tile width and height if provided', function() {
        var provider = new GridImageryProvider({
            tileWidth : 123,
            tileHeight : 456
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tileWidth).toEqual(123);
            expect(provider.tileHeight).toEqual(456);
        });
    });
});
