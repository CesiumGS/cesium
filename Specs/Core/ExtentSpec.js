/*global defineSuite*/
defineSuite([
         'Core/Extent',
         'Core/Math'
     ], function(
         Extent,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it("constructor checks for a valid extent.", function() {
        expect(function() {
            return new Extent();
        }).toThrow();
    });

    it("compute throws exception with invalid extent 0", function() {
        expect(function() {
            Extent.validate();
        }).toThrow();
    });

    it("compute throws exception with invalid extent 1", function() {
        expect(function() {
            Extent.validate({
                north : CesiumMath.PI_OVER_TWO + 1,
                south : -CesiumMath.PI_OVER_TWO,
                west : -CesiumMath.PI,
                east : CesiumMath.PI
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 2", function() {
        expect(function() {
            Extent.validate({
                north : CesiumMath.PI_OVER_TWO,
                south : -CesiumMath.PI_OVER_TWO - 1,
                west : -CesiumMath.PI,
                east : CesiumMath.PI
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 3", function() {
        expect(function() {
            Extent.validate({
                north : CesiumMath.PI_OVER_TWO,
                south : -CesiumMath.PI_OVER_TWO,
                west : -CesiumMath.PI - 1,
                east : CesiumMath.PI
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 4", function() {
        expect(function() {
            Extent.validate({
                north : CesiumMath.PI_OVER_TWO,
                south : -CesiumMath.PI_OVER_TWO,
                west : -CesiumMath.PI,
                east : CesiumMath.PI + 1
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 5", function() {
        expect(function() {
            Extent.validate({
                south : CesiumMath.PI_OVER_TWO,
                north : -CesiumMath.PI_OVER_TWO,
                west : -CesiumMath.PI,
                east : CesiumMath.PI
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 6", function() {
        expect(function() {
            Extent.validate({
                north : CesiumMath.PI_OVER_TWO,
                south : -CesiumMath.PI_OVER_TWO,
                east : -CesiumMath.PI,
                west : CesiumMath.PI
            });
        }).toThrow();
    });

});