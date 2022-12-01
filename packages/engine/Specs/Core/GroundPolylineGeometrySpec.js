import {
  ApproximateTerrainHeights,
  ArcType,
  Cartesian3,
  Cartographic,
  Ellipsoid,
  GeographicProjection,
  GroundPolylineGeometry,
  WebMercatorProjection,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/GroundPolylineGeometry", function () {
  beforeAll(function () {
    return ApproximateTerrainHeights.initialize();
  });

  afterAll(function () {
    ApproximateTerrainHeights._initPromise = undefined;
    ApproximateTerrainHeights._terrainHeights = undefined;
  });

  function verifyAttributeValuesIdentical(attribute) {
    const values = attribute.values;
    const componentsPerAttribute = attribute.componentsPerAttribute;
    const vertexCount = values.length / componentsPerAttribute;
    const firstVertex = values.slice(0, componentsPerAttribute);
    let identical = true;
    for (let i = 1; i < vertexCount; i++) {
      const index = i * componentsPerAttribute;
      const vertex = values.slice(index, index + componentsPerAttribute);
      for (let j = 0; j < componentsPerAttribute; j++) {
        if (vertex[j] !== firstVertex[j]) {
          identical = false;
          break;
        }
      }
    }
    expect(identical).toBe(true);
  }

  it("computes positions and additional attributes for polylines", function () {
    const startCartographic = Cartographic.fromDegrees(0.01, 0.0);
    const endCartographic = Cartographic.fromDegrees(0.02, 0.0);
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromRadiansArray([
        startCartographic.longitude,
        startCartographic.latitude,
        endCartographic.longitude,
        endCartographic.latitude,
      ]),
      granularity: 0.0,
    });

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry.indices.length).toEqual(36);
    expect(geometry.attributes.position.values.length).toEqual(24);

    const startHiAndForwardOffsetX =
      geometry.attributes.startHiAndForwardOffsetX;
    const startLoAndForwardOffsetY =
      geometry.attributes.startLoAndForwardOffsetY;
    const startNormalAndForwardOffsetZ =
      geometry.attributes.startNormalAndForwardOffsetZ;
    const endNormalAndTextureCoordinateNormalizationX =
      geometry.attributes.endNormalAndTextureCoordinateNormalizationX;
    const rightNormalAndTextureCoordinateNormalizationY =
      geometry.attributes.rightNormalAndTextureCoordinateNormalizationY;
    const startHiLo2D = geometry.attributes.startHiLo2D;
    const offsetAndRight2D = geometry.attributes.offsetAndRight2D;
    const startEndNormals2D = geometry.attributes.startEndNormals2D;
    const texcoordNormalization2D = geometry.attributes.texcoordNormalization2D;

    // Expect each entry in the additional attributes to be identical across all vertices since this is a single segment,
    // except endNormalAndTextureCoordinateNormalizationX and texcoordNormalization2D, which should be "sided"
    verifyAttributeValuesIdentical(startHiAndForwardOffsetX);
    verifyAttributeValuesIdentical(startLoAndForwardOffsetY);
    verifyAttributeValuesIdentical(startNormalAndForwardOffsetZ);
    verifyAttributeValuesIdentical(startHiLo2D);
    verifyAttributeValuesIdentical(offsetAndRight2D);
    verifyAttributeValuesIdentical(startEndNormals2D);

    // Expect endNormalAndTextureCoordinateNormalizationX and texcoordNormalization2D.x to encode the "side" of the geometry
    let i;
    let index;
    let values = endNormalAndTextureCoordinateNormalizationX.values;
    for (i = 0; i < 4; i++) {
      index = i * 4 + 3;
      expect(CesiumMath.sign(values[index])).toEqual(1.0);
    }
    for (i = 4; i < 8; i++) {
      index = i * 4 + 3;
      expect(CesiumMath.sign(values[index])).toEqual(-1.0);
    }

    values = texcoordNormalization2D.values;
    for (i = 0; i < 4; i++) {
      index = i * 2;
      expect(CesiumMath.sign(values[index])).toEqual(1.0);
    }
    for (i = 4; i < 8; i++) {
      index = i * 2;
      expect(CesiumMath.sign(values[index])).toEqual(-1.0);
    }

    // Expect rightNormalAndTextureCoordinateNormalizationY and texcoordNormalization2D.y to encode if the vertex is on the bottom
    values = rightNormalAndTextureCoordinateNormalizationY.values;
    expect(values[3]).toBeGreaterThan(1.0);
    expect(values[1 * 4 + 3]).toBeGreaterThan(1.0);
    expect(values[4 * 4 + 3]).toBeGreaterThan(1.0);
    expect(values[5 * 4 + 3]).toBeGreaterThan(1.0);

    values = texcoordNormalization2D.values;
    expect(values[1]).toBeGreaterThan(1.0);
    expect(values[1 * 2 + 1]).toBeGreaterThan(1.0);
    expect(values[4 * 2 + 1]).toBeGreaterThan(1.0);
    expect(values[5 * 2 + 1]).toBeGreaterThan(1.0);

    // Line segment geometry is encoded as:
    // - start position
    // - offset to the end position
    // - normal for a mitered plane at each end
    // - a right-facing normal
    // - parameters for localizing the position along the line to texture coordinates
    const startPosition3D = new Cartesian3();
    startPosition3D.x =
      startHiAndForwardOffsetX.values[0] + startLoAndForwardOffsetY.values[0];
    startPosition3D.y =
      startHiAndForwardOffsetX.values[1] + startLoAndForwardOffsetY.values[1];
    startPosition3D.z =
      startHiAndForwardOffsetX.values[2] + startLoAndForwardOffsetY.values[2];
    let reconstructedCarto = Cartographic.fromCartesian(startPosition3D);
    reconstructedCarto.height = 0.0;
    expect(
      Cartographic.equalsEpsilon(
        reconstructedCarto,
        startCartographic,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    const endPosition3D = new Cartesian3();
    endPosition3D.x = startPosition3D.x + startHiAndForwardOffsetX.values[3];
    endPosition3D.y = startPosition3D.y + startLoAndForwardOffsetY.values[3];
    endPosition3D.z =
      startPosition3D.z + startNormalAndForwardOffsetZ.values[3];
    reconstructedCarto = Cartographic.fromCartesian(endPosition3D);
    reconstructedCarto.height = 0.0;
    expect(
      Cartographic.equalsEpsilon(
        reconstructedCarto,
        endCartographic,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    const startNormal3D = Cartesian3.unpack(
      startNormalAndForwardOffsetZ.values
    );
    expect(
      Cartesian3.equalsEpsilon(
        startNormal3D,
        new Cartesian3(0.0, 1.0, 0.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    const endNormal3D = Cartesian3.unpack(
      endNormalAndTextureCoordinateNormalizationX.values
    );
    expect(
      Cartesian3.equalsEpsilon(
        endNormal3D,
        new Cartesian3(0.0, -1.0, 0.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    const rightNormal3D = Cartesian3.unpack(
      rightNormalAndTextureCoordinateNormalizationY.values
    );
    expect(
      Cartesian3.equalsEpsilon(
        rightNormal3D,
        new Cartesian3(0.0, 0.0, -1.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    let texcoordNormalizationX =
      endNormalAndTextureCoordinateNormalizationX.values[3];
    expect(texcoordNormalizationX).toEqualEpsilon(1.0, CesiumMath.EPSILON3);

    // 2D
    const projection = new GeographicProjection();

    const startPosition2D = new Cartesian3();
    startPosition2D.x = startHiLo2D.values[0] + startHiLo2D.values[2];
    startPosition2D.y = startHiLo2D.values[1] + startHiLo2D.values[3];
    reconstructedCarto = projection.unproject(startPosition2D);
    reconstructedCarto.height = 0.0;
    expect(
      Cartographic.equalsEpsilon(
        reconstructedCarto,
        startCartographic,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    const endPosition2D = new Cartesian3();
    endPosition2D.x = startPosition2D.x + offsetAndRight2D.values[0];
    endPosition2D.y = startPosition2D.y + offsetAndRight2D.values[1];
    reconstructedCarto = projection.unproject(endPosition2D);
    reconstructedCarto.height = 0.0;
    expect(
      Cartographic.equalsEpsilon(
        reconstructedCarto,
        endCartographic,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    const startNormal2D = new Cartesian3();
    startNormal2D.x = startEndNormals2D.values[0];
    startNormal2D.y = startEndNormals2D.values[1];
    expect(
      Cartesian3.equalsEpsilon(
        startNormal2D,
        new Cartesian3(1.0, 0.0, 0.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    const endNormal2D = new Cartesian3();
    endNormal2D.x = startEndNormals2D.values[2];
    endNormal2D.y = startEndNormals2D.values[3];
    expect(
      Cartesian3.equalsEpsilon(
        endNormal2D,
        new Cartesian3(-1.0, 0.0, 0.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    const rightNormal2D = new Cartesian3();
    rightNormal2D.x = offsetAndRight2D.values[2];
    rightNormal2D.y = offsetAndRight2D.values[3];
    expect(
      Cartesian3.equalsEpsilon(
        rightNormal2D,
        new Cartesian3(0.0, -1.0, 0.0),
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    texcoordNormalizationX = texcoordNormalization2D.values[0];
    expect(texcoordNormalizationX).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
  });

  it("does not generate 2D attributes when scene3DOnly is true", function () {
    const startCartographic = Cartographic.fromDegrees(0.01, 0.0);
    const endCartographic = Cartographic.fromDegrees(0.02, 0.0);
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromRadiansArray([
        startCartographic.longitude,
        startCartographic.latitude,
        endCartographic.longitude,
        endCartographic.latitude,
      ]),
      granularity: 0.0,
    });

    groundPolylineGeometry._scene3DOnly = true;

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry.attributes.startHiAndForwardOffsetX).toBeDefined();
    expect(geometry.attributes.startLoAndForwardOffsetY).toBeDefined();
    expect(geometry.attributes.startNormalAndForwardOffsetZ).toBeDefined();
    expect(
      geometry.attributes.endNormalAndTextureCoordinateNormalizationX
    ).toBeDefined();
    expect(
      geometry.attributes.rightNormalAndTextureCoordinateNormalizationY
    ).toBeDefined();

    expect(geometry.attributes.startHiLo2D).not.toBeDefined();
    expect(geometry.attributes.offsetAndRight2D).not.toBeDefined();
    expect(geometry.attributes.startEndNormals2D).not.toBeDefined();
    expect(geometry.attributes.texcoordNormalization2D).not.toBeDefined();
  });

  it("removes adjacent positions with the same latitude/longitude", function () {
    const startCartographic = Cartographic.fromDegrees(0.01, 0.0);
    const endCartographic = Cartographic.fromDegrees(0.02, 0.0);
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromRadiansArrayHeights([
        startCartographic.longitude,
        startCartographic.latitude,
        0.0,
        endCartographic.longitude,
        endCartographic.latitude,
        0.0,
        endCartographic.longitude,
        endCartographic.latitude,
        0.0,
        endCartographic.longitude,
        endCartographic.latitude,
        10.0,
      ]),
      granularity: 0.0,
    });

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry.indices.length).toEqual(36);
    expect(geometry.attributes.position.values.length).toEqual(24);
  });

  it("returns undefined if filtered points are not a valid geometry", function () {
    const startCartographic = Cartographic.fromDegrees(0.01, 0.0);
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromRadiansArrayHeights([
        startCartographic.longitude,
        startCartographic.latitude,
        0.0,
        startCartographic.longitude,
        startCartographic.latitude,
        0.0,
      ]),
      granularity: 0.0,
    });

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry).toBeUndefined();
  });

  it("miters turns", function () {
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        0.01,
        0.0,
        0.02,
        0.0,
        0.02,
        0.01,
      ]),
      granularity: 0.0,
    });

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );
    expect(geometry.indices.length).toEqual(72);
    expect(geometry.attributes.position.values.length).toEqual(48);

    const startNormalAndForwardOffsetZvalues =
      geometry.attributes.startNormalAndForwardOffsetZ.values;
    const endNormalAndTextureCoordinateNormalizationXvalues =
      geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

    const miteredStartNormal = Cartesian3.unpack(
      startNormalAndForwardOffsetZvalues,
      32
    );
    const miteredEndNormal = Cartesian3.unpack(
      endNormalAndTextureCoordinateNormalizationXvalues,
      0
    );
    const reverseMiteredEndNormal = Cartesian3.multiplyByScalar(
      miteredEndNormal,
      -1.0,
      new Cartesian3()
    );

    expect(
      Cartesian3.equalsEpsilon(
        miteredStartNormal,
        reverseMiteredEndNormal,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    const approximateExpectedMiterNormal = new Cartesian3(0.0, 1.0, 1.0);
    Cartesian3.normalize(
      approximateExpectedMiterNormal,
      approximateExpectedMiterNormal
    );
    expect(
      Cartesian3.equalsEpsilon(
        approximateExpectedMiterNormal,
        miteredStartNormal,
        CesiumMath.EPSILON2
      )
    ).toBe(true);
  });

  it("breaks miters for tight turns", function () {
    let groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        0.01,
        0.0,
        0.02,
        0.0,
        0.01,
        CesiumMath.EPSILON7,
      ]),
      granularity: 0.0,
    });

    let geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    let startNormalAndForwardOffsetZvalues =
      geometry.attributes.startNormalAndForwardOffsetZ.values;
    let endNormalAndTextureCoordinateNormalizationXvalues =
      geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

    let miteredStartNormal = Cartesian3.unpack(
      startNormalAndForwardOffsetZvalues,
      32
    );
    let miteredEndNormal = Cartesian3.unpack(
      endNormalAndTextureCoordinateNormalizationXvalues,
      0
    );

    expect(
      Cartesian3.equalsEpsilon(
        miteredStartNormal,
        miteredEndNormal,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    let approximateExpectedMiterNormal = new Cartesian3(0.0, -1.0, 0.0);

    Cartesian3.normalize(
      approximateExpectedMiterNormal,
      approximateExpectedMiterNormal
    );
    expect(
      Cartesian3.equalsEpsilon(
        approximateExpectedMiterNormal,
        miteredStartNormal,
        CesiumMath.EPSILON2
      )
    ).toBe(true);

    // Break miter on loop end
    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        0.01,
        0.0,
        0.02,
        0.0,
        0.015,
        CesiumMath.EPSILON7,
      ]),
      granularity: 0.0,
      loop: true,
    });

    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

    startNormalAndForwardOffsetZvalues =
      geometry.attributes.startNormalAndForwardOffsetZ.values;
    endNormalAndTextureCoordinateNormalizationXvalues =
      geometry.attributes.endNormalAndTextureCoordinateNormalizationX.values;

    // Check normals at loop end
    miteredStartNormal = Cartesian3.unpack(
      startNormalAndForwardOffsetZvalues,
      0
    );
    miteredEndNormal = Cartesian3.unpack(
      endNormalAndTextureCoordinateNormalizationXvalues,
      32 * 2
    );

    expect(
      Cartesian3.equalsEpsilon(
        miteredStartNormal,
        miteredEndNormal,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    approximateExpectedMiterNormal = new Cartesian3(0.0, 1.0, 0.0);

    Cartesian3.normalize(
      approximateExpectedMiterNormal,
      approximateExpectedMiterNormal
    );
    expect(
      Cartesian3.equalsEpsilon(
        approximateExpectedMiterNormal,
        miteredStartNormal,
        CesiumMath.EPSILON2
      )
    ).toBe(true);
  });

  it("interpolates long polyline segments", function () {
    let groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([0.01, 0.0, 0.02, 0.0]),
      granularity: 600.0, // 0.01 to 0.02 is about 1113 meters with default ellipsoid, expect two segments
    });

    let geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry.indices.length).toEqual(72);
    expect(geometry.attributes.position.values.length).toEqual(48);

    // Interpolate one segment but not the other
    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        0.01,
        0.0,
        0.02,
        0.0,
        0.0201,
        0.0,
      ]),
      granularity: 600.0,
    });

    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

    expect(geometry.indices.length).toEqual(36 * 3);
    expect(geometry.attributes.position.values.length).toEqual(24 * 3);
  });

  it("interpolates long polyline segments for rhumb lines", function () {
    // rhumb distance = 289020, geodesic distance = 288677
    let positions = Cartesian3.fromDegreesArray([10, 75, 20, 75]);

    let rhumbGroundPolylineGeometry = new GroundPolylineGeometry({
      positions: positions,
      granularity: 2890.0,
      arcType: ArcType.RHUMB,
    });
    let geodesicGroundPolylineGeometry = new GroundPolylineGeometry({
      positions: positions,
      granularity: 2890.0,
      arcType: ArcType.GEODESIC,
    });

    let rhumbGeometry = GroundPolylineGeometry.createGeometry(
      rhumbGroundPolylineGeometry
    );
    let geodesicGeometry = GroundPolylineGeometry.createGeometry(
      geodesicGroundPolylineGeometry
    );

    expect(rhumbGeometry.indices.length).toEqual(3636);
    expect(geodesicGeometry.indices.length).toEqual(3600);
    expect(geodesicGeometry.attributes.position.values.length).toEqual(2400);
    expect(rhumbGeometry.attributes.position.values.length).toEqual(2424);

    // Interpolate one segment but not the other
    positions = Cartesian3.fromDegreesArray([10, 75, 20, 75, 20.01, 75]);
    rhumbGroundPolylineGeometry = new GroundPolylineGeometry({
      positions: positions,
      granularity: 2890.0,
      arcType: ArcType.RHUMB,
    });
    geodesicGroundPolylineGeometry = new GroundPolylineGeometry({
      positions: positions,
      granularity: 2890.0,
      arcType: ArcType.GEODESIC,
    });

    rhumbGeometry = GroundPolylineGeometry.createGeometry(
      rhumbGroundPolylineGeometry
    );
    geodesicGeometry = GroundPolylineGeometry.createGeometry(
      geodesicGroundPolylineGeometry
    );

    expect(rhumbGeometry.indices.length).toEqual(3636 + 36);
    expect(geodesicGeometry.indices.length).toEqual(3600 + 36);
    expect(geodesicGeometry.attributes.position.values.length).toEqual(
      2400 + 24
    );
    expect(rhumbGeometry.attributes.position.values.length).toEqual(2424 + 24);
  });

  it("loops when there are enough positions and loop is specified", function () {
    let groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([0.01, 0.0, 0.02, 0.0]),
      granularity: 0.0,
      loop: true,
    });

    // Not enough positions to loop, should still be a single segment
    let geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );
    expect(geometry.indices.length).toEqual(36);

    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        0.01,
        0.0,
        0.02,
        0.0,
        0.02,
        0.02,
      ]),
      granularity: 0.0,
      loop: true,
    });

    // Loop should produce 3 segments
    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
    expect(geometry.indices.length).toEqual(108);
  });

  it("subdivides geometry across the IDL and Prime Meridian", function () {
    // Cross PM
    let groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-1.0, 0.0, 1.0, 0.0]),
      granularity: 0.0, // no interpolative subdivision
    });

    let geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    expect(geometry.indices.length).toEqual(72);
    expect(geometry.attributes.position.values.length).toEqual(48);

    // Cross IDL
    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-179.0, 0.0, 179.0, 0.0]),
      granularity: 0.0, // no interpolative subdivision
    });

    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

    expect(geometry.indices.length).toEqual(72);
    expect(geometry.attributes.position.values.length).toEqual(48);

    // Cross IDL going opposite direction and loop
    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([
        179.0,
        0.0,
        179.0,
        1.0,
        -179.0,
        1.0,
        -179.0,
        0.0,
      ]),
      granularity: 0.0, // no interpolative subdivision
      loop: true,
    });

    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

    expect(geometry.indices.length).toEqual(6 * 36);
    expect(geometry.attributes.position.values.length).toEqual(6 * 24);

    // Near-IDL case
    groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([179.999, 80.0, -179.999, 80.0]),
      granularity: 0.0, // no interpolative subdivision
    });

    geometry = GroundPolylineGeometry.createGeometry(groundPolylineGeometry);

    expect(geometry.indices.length).toEqual(72);
    expect(geometry.attributes.position.values.length).toEqual(48);
  });

  it("throws errors if not enough positions have been provided", function () {
    expect(function () {
      return new GroundPolylineGeometry({
        positions: Cartesian3.fromDegreesArray([0.01, 0.0]),
        granularity: 0.0,
        loop: true,
      });
    }).toThrowDeveloperError();
  });

  it("can unpack onto an existing instance", function () {
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-1.0, 0.0, 1.0, 0.0]),
      loop: true,
      granularity: 10.0, // no interpolative subdivision
    });
    groundPolylineGeometry._scene3DOnly = true;
    GroundPolylineGeometry.setProjectionAndEllipsoid(
      groundPolylineGeometry,
      new WebMercatorProjection(Ellipsoid.UNIT_SPHERE)
    );

    const packedArray = [0];
    GroundPolylineGeometry.pack(groundPolylineGeometry, packedArray, 1);
    const scratch = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-1.0, 0.0, 1.0, 0.0]),
    });
    GroundPolylineGeometry.unpack(packedArray, 1, scratch);

    const scratchPositions = scratch._positions;
    expect(scratchPositions.length).toEqual(2);
    expect(
      Cartesian3.equals(
        scratchPositions[0],
        groundPolylineGeometry._positions[0]
      )
    ).toBe(true);
    expect(
      Cartesian3.equals(
        scratchPositions[1],
        groundPolylineGeometry._positions[1]
      )
    ).toBe(true);
    expect(scratch.loop).toBe(true);
    expect(scratch.granularity).toEqual(10.0);
    expect(scratch._ellipsoid.equals(Ellipsoid.UNIT_SPHERE)).toBe(true);
    expect(scratch._scene3DOnly).toBe(true);
    expect(scratch._projectionIndex).toEqual(1);
  });

  it("can unpack onto a new instance", function () {
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-1.0, 0.0, 1.0, 0.0]),
      loop: true,
      granularity: 10.0, // no interpolative subdivision
    });
    groundPolylineGeometry._scene3DOnly = true;
    GroundPolylineGeometry.setProjectionAndEllipsoid(
      groundPolylineGeometry,
      new WebMercatorProjection(Ellipsoid.UNIT_SPHERE)
    );

    const packedArray = [0];
    GroundPolylineGeometry.pack(groundPolylineGeometry, packedArray, 1);
    const result = GroundPolylineGeometry.unpack(packedArray, 1);

    const scratchPositions = result._positions;
    expect(scratchPositions.length).toEqual(2);
    expect(
      Cartesian3.equals(
        scratchPositions[0],
        groundPolylineGeometry._positions[0]
      )
    ).toBe(true);
    expect(
      Cartesian3.equals(
        scratchPositions[1],
        groundPolylineGeometry._positions[1]
      )
    ).toBe(true);
    expect(result.loop).toBe(true);
    expect(result.granularity).toEqual(10.0);
    expect(result._ellipsoid.equals(Ellipsoid.UNIT_SPHERE)).toBe(true);
    expect(result._scene3DOnly).toBe(true);
    expect(result._projectionIndex).toEqual(1);
  });

  it("provides a method for setting projection and ellipsoid", function () {
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: Cartesian3.fromDegreesArray([-1.0, 0.0, 1.0, 0.0]),
      loop: true,
      granularity: 10.0, // no interpolative subdivision
    });

    GroundPolylineGeometry.setProjectionAndEllipsoid(
      groundPolylineGeometry,
      new WebMercatorProjection(Ellipsoid.UNIT_SPHERE)
    );

    expect(groundPolylineGeometry._projectionIndex).toEqual(1);
    expect(
      groundPolylineGeometry._ellipsoid.equals(Ellipsoid.UNIT_SPHERE)
    ).toBe(true);
  });

  const positions = Cartesian3.fromDegreesArray([
    0.01,
    0.0,
    0.02,
    0.0,
    0.02,
    0.1,
  ]);
  const polyline = new GroundPolylineGeometry({
    positions: positions,
    granularity: 1000.0,
    loop: true,
  });

  it("projects normals that cross the IDL", function () {
    const projection = new GeographicProjection();
    const cartographic = new Cartographic(
      CesiumMath.PI - CesiumMath.EPSILON11,
      0.0
    );
    const normal = new Cartesian3(0.0, -1.0, 0.0);
    const projectedPosition = projection.project(
      cartographic,
      new Cartesian3()
    );
    const result = new Cartesian3();

    GroundPolylineGeometry._projectNormal(
      projection,
      cartographic,
      normal,
      projectedPosition,
      result
    );
    expect(
      Cartesian3.equalsEpsilon(
        result,
        new Cartesian3(1.0, 0.0, 0.0),
        CesiumMath.EPSILON7
      )
    ).toBe(true);
  });

  it("creates bounding spheres that cover the entire polyline volume height", function () {
    const positions = Cartesian3.fromDegreesArray([
      -122.17580380403314,
      46.19984918190237,
      -122.17581380403314,
      46.19984918190237,
    ]);

    // Mt. St. Helens - provided coordinates are a few meters apart
    const groundPolylineGeometry = new GroundPolylineGeometry({
      positions: positions,
      granularity: 0.0, // no interpolative subdivision
    });

    const geometry = GroundPolylineGeometry.createGeometry(
      groundPolylineGeometry
    );

    const boundingSphere = geometry.boundingSphere;
    const pointsDistance = Cartesian3.distance(positions[0], positions[1]);

    expect(boundingSphere.radius).toBeGreaterThan(pointsDistance);
    expect(boundingSphere.radius).toBeGreaterThan(1000.0); // starting top/bottom height
  });

  const packedInstance = [positions.length];
  Cartesian3.pack(positions[0], packedInstance, packedInstance.length);
  Cartesian3.pack(positions[1], packedInstance, packedInstance.length);
  Cartesian3.pack(positions[2], packedInstance, packedInstance.length);
  packedInstance.push(polyline.granularity);
  packedInstance.push(polyline.loop ? 1.0 : 0.0);
  packedInstance.push(polyline.arcType);

  Ellipsoid.pack(Ellipsoid.WGS84, packedInstance, packedInstance.length);

  packedInstance.push(0.0); // projection index for Geographic (default)
  packedInstance.push(0.0); // scene3DModeOnly = false

  createPackableSpecs(GroundPolylineGeometry, polyline, packedInstance);
});
