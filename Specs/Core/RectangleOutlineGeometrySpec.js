import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  GeographicProjection,
  GeometryOffsetAttribute,
  Matrix2,
  Rectangle,
  RectangleOutlineGeometry,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/RectangleOutlineGeometry", function () {
  it("computes positions", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(8 * 2);

    const expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.northwest(rectangle)
    );
    expect(
      new Cartesian3(positions[0], positions[1], positions[2])
    ).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
  });

  it("computes positions across IDL", function () {
    const rectangle = Rectangle.fromDegrees(179.0, -1.0, -179.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(8 * 2);

    const expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      Rectangle.northwest(rectangle)
    );
    expect(
      new Cartesian3(positions[0], positions[1], positions[2])
    ).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
  });

  it("computes positions at north pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, 89.0, -179.0, 90.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(5 * 3);
    expect(m.indices.length).toEqual(5 * 2);
  });

  it("computes positions at south pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, -90.0, -179.0, -89.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(5 * 3);
    expect(m.indices.length).toEqual(5 * 2);
  });

  it("compute positions with rotation", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.PI_OVER_TWO;
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        rotation: angle,
        granularity: 1.0,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(8 * 2);

    const unrotatedNWCorner = Rectangle.northwest(rectangle);
    const projection = new GeographicProjection();
    const projectedNWCorner = projection.project(unrotatedNWCorner);
    const rotation = Matrix2.fromRotation(angle);
    const rotatedNWCornerCartographic = projection.unproject(
      Matrix2.multiplyByVector(rotation, projectedNWCorner, new Cartesian2())
    );
    const rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      rotatedNWCornerCartographic
    );
    const actual = new Cartesian3(positions[0], positions[1], positions[2]);
    expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
  });

  it("throws without rectangle", function () {
    expect(function () {
      return new RectangleOutlineGeometry({});
    }).toThrowDeveloperError();
  });

  it("throws if rotated rectangle is invalid", function () {
    expect(function () {
      return RectangleOutlineGeometry.createGeometry(
        new RectangleOutlineGeometry({
          rectangle: new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            1,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO
          ),
          rotation: CesiumMath.PI_OVER_TWO,
        })
      );
    }).toThrowDeveloperError();
  });

  it("throws if north is less than south", function () {
    expect(function () {
      return new RectangleOutlineGeometry({
        rectangle: new Rectangle(
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          -CesiumMath.PI_OVER_TWO
        ),
      });
    }).toThrowDeveloperError();
  });

  it("computes positions extruded", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(16 * 3); // 8 top + 8 bottom
    expect(m.indices.length).toEqual(20 * 2); // 8 top + 8 bottom + 4 edges
  });

  it("computes positions extruded at north pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, 89.0, -179.0, 90.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(10 * 3); // 5 top + 5 bottom
    expect(m.indices.length).toEqual(13 * 2); // 5 top + 5 bottom + 3 edges
  });

  it("computes positions extruded at south pole", function () {
    const rectangle = Rectangle.fromDegrees(-180.0, -90.0, -179.0, -89.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(10 * 3); // 5 top + 5 bottom
    expect(m.indices.length).toEqual(13 * 2); // 5 top + 5 bottom + 3 edges
  });

  it("compute positions with rotation extruded", function () {
    const rectangle = new Rectangle(-1, -1, 1, 1);
    const angle = CesiumMath.PI_OVER_TWO;
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        rotation: angle,
        granularity: 1.0,
        extrudedHeight: 2,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(16 * 3);
    expect(m.indices.length).toEqual(20 * 2);

    const unrotatedNWCorner = Rectangle.northwest(rectangle);
    const projection = new GeographicProjection();
    const projectedNWCorner = projection.project(unrotatedNWCorner);
    const rotation = Matrix2.fromRotation(angle);
    const rotatedNWCornerCartographic = projection.unproject(
      Matrix2.multiplyByVector(rotation, projectedNWCorner, new Cartesian2())
    );
    rotatedNWCornerCartographic.height = 2;
    const rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(
      rotatedNWCornerCartographic
    );
    const actual = new Cartesian3(positions[0], positions[1], positions[2]);
    expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
  });

  it("computes non-extruded rectangle if height is small", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: CesiumMath.EPSILON14,
      })
    );
    const positions = m.attributes.position.values;

    expect(positions.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(8 * 2);
  });

  it("undefined is returned if any side are of length zero", function () {
    const rectangleOutline0 = new RectangleOutlineGeometry({
      rectangle: Rectangle.fromDegrees(-80.0, 39.0, -80.0, 42.0),
    });
    const rectangleOutline1 = new RectangleOutlineGeometry({
      rectangle: Rectangle.fromDegrees(-81.0, 42.0, -80.0, 42.0),
    });
    const rectangleOutline2 = new RectangleOutlineGeometry({
      rectangle: Rectangle.fromDegrees(-80.0, 39.0, -80.0, 39.0),
    });

    const geometry0 = RectangleOutlineGeometry.createGeometry(
      rectangleOutline0
    );
    const geometry1 = RectangleOutlineGeometry.createGeometry(
      rectangleOutline1
    );
    const geometry2 = RectangleOutlineGeometry.createGeometry(
      rectangleOutline2
    );

    expect(geometry0).toBeUndefined();
    expect(geometry1).toBeUndefined();
    expect(geometry2).toBeUndefined();
  });

  it("computes offset attribute", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 8;
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 16;
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(0).fill(1, 0, 8);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
    const m = RectangleOutlineGeometry.createGeometry(
      new RectangleOutlineGeometry({
        rectangle: rectangle,
        granularity: 1.0,
        extrudedHeight: 2,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );
    const positions = m.attributes.position.values;

    const numVertices = 16;
    expect(positions.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  let rectangle = new RectangleOutlineGeometry({
    rectangle: new Rectangle(0.1, 0.2, 0.3, 0.4),
    ellipsoid: new Ellipsoid(5, 6, 7),
    granularity: 8,
    height: 9,
    rotation: 10,
    extrudedHeight: 11,
  });
  let packedInstance = [0.1, 0.2, 0.3, 0.4, 5, 6, 7, 8, 11, 10, 9, -1];
  createPackableSpecs(
    RectangleOutlineGeometry,
    rectangle,
    packedInstance,
    "extruded"
  );

  rectangle = new RectangleOutlineGeometry({
    rectangle: new Rectangle(0.1, 0.2, 0.3, 0.4),
    ellipsoid: new Ellipsoid(5, 6, 7),
    granularity: 8,
    height: 9,
    rotation: 10,
  });
  packedInstance = [0.1, 0.2, 0.3, 0.4, 5, 6, 7, 8, 9, 10, 9, -1];
  createPackableSpecs(
    RectangleOutlineGeometry,
    rectangle,
    packedInstance,
    "at height"
  );
});
