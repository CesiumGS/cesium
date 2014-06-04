/*global defineSuite*/
defineSuite([
        'Scene/QuadtreeTile',
        'Core/GeographicTilingScheme',
        'Core/Math',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme'
    ], function(
        QuadtreeTile,
        GeographicTilingScheme,
        CesiumMath,
        Rectangle,
        WebMercatorTilingScheme) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/


    it('throws without a options', function() {
        expect(function() {
            return new QuadtreeTile();
        }).toThrowDeveloperError();
    });

    it('throws without options.rectangle', function() {
        expect(function() {
            return new QuadtreeTile({
                x : 0,
                y : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws without options.level', function() {
        expect(function() {
            return new QuadtreeTile({
                rectangle : new Rectangle(
                    -CesiumMath.PI_OVER_FOUR,
                    0.0,
                    CesiumMath.PI_OVER_FOUR,
                    CesiumMath.PI_OVER_FOUR
                ),
                x : 0,
                y : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws with negative x or y properties', function() {
        expect(function() {
            return new QuadtreeTile({
                x : -1.0,
                y : -1.0,
                level : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('creates rectangle on construction', function() {
        var desc = {tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0};
        var tile = new QuadtreeTile(desc);
        var rectangle = desc.tilingScheme.tileXYToRectangle(desc.x, desc.y, desc.level);
        expect(tile.rectangle).toEqual(rectangle);
    });

    it('throws if constructed improperly', function() {
        expect(function() {
            return new QuadtreeTile();
        }).toThrowDeveloperError();

        expect(function() {
            return new QuadtreeTile({
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new QuadtreeTile({
                x : 0,
                level : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new QuadtreeTile({
                x : 0,
                y : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new QuadtreeTile({
                x : 0,
                y : 0,
                level : 0
            });
        }).toThrowDeveloperError();
    });

    describe('createLevelZeroTiles', function() {
        var tilingScheme1x1;
        var tilingScheme2x2;
        var tilingScheme2x1;
        var tilingScheme1x2;

        beforeEach(function() {
            tilingScheme1x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme2x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 2
            });
            tilingScheme2x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme1x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 2
            });
        });

        it('requires tilingScheme', function() {
            expect(function() {
                return QuadtreeTile.createLevelZeroTiles(undefined);
            }).toThrowDeveloperError();
        });

        it('creates expected number of tiles', function() {
            var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme1x1);
            expect(tiles.length).toBe(1);

            tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
            expect(tiles.length).toBe(4);

            tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x1);
            expect(tiles.length).toBe(2);

            tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme1x2);
            expect(tiles.length).toBe(2);
        });

        it('created tiles are associated with specified tiling scheme', function() {
            var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
            for (var i = 0; i < tiles.length; ++i) {
                expect(tiles[i].tilingScheme).toBe(tilingScheme2x2);
            }
        });

        it('created tiles are ordered from the northwest and proceeding east and then south', function() {
            var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
            var northwest = tiles[0];
            var northeast = tiles[1];
            var southwest = tiles[2];
            var southeast = tiles[3];

            expect(northeast.rectangle.west).toBeGreaterThan(northwest.rectangle.west);
            expect(southeast.rectangle.west).toBeGreaterThan(southwest.rectangle.west);
            expect(northeast.rectangle.south).toBeGreaterThan(southeast.rectangle.south);
            expect(northwest.rectangle.south).toBeGreaterThan(southwest.rectangle.south);
        });
    });
});
