/*global defineSuite*/
defineSuite([
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         BoundingSphere,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    function getPositions() {
        return [
                new Cartesian3(0, 0, 0),
                new Cartesian3(1, 0, 0),
                new Cartesian3(-1, 0, 0),
                new Cartesian3(0, 1, 0),
                new Cartesian3(0, -1, 0),
                new Cartesian3(0, 0, 1),
                new Cartesian3(0, 0, -1)
            ];
    }

    it('throws an exception when constructed without any positions', function() {
        expect(function() {
            return new BoundingSphere();
        }).toThrow();
    });

    it('can be constructed using a point and a radius', function() {
        var sphere = new BoundingSphere(new Cartesian3(0, 0, 0), 1);
        expect(sphere.center.equals(Cartesian3.ZERO)).toEqual(true);
        expect(sphere.radius).toEqual(1);
    });

    it('has a center', function() {
        var sphere = new BoundingSphere(getPositions());
        var center = sphere.center;
        expect(center.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)).toEqual(true);
    });

    it('has a radius', function() {
        var sphere = new BoundingSphere(getPositions());
        var radius = sphere.radius;
        expect(radius).toEqual(1);
    });

    it('contains all points (naive)', function() {
        var sphere = new BoundingSphere(getPositions());
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = r.add(center);
        var min = center.subtract(r);

        var positions = getPositions();
        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('contains all points (ritter)', function() {
        var positions = getPositions();
        positions.push(new Cartesian3(1, 1, 1), new Cartesian3(2, 2, 2), new Cartesian3(3, 3, 3));
        var sphere = new BoundingSphere(positions);
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = r.add(center);
        var min = center.subtract(r);

        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });
});