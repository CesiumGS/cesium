import { arrayFill } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { EllipseGeometry } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/EllipseGeometry", function () {
  it("throws without a center", function () {
    expect(function () {
      return new EllipseGeometry({
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws without a semiMajorAxis", function () {
    expect(function () {
      return new EllipseGeometry({
        center: Cartesian3.fromDegrees(0, 0),
        semiMinorAxis: 1.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws without a semiMinorAxis", function () {
    expect(function () {
      return new EllipseGeometry({
        center: Cartesian3.fromDegrees(0, 0),
        semiMajorAxis: 1.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws with a negative granularity", function () {
    expect(function () {
      return new EllipseGeometry({
        center: Cartesian3.fromDegrees(0, 0),
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        granularity: -1.0,
      });
    }).toThrowDeveloperError();
  });

  it("throws when semiMajorAxis is less than the semiMajorAxis", function () {
    expect(function () {
      return new EllipseGeometry({
        center: Cartesian3.fromDegrees(0, 0),
        semiMajorAxis: 1.0,
        semiMinorAxis: 2.0,
      });
    }).toThrowDeveloperError();
  });

  it("computes positions", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
      })
    );

    expect(m.attributes.position.values.length).toEqual(16 * 3); // rows of 1 + 4 + 6 + 4 + 1
    expect(m.indices.length).toEqual(22 * 3); // rows of 3 + 8 + 8 + 3
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("compute all vertex attributes", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.ALL,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
      })
    );

    const numVertices = 16;
    const numTriangles = 22;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("compute texture coordinates with rotation", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_AND_ST,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        stRotation: CesiumMath.PI_OVER_TWO,
      })
    );

    const positions = m.attributes.position.values;
    const st = m.attributes.st.values;
    const length = st.length;

    const numVertices = 16;
    const numTriangles = 22;
    expect(positions.length).toEqual(numVertices * 3);
    expect(length).toEqual(numVertices * 2);
    expect(m.indices.length).toEqual(numTriangles * 3);

    expect(st[length - 2]).toEqualEpsilon(0.5, CesiumMath.EPSILON2);
    expect(st[length - 1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
  });

  it("computes positions extruded", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        extrudedHeight: 50000,
      })
    );

    const numVertices = 48; // 16 top + 16 bottom + 8 top edge + 8 bottom edge
    const numTriangles = 60; // 22 top fill + 22 bottom fill + 2 triangles * 8 sides
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("computes offset attribute", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 16;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    let expected = new Array(offset.length);
    expected = arrayFill(expected, 1);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for top vertices", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        extrudedHeight: 50000,
        offsetAttribute: GeometryOffsetAttribute.TOP,
      })
    );

    const numVertices = 48;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    let expected = new Array(offset.length);
    expected = arrayFill(expected, 0);
    expected = arrayFill(expected, 1, 0, 16);
    expected = arrayFill(expected, 1, 32, 40);
    expect(offset).toEqual(expected);
  });

  it("computes offset attribute extruded for all vertices", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        extrudedHeight: 50000,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 48;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    let expected = new Array(offset.length);
    expected = arrayFill(expected, 1);
    expect(offset).toEqual(expected);
  });

  it("compute all vertex attributes extruded", function () {
    const m = EllipseGeometry.createGeometry(
      new EllipseGeometry({
        vertexFormat: VertexFormat.ALL,
        ellipsoid: Ellipsoid.WGS84,
        center: Cartesian3.fromDegrees(0, 0),
        granularity: 0.1,
        semiMajorAxis: 1.0,
        semiMinorAxis: 1.0,
        extrudedHeight: 50000,
      })
    );

    const numVertices = 48;
    const numTriangles = 60;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numTriangles * 3);
  });

  it("undefined is returned if the minor axis is equal to or less than zero", function () {
    const ellipse0 = new EllipseGeometry({
      center: Cartesian3.fromDegrees(-75.59777, 40.03883),
      semiMajorAxis: 300000.0,
      semiMinorAxis: 0.0,
    });
    const ellipse1 = new EllipseGeometry({
      center: Cartesian3.fromDegrees(-75.59777, 40.03883),
      semiMajorAxis: 0.0,
      semiMinorAxis: -1.0,
    });
    const ellipse2 = new EllipseGeometry({
      center: Cartesian3.fromDegrees(-75.59777, 40.03883),
      semiMajorAxis: 300000.0,
      semiMinorAxis: -10.0,
    });
    const ellipse3 = new EllipseGeometry({
      center: Cartesian3.fromDegrees(-75.59777, 40.03883),
      semiMajorAxis: -1.0,
      semiMinorAxis: -2.0,
    });

    const geometry0 = EllipseGeometry.createGeometry(ellipse0);
    const geometry1 = EllipseGeometry.createGeometry(ellipse1);
    const geometry2 = EllipseGeometry.createGeometry(ellipse2);
    const geometry3 = EllipseGeometry.createGeometry(ellipse3);

    expect(geometry0).toBeUndefined();
    expect(geometry1).toBeUndefined();
    expect(geometry2).toBeUndefined();
    expect(geometry3).toBeUndefined();
  });

  it("createShadowVolume uses properties from geometry", function () {
    const m = new EllipseGeometry({
      center: Cartesian3.fromDegrees(-75.59777, 40.03883),
      semiMajorAxis: 3000.0,
      semiMinorAxis: 1500.0,
      ellipsoid: Ellipsoid.WGS84,
      rotation: CesiumMath.PI_OVER_TWO,
      stRotation: CesiumMath.PI_OVER_FOUR,
      granularity: 10000,
      extrudedHeight: 0,
      height: 100,
      vertexFormat: VertexFormat.ALL,
    });

    const minHeightFunc = function () {
      return 100;
    };

    const maxHeightFunc = function () {
      return 1000;
    };

    const sv = EllipseGeometry.createShadowVolume(
      m,
      minHeightFunc,
      maxHeightFunc
    );

    expect(sv._center.equals(m._center)).toBe(true);
    expect(sv._semiMajorAxis).toBe(m._semiMajorAxis);
    expect(sv._semiMinorAxis).toBe(m._semiMinorAxis);
    expect(sv._ellipsoid.equals(m._ellipsoid)).toBe(true);
    expect(sv._rotation).toBe(m._rotation);
    expect(sv._stRotation).toBe(m._stRotation);
    expect(sv._granularity).toBe(m._granularity);
    expect(sv._extrudedHeight).toBe(minHeightFunc());
    expect(sv._height).toBe(maxHeightFunc());

    expect(sv._vertexFormat.bitangent).toBe(
      VertexFormat.POSITION_ONLY.bitangent
    );
    expect(sv._vertexFormat.color).toBe(VertexFormat.POSITION_ONLY.color);
    expect(sv._vertexFormat.normal).toBe(VertexFormat.POSITION_ONLY.normal);
    expect(sv._vertexFormat.position).toBe(VertexFormat.POSITION_ONLY.position);
    expect(sv._vertexFormat.st).toBe(VertexFormat.POSITION_ONLY.st);
    expect(sv._vertexFormat.tangent).toBe(VertexFormat.POSITION_ONLY.tangent);
  });

  it("computing rectangle property", function () {
    let center = Cartesian3.fromDegrees(-75.59777, 40.03883);
    let ellipse = new EllipseGeometry({
      center: center,
      semiMajorAxis: 2000.0,
      semiMinorAxis: 1000.0,
    });

    let r = ellipse.rectangle;
    expect(r.north).toEqualEpsilon(0.6989665987920752, CesiumMath.EPSILON7);
    expect(r.south).toEqualEpsilon(0.6986522252554146, CesiumMath.EPSILON7);
    expect(r.east).toEqualEpsilon(-1.3190209903056758, CesiumMath.EPSILON7);
    expect(r.west).toEqualEpsilon(-1.3198389970251112, CesiumMath.EPSILON7);

    // Polar ellipse
    center = Cartesian3.fromDegrees(0.0, 90);
    ellipse = new EllipseGeometry({
      center: center,
      semiMajorAxis: 2000.0,
      semiMinorAxis: 1000.0,
    });

    r = ellipse.rectangle;
    expect(r.north).toEqualEpsilon(
      CesiumMath.PI_OVER_TWO - CesiumMath.EPSILON7,
      CesiumMath.EPSILON7
    );
    expect(r.south).toEqualEpsilon(1.570483806950967, CesiumMath.EPSILON7);
    expect(r.east).toEqualEpsilon(CesiumMath.PI, CesiumMath.EPSILON7);
    expect(r.west).toEqualEpsilon(-CesiumMath.PI, CesiumMath.EPSILON7);
  });

  it("computeRectangle", function () {
    const options = {
      center: Cartesian3.fromDegrees(-30, 33),
      semiMajorAxis: 2000.0,
      semiMinorAxis: 1000.0,
      rotation: CesiumMath.PI_OVER_TWO,
      granularity: 0.5,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    };
    const geometry = new EllipseGeometry(options);

    const expected = geometry.rectangle;
    const result = EllipseGeometry.computeRectangle(options);

    expect(result).toEqual(expected);
  });

  it("computeRectangle with result parameter", function () {
    const options = {
      center: Cartesian3.fromDegrees(30, -33),
      semiMajorAxis: 500.0,
      semiMinorAxis: 200.0,
    };
    const geometry = new EllipseGeometry(options);

    const result = new Rectangle();
    const expected = geometry.rectangle;
    const returned = EllipseGeometry.computeRectangle(options, result);

    expect(returned).toEqual(expected);
    expect(returned).toBe(result);
  });

  it("computing textureCoordinateRotationPoints property", function () {
    const center = Cartesian3.fromDegrees(0, 0);
    let ellipse = new EllipseGeometry({
      center: center,
      semiMajorAxis: 2000.0,
      semiMinorAxis: 1000.0,
      stRotation: CesiumMath.toRadians(90),
    });

    // 90 degree rotation means (0, 1) should be the new min and (1, 1) (0, 0) are extents
    let textureCoordinateRotationPoints =
      ellipse.textureCoordinateRotationPoints;
    expect(textureCoordinateRotationPoints.length).toEqual(6);
    expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(
      1,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );
    expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(
      0,
      CesiumMath.EPSILON7
    );

    ellipse = new EllipseGeometry({
      center: center,
      semiMajorAxis: 2000.0,
      semiMinorAxis: 1000.0,
      stRotation: CesiumMath.toRadians(0),
    });

    textureCoordinateRotationPoints = ellipse.textureCoordinateRotationPoints;
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

  const center = Cartesian3.fromDegrees(0, 0);
  const ellipsoid = Ellipsoid.WGS84;
  const packableInstance = new EllipseGeometry({
    vertexFormat: VertexFormat.POSITION_AND_ST,
    ellipsoid: ellipsoid,
    center: center,
    granularity: 0.1,
    semiMajorAxis: 1.0,
    semiMinorAxis: 1.0,
    stRotation: CesiumMath.PI_OVER_TWO,
  });
  const packedInstance = [
    center.x,
    center.y,
    center.z,
    ellipsoid.radii.x,
    ellipsoid.radii.y,
    ellipsoid.radii.z,
    1.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    1.0,
    1.0,
    0.0,
    CesiumMath.PI_OVER_TWO,
    0.0,
    0.1,
    0.0,
    0.0,
    -1,
  ];
  createPackableSpecs(EllipseGeometry, packableInstance, packedInstance);
});
