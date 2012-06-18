/*global defineSuite*/
defineSuite([
         'Core/Spherical',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         Spherical,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('Default constructing sets properties to their expected values.', function() {
        var v = new Spherical();
        expect(v.clock).toEqual(0);
        expect(v.cone).toEqual(0);
        expect(v.magnitude).toEqual(1.0);
    });

    it('Construtor parameters are assigned to the appropriate properties', function() {
        var v = new Spherical(1, 2, 3);
        expect(v.clock).toEqual(1);
        expect(v.cone).toEqual(2);
        expect(v.magnitude).toEqual(3);
    });

    it('Cloning copies all properties', function() {
        var v = new Spherical(1, 2, 3);
        var w = v.clone();
        expect(v.equals(w)).toEqual(true);
    });

    it('Normalizing sets magntitude to 1.0', function() {
        var v = new Spherical(0, 2, 3).normalize();
        expect(v.clock).toEqual(0);
        expect(v.cone).toEqual(2);
        expect(v.magnitude).toEqual(1);
    });

    it('equalsEpsilon returns true for expected values.', function() {
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 1), 0)).toEqual(true);
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 2), 1)).toEqual(true);
    });

    it('equalsEpsilon returns false for expected values.', function() {
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 3), 1)).toEqual(false);
    });

    it('toString returns the expected format.', function() {
        var v = new Spherical(1, 2, 3);
        expect(v.toString()).toEqual('(1, 2, 3)');
    });
});