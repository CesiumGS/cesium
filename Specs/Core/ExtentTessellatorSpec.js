/*global defineSuite*/
defineSuite([
         'Core/ExtentTessellator',
         'Core/Extent',
         'Core/Math'
     ], function(
         ExtentTessellator,
         Extent,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

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
            generateTextureCoords : true
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
            generateTextureCoords : true
        });

        expect(buffers.positions.length).toEqual(9 * 3);
        expect(buffers.textureCoords.length).toEqual(9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it('computeBuffers 2', function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            generateTextureCoords : true,
            interleave : true
        });

        expect(buffers.vertices.length).toEqual(9 * 3 + 9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });
});
