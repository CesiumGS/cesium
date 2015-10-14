/*global defineSuite*/
defineSuite([
        'Core/BoxOutlineGeometry',
        'Core/AxisAlignedBoundingBox',
        'Core/Cartesian3',
        'Specs/createPackableSpecs'
    ], function(
        BoxOutlineGeometry,
        AxisAlignedBoundingBox,
        Cartesian3,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor throws without minimum corner', function() {
        expect(function() {
            return new BoxOutlineGeometry({
                maximumCorner : new Cartesian3()
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws without maximum corner', function() {
        expect(function() {
            return new BoxOutlineGeometry({
                minimumCorner : new Cartesian3()
            });
        }).toThrowDeveloperError();
    });

    it('constructor creates positions', function() {
        var m = BoxOutlineGeometry.createGeometry(new BoxOutlineGeometry({
            minimumCorner : new Cartesian3(-1, -2, -3),
            maximumCorner : new Cartesian3(1, 2, 3)
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(12 * 2);
    });

    it('fromDimensions throws without dimensions', function() {
        expect(function() {
            return BoxOutlineGeometry.fromDimensions();
        }).toThrowDeveloperError();
    });

    it('fromDimensions throws with negative dimensions', function() {
        expect(function() {
            return BoxOutlineGeometry.fromDimensions({
                dimensions : new Cartesian3(1, 2, -1)
            });
        }).toThrowDeveloperError();
    });

    it('fromDimensions', function() {
        var m = BoxOutlineGeometry.createGeometry(BoxOutlineGeometry.fromDimensions({
            dimensions : new Cartesian3(1, 2, 3)
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(12 * 2);
    });

    it('fromAxisAlignedBoundingBox throws with no boundingBox', function() {
       expect(function() {
           return BoxOutlineGeometry.fromAxisAlignedBoundingBox(undefined);
       }).toThrowDeveloperError();
    });

    it('fromAxisAlignedBoundingBox', function() {
        var min = new Cartesian3(-1, -2, -3);
        var max = new Cartesian3(1, 2, 3);
        var m = BoxOutlineGeometry.fromAxisAlignedBoundingBox(new AxisAlignedBoundingBox(min, max));
        expect(m._min).toEqual(min);
        expect(m._max).toEqual(max);
    });

    createPackableSpecs(BoxOutlineGeometry, new BoxOutlineGeometry({
        minimumCorner : new Cartesian3(1.0, 2.0, 3.0),
        maximumCorner : new Cartesian3(4.0, 5.0, 6.0)
    }), [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
});