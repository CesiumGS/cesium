defineSuite([
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('clone', function() {
        var vertexFormat = new VertexFormat({
            position : true,
            normal : true
        });
        var cloned = VertexFormat.clone(vertexFormat);
        expect(cloned instanceof VertexFormat).toBe(true);
        expect(cloned).toEqual(vertexFormat);
    });

    it('clone uses result parameter if provided', function() {
        var vertexFormat = new VertexFormat({
            position : true,
            normal : true
        });
        var result = new VertexFormat();
        var cloned = VertexFormat.clone(vertexFormat, result);
        expect(cloned).toBe(result);
        expect(cloned).toEqual(vertexFormat);
    });

    createPackableSpecs(VertexFormat, VertexFormat.POSITION_AND_NORMAL, [1.0, 1.0, 0.0, 0.0, 0.0, 0.0]);
});
