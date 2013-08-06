/*global defineSuite*/
defineSuite([
         'Core/EllipsoidOutlineGeometry',
         'Core/Cartesian3',
         'Core/Math',
         'Core/VertexFormat'
     ], function(
         EllipsoidOutlineGeometry,
         Cartesian3,
         CesiumMath,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws if stackPartitions less than 1', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                stackPartitions: 0
            });
        }).toThrow();
    });

    it('constructor throws if slicePartitions less than 0', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                slicePartitions: -1
            });
        }).toThrow();
    });

    it('constructor throws if subdivisions less than 0', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                subdivisions: -2
            });
        }).toThrow();
    });

    it('computes positions', function() {
        var m = new EllipsoidOutlineGeometry({
            stackPartitions : 2,
            slicePartitions: 2,
            subdivisions: 2
        });

        expect(m.attributes.position.values.length).toEqual(6 * 3);
        expect(m.indices.length).toEqual(6 * 2);
        expect(m.boundingSphere.radius).toEqual(1);
    });
});