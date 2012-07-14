/*global defineSuite*/
defineSuite([
         'Core/Plane',
         'Core/Cartesian3'
     ], function(
         Plane,
         Cartesian3) {
    "use strict";
    /*global it,expect*/

    it('constructs', function() {
        var normal = Cartesian3.UNIT_X;
        var distance = 1.0;
        var plane = new Plane(normal, distance);
        expect(plane.normal.equals(normal)).toEqual(true);
        expect(plane.distance).toEqual(distance);
    });

    it('constructor throws without a normal', function() {
        expect(function() {
            return new Plane();
        }).toThrow();
    });

    it('constructor throws without a distance', function() {
        expect(function() {
            return new Plane(Cartesian3.UNIT_X);
        });
    });
});