/*global defineSuite*/
defineSuite([
         'Core/BoxOutlineGeometry',
         'Core/Cartesian3'
     ], function(
         BoxOutlineGeometry,
         Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws without minimum corner', function() {
        expect(function() {
            return new BoxOutlineGeometry({
                maximumCorner : new Cartesian3()
            });
        }).toThrow();
    });

    it('constructor throws without maximum corner', function() {
        expect(function() {
            return new BoxOutlineGeometry({
                minimumCorner : new Cartesian3()
            });
        }).toThrow();
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
        }).toThrow();
    });

    it('fromDimensions throws with negative dimensions', function() {
        expect(function() {
            return BoxOutlineGeometry.fromDimensions({
                dimensions : new Cartesian3(1, 2, -1)
            });
        }).toThrow();
    });

    it('fromDimensions', function() {
        var m = BoxOutlineGeometry.createGeometry(BoxOutlineGeometry.fromDimensions({
            dimensions : new Cartesian3(1, 2, 3)
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(12 * 2);
    });
});