/*global defineSuite*/
defineSuite([
         'Core/CoordinateConversions',
         'Core/Spherical',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         CoordinateConversions,
         Spherical,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('Can convert Spherical to a new Cartesian3 instance', function() {
        var fortyFiveDegrees = Math.PI / 4.0;
        var sixtyDegrees = Math.PI / 3.0;
        var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
        var spherical = new Spherical(sixtyDegrees, fortyFiveDegrees + Math.PI / 2.0, Math.sqrt(8.0));
        expect(cartesian).toEqualEpsilon(CoordinateConversions.sphericalToCartesian3(spherical), CesiumMath.EPSILON15);
    });

    it('Can convert Cartesian3 to a new spherical instance', function() {
        var fortyFiveDegrees = Math.PI / 4.0;
        var sixtyDegrees = Math.PI / 3.0;
        var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
        var spherical = new Spherical(sixtyDegrees, fortyFiveDegrees + Math.PI / 2.0, Math.sqrt(8.0));
        expect(spherical).toEqualEpsilon(CoordinateConversions.cartesian3ToSpherical(cartesian), CesiumMath.EPSILON15);
    });
});