/*global defineSuite*/
defineSuite([
         'Core/ExtentTessellator',
         'Core/Extent',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         ExtentTessellator,
         Extent,
         Ellipsoid,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('compute 0', function() {
        var m = ExtentTessellator.compute({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(typeof m.attributes.textureCoordinates === 'undefined').toEqual(true);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it('compute 1', function() {
        var m = ExtentTessellator.compute({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            generateTextureCoordinates : true
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(m.attributes.textureCoordinates.values.length).toEqual(9 * 2);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it('computeBuffers 0', function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0
        });

        expect(buffers.positions.length).toEqual(9 * 3);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it('computeBuffers 1', function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            generateTextureCoordinates : true
        });

        expect(buffers.positions.length).toEqual(9 * 3);
        expect(buffers.textureCoordinates.length).toEqual(9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it('computeBuffers 2', function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            generateTextureCoordinates : true,
            interleaveTextureCoordinates : true
        });

        expect(buffers.vertices.length).toEqual(9 * 3 + 9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it('compute vertices', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var description = {
                extent: extent,
                granularity: 1.0,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentTessellator.computeVertices(description);
        expect(description.vertices.length).toEqual(9 * 3);
        expect(description.indices.length).toEqual(8 * 3);
        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        expect(new Cartesian3(description.vertices[0], description.vertices[1], description.vertices[2])).toEqual(expectedNWCorner);
    });

    it('compute vertices with rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var description = {
                extent: extent,
                granularity: 1.0,
                rotation: CesiumMath.PI_OVER_TWO,
                width: Math.ceil(extent.east - extent.west) + 1,
                height: Math.ceil(extent.north - extent.south) + 1,
                radiiSquared: Ellipsoid.WGS84.getRadiiSquared(),
                relativeToCenter: Cartesian3.ZERO,
                surfaceHeight: 0,
                vertices: [],
                indices: []
        };
        ExtentTessellator.computeVertices(description);
        expect(description.vertices.length).toEqual(9 * 3);
        expect(description.indices.length).toEqual(8 * 3);
        var unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        expect(new Cartesian3(description.vertices[0], description.vertices[1], description.vertices[2])).not.toEqual(unrotatedNWCorner);
    });
});
