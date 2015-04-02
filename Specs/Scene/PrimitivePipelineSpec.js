/*global defineSuite*/
defineSuite([
        'Scene/PrimitivePipeline',
        'Core/BoundingSphere',
        'Core/BoxGeometry',
        'Core/Cartesian3',
        'Core/ComponentDatatype',
        'Core/Geometry',
        'Core/GeometryAttribute',
        'Core/GeometryAttributes',
        'Core/PrimitiveType'
    ], function(
        PrimitivePipeline,
        BoundingSphere,
        BoxGeometry,
        Cartesian3,
        ComponentDatatype,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('can pack and unpack geometry', function() {
        var boxGeometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
            dimensions : new Cartesian3(1, 2, 3)
        }));

        var boxGeometry2 = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
            dimensions : new Cartesian3(3, 4, 7)
        }));

        var geometryToPack = [boxGeometry, boxGeometry2];
        var transferableObjects = [];
        var results = PrimitivePipeline.packCreateGeometryResults(geometryToPack, transferableObjects);
        var unpackedGeometry = PrimitivePipeline.unpackCreateGeometryResults(results);

        expect(transferableObjects.length).toBe(1);
        expect(geometryToPack).toEqual(unpackedGeometry);
    });

    it('can pack and unpack geometry without indices', function() {
        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : new Float32Array([1, 2, 3, 4, 5, 6])
        });

        var geometry = new Geometry({
            attributes : attributes,
            indices : undefined,
            primitiveType : PrimitiveType.POINTS,
            boundingSphere : BoundingSphere.fromVertices(attributes.position.values)
        });

        var geometryToPack = [geometry];
        var transferableObjects = [];
        var results = PrimitivePipeline.packCreateGeometryResults(geometryToPack, transferableObjects);
        var unpackedGeometry = PrimitivePipeline.unpackCreateGeometryResults(results);

        expect(transferableObjects.length).toBe(1);
        expect(geometryToPack).toEqual(unpackedGeometry);
    });

}, 'WebGL');