/*global defineSuite*/
defineSuite([
         'Core/BoxGeometry',
         'Core/VertexFormat',
         'Core/Cartesian3'
     ], function(
         BoxGeometry,
         VertexFormat,
         Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('compute0', function() {
        expect(function() {
            return new BoxGeometry({
                dimensions : new Cartesian3(1, 2, -1)
            });
        }).toThrow();
    });

    it('compute1', function() {
        var m = new BoxGeometry({
            dimensions : new Cartesian3(1, 2, 3),
            vertexFormat : VertexFormat.POSITION_ONLY
        });

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indexLists[0].values.length).toEqual(12 * 3);
    });

    it('compute2', function() {
        expect(function() {
            return new BoxGeometry({
                minimumCorner : new Cartesian3(0, 0, 0),
                maximumCorner : new Cartesian3(1, 1, 1)
            });
        }).not.toThrow();
    });
});