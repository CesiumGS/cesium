/*global defineSuite*/
defineSuite([
        'Core/Geometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/ComponentDatatype',
        'Core/GeometryAttribute',
        'Core/GeometryType',
        'Core/PrimitiveType'
    ], function(
        Geometry,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        GeometryAttribute,
        GeometryType,
        PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor', function() {
        var attributes = {
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array([
                    0.0, 0.0, 0.0,
                    1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0
                ])
            })
        };
        var indices = new Uint16Array([0, 1, 2]);
        var boundingSphere = new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0);

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : boundingSphere,
            geometryType : GeometryType.TRIANGLES
        });

        expect(geometry.attributes).toBe(attributes);
        expect(geometry.indices).toBe(indices);
        expect(geometry.primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(geometry.boundingSphere).toBe(boundingSphere);
        expect(geometry.geometryType).toEqual(GeometryType.TRIANGLES);
    });

    it('constructor throws without attributes', function() {
        expect(function() {
            return new Geometry({
                primitiveType : PrimitiveType.TRIANGLES
            });
        }).toThrowDeveloperError();
    });

    it('computeNumberOfVertices', function() {
        var attributes = {
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array([
                    0.0, 0.0, 0.0,
                    1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0
                ])
            }),
            st : new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : new Float32Array([
                    0.0, 0.0,
                    1.0, 0.0,
                    0.0, 1.0
                ])
            })
        };
        var indices = new Uint16Array([0, 1, 2]);
        var boundingSphere = new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0);

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : boundingSphere
        });

        expect(Geometry.computeNumberOfVertices(geometry)).toEqual(3);
    });

    it('computeNumberOfVertices throws when attributes have different number of vertices', function() {
        var attributes = {
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array([
                    0.0, 0.0, 0.0,
                    1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0
                ])
            }),
            st : new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : new Float32Array([
                    0.0, 0.0,
                    1.0, 0.0
                ])
            })
        };
        var indices = new Uint16Array([0, 1, 2]);
        var boundingSphere = new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0);

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : boundingSphere
        });

        expect(function() {
            Geometry.computeNumberOfVertices(geometry);
        }).toThrowDeveloperError();
    });

    it('computeNumberOfVertices throws without geometry', function() {
        expect(function() {
            Geometry.computeNumberOfVertices();
        }).toThrowDeveloperError();
    });

});
