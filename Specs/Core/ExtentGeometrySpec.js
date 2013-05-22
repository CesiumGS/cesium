/*global defineSuite*/
defineSuite([
         'Core/ExtentGeometry',
         'Core/Extent',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         ExtentGeometry,
         Extent,
         Ellipsoid,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('compute 0', function() {
        var m = ExtentGeometry.compute({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(typeof m.attributes.textureCoordinates === 'undefined').toEqual(true);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it('compute 1', function() {
        var m = ExtentGeometry.compute({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            generateTextureCoordinates : true
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(m.attributes.textureCoordinates.values.length).toEqual(9 * 2);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it('compute returns undefined if rotation makes extent invalid', function() {
        expect(typeof ExtentGeometry.compute({
            extent : new Extent(-CesiumMath.PI, -1.0, 0.0, 1.0),
            rotation: CesiumMath.PI_OVER_TWO,
            granularity : 1.0,
            generateTextureCoordinates : true
        }) === 'undefined').toEqual(true);
    });

    it('compute vertices', function() {
        var extent = new Extent(-CesiumMath.PI, -CesiumMath.PI_OVER_TWO, CesiumMath.PI, CesiumMath.PI_OVER_TWO);
        var description = {
                extent: extent,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        var length = description.vertices.length;
        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        var expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast());
        expect(new Cartesian3(description.vertices[0], description.vertices[1], description.vertices[2])).toEqual(expectedNWCorner);
        expect(new Cartesian3(description.vertices[length-3], description.vertices[length-2], description.vertices[length-1])).toEqual(expectedSECorner);
    });

    it('compute vertices with rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var description = {
                extent: extent,
                rotation: CesiumMath.PI_OVER_TWO,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        var length = description.vertices.length;
        expect(length).toEqual(9 * 3);
        expect(description.indices.length).toEqual(8 * 3);
        var unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        var unrotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast());
        expect(new Cartesian3(description.vertices[0], description.vertices[1], description.vertices[2])).not.toEqual(unrotatedNWCorner);
        expect(new Cartesian3(description.vertices[length-3], description.vertices[length-2], description.vertices[length-1])).not.toEqual(unrotatedSECorner);
    });

    it('compute vertices with PI rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var description = {
                extent: extent,
                rotation: CesiumMath.PI,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        var length = description.vertices.length;
        expect(length).toEqual(9 * 3);
        expect(description.indices.length).toEqual(8 * 3);
        var unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        var unrotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast());
        expect(new Cartesian3(description.vertices[0], description.vertices[1], description.vertices[2])).toEqualEpsilon(unrotatedSECorner, CesiumMath.EPSILON8);
        expect(new Cartesian3(description.vertices[length-3], description.vertices[length-2], description.vertices[length-1])).toEqualEpsilon(unrotatedNWCorner, CesiumMath.EPSILON8);
    });

    it('compute vertices has empty indices and vertices if rotated extent crosses north pole (NE Corner)', function() {
        var extent = new Extent(-CesiumMath.PI_OVER_TWO, 1, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO);
        var description = {
                extent: extent,
                rotation: CesiumMath.PI_OVER_TWO,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        expect(description.vertices.length).toEqual(0);
        expect(description.indices.length).toEqual(0);
    });

    it('compute vertices has empty indices and vertices if rotated extent crosses south pole (NW Corner)', function() {
        var extent = new Extent(-CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -1);
        var description = {
                extent : new Extent(-CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -1),
                rotation: CesiumMath.PI_OVER_TWO,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        expect(description.vertices.length).toEqual(0);
        expect(description.indices.length).toEqual(0);
    });

    it('compute vertices has empty indices and vertices if rotated extent crosses IDL (SW Corner)', function() {
        var extent = new Extent(-CesiumMath.PI, 0, -3, 0.3);
        var description = {
                extent: extent,
                rotation: -CesiumMath.PI_OVER_TWO,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        expect(description.vertices.length).toEqual(0);
        expect(description.indices.length).toEqual(0);
    });

    it('compute vertices has empty indices and vertices if rotated extent crosses IDL (SE Corner)', function() {
        var extent = new Extent(3, 0, CesiumMath.PI, 0.3);
        var description = {
                extent: extent,
                rotation: 0.1,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentGeometry.computeVertices(description);
        expect(description.vertices.length).toEqual(0);
        expect(description.indices.length).toEqual(0);
    });

});
