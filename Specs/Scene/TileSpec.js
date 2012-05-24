/*global defineSuite*/
defineSuite([
         'Scene/Tile',
         'Core/Math'
     ], function(
         Tile,
         CesiumMath) {
    "use strict";
    /*global document,it,expect*/


    it("throws without a description", function() {
        expect(function() {
            return new Tile();
        }).toThrow();
    });

    it("throws without description.extent", function() {
        expect(function() {
            return new Tile({
                x : 0,
                y : 0
            });
        }).toThrow();
    });

    it("throws without description.zoom", function() {
        expect(function() {
            return new Tile({
                extent : {
                    north : CesiumMath.PI_OVER_FOUR,
                    south : 0.0,
                    east : CesiumMath.PI_OVER_FOUR,
                    west : -CesiumMath.PI_OVER_FOUR
                },
                x : 0,
                y : 0
            });
        }).toThrow();
    });

    it("throws with negative x or y properties", function() {
        expect(function() {
            return new Tile({
                x : -1.0,
                y : -1.0,
                zoom : 1.0
            });
        }).toThrow();
    });

    it("creates extent on construction", function() {
        var desc = {x : 0, y : 0, zoom : 0};
        var tile = new Tile(desc);
        var extent = Tile.tileXYToExtent(desc.x, desc.y, desc.zoom);
        expect(tile.extent).toEqual(extent);
    });

    it("creates x, y, zoom on construction", function() {
        var desc = {
            extent : {
                north : CesiumMath.toRadians(85.05112878),
                south : CesiumMath.toRadians(-85.05112878),
                west : -CesiumMath.PI,
                east : CesiumMath.PI
            },
            zoom : 0
        };
        var tile = new Tile(desc);
        var coords = Tile.extentToTileXY(desc.extent, desc.zoom);
        expect(tile.x).toEqual(coords.x);
        expect(tile.y).toEqual(coords.y);
    });
});
