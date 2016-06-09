/*global defineSuite*/
defineSuite([
        'Scene/createTangentSpaceDebugPrimitive',
        'Core/Cartesian3',
        'Core/EllipsoidGeometry',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Core/VertexFormat'
    ], function(
        createTangentSpaceDebugPrimitive,
        Cartesian3,
        EllipsoidGeometry,
        Matrix4,
        PrimitiveType,
        VertexFormat) {
    'use strict';


    it('computes all attributes', function() {
        var geometry = new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            radii : new Cartesian3(500000.0, 500000.0, 1000000.0)
        });
        var modelMatrix = Matrix4.multiplyByTranslation(Matrix4.IDENTITY, new Cartesian3(0.0, 0.0, 11000000.0), new Matrix4());

        var primitive = createTangentSpaceDebugPrimitive({
            geometry : geometry,
            modelMatrix : modelMatrix,
            length : 1000.0
        });

        expect(primitive.geometryInstances).toBeDefined();
        expect(primitive.appearance).toBeDefined();
        expect(primitive.asynchronous).toBe(false);

        var instances = primitive.geometryInstances;
        expect(instances.length).toEqual(3);

        expect(instances[0].modelMatrix).toEqual(modelMatrix);
        expect(instances[1].modelMatrix).toEqual(modelMatrix);
        expect(instances[2].modelMatrix).toEqual(modelMatrix);

        expect(instances[0].attributes).toBeDefined();
        expect(instances[0].attributes.color).toBeDefined();
        expect(instances[1].attributes).toBeDefined();
        expect(instances[1].attributes.color).toBeDefined();
        expect(instances[2].attributes).toBeDefined();
        expect(instances[2].attributes.color).toBeDefined();

        expect(instances[0].geometry.primitiveType).toEqual(PrimitiveType.LINES);
        expect(instances[1].geometry.primitiveType).toEqual(PrimitiveType.LINES);
        expect(instances[2].geometry.primitiveType).toEqual(PrimitiveType.LINES);
    });

    it('throws without geometry', function() {
        expect(function() {
            createTangentSpaceDebugPrimitive();
        }).toThrowDeveloperError();
    });

});
