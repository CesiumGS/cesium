/*global defineSuite*/
defineSuite([
         'Core/WallGeometry',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/VertexFormat'
     ], function(
         WallGeometry,
         Cartographic,
         Ellipsoid,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsoid = Ellipsoid.WGS84;

    it('throws with no positions', function() {
        expect(function() {
            return new WallGeometry({
            });
        }).toThrow();
    });

    it('throws when length of positions and terrain points are not equal', function() {
        expect(function() {
            return new WallGeometry({
                positions : new Array(3),
                terrain : new Array(2)
            });
        }).toThrow();
    });

    it('creates positions relative to ellipsoid', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexList.length).toEqual(2 * 3);
    });

    it('creates positions relative to terrain', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var terrain = [
            Cartographic.fromDegrees(49.0, 18.0, 100.0),
            Cartographic.fromDegrees(50.0, 18.0, 110.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords),
            terrain      : terrain
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexList.length).toEqual(2 * 3);
    });

    it('creates all attributes', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0),
            Cartographic.fromDegrees(51.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.ALL,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
        });

        expect(w.attributes.position.values.length).toEqual(3 * 2 * 3);
        expect(w.attributes.normal.values.length).toEqual(3 * 2 * 3);
        expect(w.attributes.tangent.values.length).toEqual(3 * 2 * 3);
        expect(w.attributes.binormal.values.length).toEqual(3 * 2 * 3);
        expect(w.attributes.st.values.length).toEqual(3 * 2 * 2);
        expect(w.indexList.length).toEqual((3 * 2 - 2) * 3);
    });
});

