/*global defineSuite*/
defineSuite([
         'Core/Extent',
         'Core/Math'
     ], function(
         Extent,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('constructor checks for a valid extent.', function() {
        expect(function() {
            return new Extent();
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 1', function() {
        expect(function() {
            return new Extent(
                    -CesiumMath.PI - 1,
                    -CesiumMath.PI_OVER_TWO,
                    CesiumMath.PI,
                    CesiumMath.PI_OVER_TWO
            );
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 2', function() {
        expect(function() {
            return new Extent(
                    -CesiumMath.PI,
                    -CesiumMath.PI_OVER_TWO - 1,
                    CesiumMath.PI,
                    CesiumMath.PI_OVER_TWO
            );
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 3', function() {
        expect(function() {
            return new Extent(
                    -CesiumMath.PI,
                    -CesiumMath.PI_OVER_TWO,
                    CesiumMath.PI + 1,
                    CesiumMath.PI_OVER_TWO
            );
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 4', function() {
        expect(function() {
            return new Extent(
                    -CesiumMath.PI,
                    -CesiumMath.PI_OVER_TWO,
                    CesiumMath.PI,
                    CesiumMath.PI_OVER_TWO + 1
            );
        }).toThrow();
    });

    it('validate throws exception with undefined extent', function() {
        expect(function() {
            Extent.validate();
        }).toThrow();
    });

});