import { BoundingSphere } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { ComponentDatatype } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { Geometry } from '../../Source/Cesium.js';
import { GeometryAttribute } from '../../Source/Cesium.js';
import { GeometryType } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { PrimitiveType } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';

describe('Core/Geometry', function() {

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

    it('computes textureCoordinateRotationPoints for collections of points', function() {
        var positions = Cartesian3.fromDegreesArrayHeights([
            -10.0, -10.0, 0,
            -10.0, 10.0, 0,
            10.0, -10.0, 0,
            10.0, 10.0, 0
        ]);
        var boundingRectangle = Rectangle.fromCartesianArray(positions);
        var textureCoordinateRotationPoints = Geometry._textureCoordinateRotationPoints(positions, 0.0, Ellipsoid.WGS84, boundingRectangle);
        expect(textureCoordinateRotationPoints.length).toEqual(6);
        expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(0, CesiumMath.EPSILON7);
    });
});
