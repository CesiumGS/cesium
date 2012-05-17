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
});
