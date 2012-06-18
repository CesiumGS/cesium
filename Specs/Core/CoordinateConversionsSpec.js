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

    var fortyFiveDegrees = Math.PI / 4.0;
    var sixtyDegrees = Math.PI / 3.0;
    var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
    var spherical = new Spherical(sixtyDegrees, fortyFiveDegrees + Math.PI / 2.0, Math.sqrt(8.0));

    it('Can convert Spherical to a new Cartesian3 instance', function() {
        expect(cartesian).toEqualEpsilon(CoordinateConversions.sphericalToCartesian3(spherical), CesiumMath.EPSILON15);
    });

    it('Can convert Cartesian3 to a new spherical instance', function() {
        expect(spherical).toEqualEpsilon(CoordinateConversions.cartesian3ToSpherical(cartesian), CesiumMath.EPSILON15);
    });

    it('Can convert Spherical to an existing Cartesian3 instance', function() {
        var existing = new Cartesian3();
        expect(cartesian).toEqualEpsilon(CoordinateConversions.sphericalToCartesian3(spherical, existing), CesiumMath.EPSILON15);
        expect(cartesian).toEqualEpsilon(existing, CesiumMath.EPSILON15);
    });

    it('Can convert Cartesian3 to an existing spherical instance', function() {
        var existing = new Spherical();
        expect(spherical).toEqualEpsilon(CoordinateConversions.cartesian3ToSpherical(cartesian, existing), CesiumMath.EPSILON15);
        expect(spherical).toEqualEpsilon(existing, CesiumMath.EPSILON15);
    });
});