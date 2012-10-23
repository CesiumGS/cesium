/*global defineSuite*/
defineSuite([
         'Scene/Tile',
         'Core/Extent',
         'Core/Math',
         'Scene/WebMercatorTilingScheme'
     ], function(
         Tile,
         Extent,
         CesiumMath,
         WebMercatorTilingScheme) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/


    it('throws without a description', function() {
        expect(function() {
            return new Tile();
        }).toThrow();
    });

    it('throws without description.extent', function() {
        expect(function() {
            return new Tile({
                x : 0,
                y : 0
            });
        }).toThrow();
    });

    it('throws without description.level', function() {
        expect(function() {
            return new Tile({
                extent : new Extent(
                    -CesiumMath.PI_OVER_FOUR,
                    0.0,
                    CesiumMath.PI_OVER_FOUR,
                    CesiumMath.PI_OVER_FOUR
                ),
                x : 0,
                y : 0
            });
        }).toThrow();
    });

    it('throws with negative x or y properties', function() {
        expect(function() {
            return new Tile({
                x : -1.0,
                y : -1.0,
                level : 1.0
            });
        }).toThrow();
    });

    it('creates extent on construction', function() {
        var desc = {tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0};
        var tile = new Tile(desc);
        var extent = desc.tilingScheme.tileXYToExtent(desc.x, desc.y, desc.level);
        expect(tile.extent).toEqual(extent);
    });

    it('destroys transientData property if it has a destroy function', function() {
        var isDestroyed = false;
        var data = {
                destroy : function() {
                    isDestroyed = true;
                }
        };

        var tile = new Tile({
            x : 0,
            y : 0,
            level : 0,
            tilingScheme : {
                tileXYToExtent : function() {
                    return undefined;
                }
            }
        });

        tile.transientData = data;

        tile.freeResources();

        expect(isDestroyed).toEqual(true);
    });

    it('throws if constructed improperly', function() {
        expect(function() {
            return new Tile();
        }).toThrow();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
                        return undefined;
                    }
                }
            });
        }).not.toThrow();

        expect(function() {
            return new Tile({
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
                        return undefined;
                    }
                }
            });
        }).toThrow();

        expect(function() {
            return new Tile({
                x : 0,
                level : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
                        return undefined;
                    }
                }
            });
        }).toThrow();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
                        return undefined;
                    }
                }
            });
        }).toThrow();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                level : 0
            });
        }).toThrow();
    });
});
