/*global defineSuite*/
defineSuite([
         'Core/SimplePolylineGeometry',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Core/PrimitiveType'
     ], function(
         SimplePolylineGeometry,
         Cartesian3,
         BoundingSphere,
         PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with no positions', function() {
        expect(function() {
            return new SimplePolylineGeometry();
        }).toThrow();
    });

    it('constructor throws with less than two positions', function() {
        expect(function() {
            return new SimplePolylineGeometry({
                positions : [Cartesian3.ZERO]
            });
        }).toThrow();
    });

    it('constructor computes all vertex attributes', function() {
        var positions = [new Cartesian3(), new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(2.0, 0.0, 0.0)];
        var line = new SimplePolylineGeometry({
            positions : positions
        });

        expect(line.attributes.position.values).toEqual([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0]);
        expect(line.indices).toEqual([0, 1, 1, 2]);
        expect(line.primitiveType).toEqual(PrimitiveType.LINES);
        expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
    });
});