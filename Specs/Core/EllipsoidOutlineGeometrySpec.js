/*global defineSuite*/
defineSuite([
        'Core/EllipsoidOutlineGeometry'
    ], function(
        EllipsoidOutlineGeometry) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws if stackPartitions less than 1', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                stackPartitions: 0
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if slicePartitions less than 0', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                slicePartitions: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if subdivisions less than 0', function() {
        expect(function() {
            return new EllipsoidOutlineGeometry({
                subdivisions: -2
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = EllipsoidOutlineGeometry.createGeometry(new EllipsoidOutlineGeometry({
            stackPartitions : 3,
            slicePartitions: 3,
            subdivisions: 3
        }));

        expect(m.attributes.position.values.length).toEqual(14 * 3);
        expect(m.indices.length).toEqual(15 * 2);
        expect(m.boundingSphere.radius).toEqual(1);
    });
});