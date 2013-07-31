/*global defineSuite*/
defineSuite([
         'Core/BoxGeometryOutline',
         'Core/VertexFormat',
         'Core/Cartesian3'
     ], function(
         BoxGeometryOutline,
         VertexFormat,
         Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws without minimum corner', function() {
        expect(function() {
            return new BoxGeometryOutline({
                maximumCorner : new Cartesian3()
            });
        }).toThrow();
    });

    it('constructor throws without maximum corner', function() {
        expect(function() {
            return new BoxGeometryOutline({
                minimumCorner : new Cartesian3()
            });
        }).toThrow();
    });

    it('constructor creates optimized number of positions for VertexFormat.POSITIONS_ONLY', function() {
        var m = new BoxGeometryOutline({
            minimumCorner : new Cartesian3(-1, -2, -3),
            maximumCorner : new Cartesian3(1, 2, 3)
        });

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(12 * 2);
    });

    it('fromDimensions throws without dimensions', function() {
        expect(function() {
            return BoxGeometryOutline.fromDimensions();
        }).toThrow();
    });

    it('fromDimensions throws with negative dimensions', function() {
        expect(function() {
            return BoxGeometryOutline.fromDimensions({
                dimensions : new Cartesian3(1, 2, -1)
            });
        }).toThrow();
    });

    it('fromDimensions', function() {
        var m = BoxGeometryOutline.fromDimensions({
            dimensions : new Cartesian3(1, 2, 3)
        });

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(12 * 2);
    });
});