import {
  BoundingSphere,
  Cartesian3,
  ComponentDatatype,
  Ellipsoid,
  Geometry,
  GeometryAttribute,
  GeometryType,
  PrimitiveType,
  Rectangle,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/Geometry", function () {
  it("constructor", function () {
    const attributes = {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
      }),
    };
    const indices = new Uint16Array([0, 1, 2]);
    const boundingSphere = new BoundingSphere(
      new Cartesian3(0.5, 0.5, 0.0),
      1.0
    );

    const geometry = new Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere,
      geometryType: GeometryType.TRIANGLES,
    });

    expect(geometry.attributes).toBe(attributes);
    expect(geometry.indices).toBe(indices);
    expect(geometry.primitiveType).toEqual(PrimitiveType.TRIANGLES);
    expect(geometry.boundingSphere).toBe(boundingSphere);
    expect(geometry.geometryType).toEqual(GeometryType.TRIANGLES);
  });

  it("constructor throws without attributes", function () {
    expect(function () {
      return new Geometry({
        primitiveType: PrimitiveType.TRIANGLES,
      });
    }).toThrowDeveloperError();
  });

  it("computeNumberOfVertices", function () {
    const attributes = {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
      }),
      st: new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0]),
      }),
    };
    const indices = new Uint16Array([0, 1, 2]);
    const boundingSphere = new BoundingSphere(
      new Cartesian3(0.5, 0.5, 0.0),
      1.0
    );

    const geometry = new Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere,
    });

    expect(Geometry.computeNumberOfVertices(geometry)).toEqual(3);
  });

  it("computeNumberOfVertices throws when attributes have different number of vertices", function () {
    const attributes = {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
      }),
      st: new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array([0.0, 0.0, 1.0, 0.0]),
      }),
    };
    const indices = new Uint16Array([0, 1, 2]);
    const boundingSphere = new BoundingSphere(
      new Cartesian3(0.5, 0.5, 0.0),
      1.0
    );

    const geometry = new Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere,
    });

    expect(function () {
      Geometry.computeNumberOfVertices(geometry);
    }).toThrowDeveloperError();
  });

  it("computeNumberOfVertices throws without geometry", function () {
    expect(function () {
      Geometry.computeNumberOfVertices();
    }).toThrowDeveloperError();
  });

  it("computes textureCoordinateRotationPoints for collections of points", function () {
    const positions = Cartesian3.fromDegreesArrayHeights([
      -10.0,
      -10.0,
      0,
      -10.0,
      10.0,
      0,
      10.0,
      -10.0,
      0,
      10.0,
      10.0,
      0,
    ]);
    const boundingRectangle = Rectangle.fromCartesianArray(positions);
    const textureCoordinateRotationPoints = Geometry._textureCoordinateRotationPoints(
      positions,
      0.0,
      Ellipsoid.WGS84,
      boundingRectangle
    );
    expect(textureCoordinateRotationPoints.length).toEqual(6);
    expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
  });
});
