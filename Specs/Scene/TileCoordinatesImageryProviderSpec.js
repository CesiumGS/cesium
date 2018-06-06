defineSuite([
        'Scene/TileCoordinatesImageryProvider',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/WebMercatorTilingScheme',
        'Scene/ImageryProvider',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        TileCoordinatesImageryProvider,
        Ellipsoid,
        GeographicTilingScheme,
        WebMercatorTilingScheme,
        ImageryProvider,
        pollToPromise,
        when) {
    'use strict';

    it('conforms to ImageryProvider interface', function() {
        expect(TileCoordinatesImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('resolves readyPromise', function() {
        var provider = new TileCoordinatesImageryProvider();

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new TileCoordinatesImageryProvider();

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can use a custom ellipsoid', function() {
        var ellipsoid = new Ellipsoid(1, 2, 3);
        var provider = new TileCoordinatesImageryProvider({
            ellipsoid : ellipsoid
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
        });
    });

    it('can provide a root tile', function() {
        var provider = new TileCoordinatesImageryProvider();

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tileDiscardPolicy).toBeUndefined();
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            return when(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeDefined();
            });
        });
    });

    it('uses alternate tiling scheme if provided', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new TileCoordinatesImageryProvider({
            tilingScheme : tilingScheme
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBe(tilingScheme);
        });
    });

    it('uses tile width and height if provided', function() {
        var provider = new TileCoordinatesImageryProvider({
            tileWidth : 123,
            tileHeight : 456
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(123);
            expect(provider.tileHeight).toEqual(456);
        });
    });
});
