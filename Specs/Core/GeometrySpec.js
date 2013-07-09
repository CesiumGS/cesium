/*global defineSuite*/
defineSuite([
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/ComponentDatatype',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/PrimitiveType'
     ], function(
         Geometry,
         GeometryAttribute,
         ComponentDatatype,
         BoundingSphere,
         Cartesian3,
         PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
            boundingSphere : boundingSphere
        });

        expect(geometry.attributes).toBe(attributes);
        expect(geometry.indices).toBe(indices);
        expect(geometry.primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(geometry.boundingSphere).toBe(boundingSphere);
    });

    it('clone returns undefined when geometry is undefined', function() {
        expect(Geometry.clone()).not.toBeDefined();
    });

    it('clone', function() {
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
        var clone = Geometry.clone(geometry);

        expect(clone.attributes).not.toBe(geometry.attributes);
        expect(clone.attributes.position).toBeDefined();
        expect(clone.attributes.st).toBeDefined();

        expect(clone.indices).toBeDefined();
        expect(clone.indices).not.toBe(geometry.indices);
        expect(clone.indices instanceof Uint16Array).toEqual(true);

        expect(clone.primitiveType).toEqual(geometry.primitiveType);
        expect(clone.boundingSphere).toEqual(geometry.boundingSphere);
    });

    it('clone with undefined indices', function() {
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
        var boundingSphere = new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0);

        var geometry = new Geometry({
            attributes : attributes,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : boundingSphere
        });
        var clone = Geometry.clone(geometry);

        expect(clone.attributes).not.toBe(geometry.attributes);
        expect(clone.attributes.position).toBeDefined();
        expect(clone.attributes.st).toBeDefined();

        expect(clone.indices).not.toBeDefined();

        expect(clone.primitiveType).toEqual(geometry.primitiveType);
        expect(clone.boundingSphere).toEqual(geometry.boundingSphere);
    });

    it('clone with result parameter', function() {
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
        var result = new Geometry();
        var clone = Geometry.clone(geometry, result);

        expect(clone).toBe(result);

        expect(clone.attributes).not.toBe(geometry.attributes);
        expect(clone.attributes.position).toBeDefined();
        expect(clone.attributes.st).toBeDefined();

        expect(clone.indices).toBeDefined();
        expect(clone.indices).not.toBe(geometry.indices);
        expect(clone.indices instanceof Uint16Array).toEqual(true);

        expect(clone.primitiveType).toEqual(geometry.primitiveType);
        expect(clone.boundingSphere).toEqual(geometry.boundingSphere);
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
        }).toThrow();
    });

    it('computeNumberOfVertices throws without geometry', function() {
        expect(function() {
            Geometry.computeNumberOfVertices();
        }).toThrow();
    });

});
