import {
  Cartesian3,
  Color,
  Ellipsoid,
  PolylineGeometry,
  VertexFormat,
} from "../../index.js";;
import { ArcType, defaultValue } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;
import CesiumMath from "../../Source/Core/Math.js";

describe("Core/PolylineGeometry", function () {
  it("constructor throws with no positions", function () {
    expect(function () {
      return new PolylineGeometry();
    }).toThrowDeveloperError();
  });

  it("constructor throws with less than two positions", function () {
    expect(function () {
      return new PolylineGeometry({
        positions: [Cartesian3.ZERO],
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid number of colors", function () {
    expect(function () {
      return new PolylineGeometry({
        positions: [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
        colors: [],
      });
    }).toThrowDeveloperError();
  });

  it("constructor returns undefined when line width is negative", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: -1.0,
        vertexFormat: VertexFormat.ALL,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line).toBeUndefined();
  });

  it("constructor computes all vertex attributes", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: 10.0,
        vertexFormat: VertexFormat.ALL,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.position).toBeDefined();
    expect(line.attributes.prevPosition).toBeDefined();
    expect(line.attributes.nextPosition).toBeDefined();
    expect(line.attributes.expandAndWidth).toBeDefined();
    expect(line.attributes.st).toBeDefined();

    const numVertices = positions.length * 4 - 4;
    expect(line.attributes.position.values.length).toEqual(numVertices * 3);
    expect(line.attributes.prevPosition.values.length).toEqual(numVertices * 3);
    expect(line.attributes.nextPosition.values.length).toEqual(numVertices * 3);
    expect(line.attributes.expandAndWidth.values.length).toEqual(
      numVertices * 2
    );
    expect(line.attributes.st.values.length).toEqual(numVertices * 2);
    expect(line.indices.length).toEqual(positions.length * 6 - 6);
  });

  it("constructor computes all vertex attributes for rhumb lines", function () {
    const positions = Cartesian3.fromDegreesArray([30, 30, 30, 60, 60, 60]);
    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: 10.0,
        vertexFormat: VertexFormat.ALL,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
        arcType: ArcType.RHUMB,
      })
    );

    expect(line.attributes.position).toBeDefined();
    expect(line.attributes.prevPosition).toBeDefined();
    expect(line.attributes.nextPosition).toBeDefined();
    expect(line.attributes.expandAndWidth).toBeDefined();
    expect(line.attributes.st).toBeDefined();

    const numVertices = positions.length * 4 - 4;
    expect(line.attributes.position.values.length).toEqual(numVertices * 3);
    expect(line.attributes.prevPosition.values.length).toEqual(numVertices * 3);
    expect(line.attributes.nextPosition.values.length).toEqual(numVertices * 3);
    expect(line.attributes.expandAndWidth.values.length).toEqual(
      numVertices * 2
    );
    expect(line.attributes.st.values.length).toEqual(numVertices * 2);
    expect(line.indices.length).toEqual(positions.length * 6 - 6);
  });

  it("constructor computes per segment colors", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        colors: colors,
        width: 10.0,
        vertexFormat: VertexFormat.ALL,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length * 4 - 4;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  it("constructor computes per vertex colors", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(0.0, 0.0, 1.0),
    ];
    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];
    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        colors: colors,
        colorsPerVertex: true,
        width: 10.0,
        vertexFormat: VertexFormat.ALL,
        granularity: Math.PI,
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      })
    );

    expect(line.attributes.color).toBeDefined();

    const numVertices = positions.length * 4 - 4;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
  });

  it("createGeometry returns undefined without at least 2 unique positions", function () {
    const position = new Cartesian3(100000.0, -200000.0, 300000.0);
    const positions = [position, Cartesian3.clone(position)];

    const geometry = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: 10.0,
        vertexFormat: VertexFormat.POSITION_ONLY,
        arcType: ArcType.NONE,
      })
    );
    expect(geometry).not.toBeDefined();
  });

  it("createGeometry returns positions if their endpoints'longtitude and latitude are the same for rhumb line", function () {
    const positions = Cartesian3.fromDegreesArrayHeights([
      30.0,
      30.0,
      10.0,
      30.0,
      30.0,
      5.0,
    ]);
    const geometry = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: 10.0,
        vertexFormat: VertexFormat.POSITION_ONLY,
        arcType: ArcType.RHUMB,
      })
    );

    const attributePositions = geometry.attributes.position.values;
    const geometryPosition = new Cartesian3();

    Cartesian3.fromArray(attributePositions, 0, geometryPosition);
    expect(
      Cartesian3.equalsEpsilon(
        geometryPosition,
        positions[0],
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    Cartesian3.fromArray(attributePositions, 3, geometryPosition);
    expect(
      Cartesian3.equalsEpsilon(
        geometryPosition,
        positions[0],
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    Cartesian3.fromArray(attributePositions, 6, geometryPosition);
    expect(
      Cartesian3.equalsEpsilon(
        geometryPosition,
        positions[1],
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    Cartesian3.fromArray(attributePositions, 9, geometryPosition);
    expect(
      Cartesian3.equalsEpsilon(
        geometryPosition,
        positions[1],
        CesiumMath.EPSILON7
      )
    ).toBe(true);
  });

  it("createGeometry removes duplicate positions", function () {
    const positions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
    ];

    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        width: 10.0,
        vertexFormat: VertexFormat.POSITION_ONLY,
        arcType: ArcType.NONE,
      })
    );

    const numVertices = expectedPositions.length * 4 - 4;
    expect(line.attributes.position.values.length).toEqual(numVertices * 3);
    expect(line.attributes.prevPosition.values.length).toEqual(numVertices * 3);
    expect(line.attributes.nextPosition.values.length).toEqual(numVertices * 3);
  });

  function attributeArrayEqualsColorArray(
    attributeArray,
    colorArray,
    colorsPerVertex
  ) {
    colorsPerVertex = defaultValue(colorsPerVertex, false);
    let i;
    let j;
    let color;
    let color2;
    const reconstructedColor = new Color();
    let attrArrayIndex;
    const length = colorsPerVertex ? colorArray.length - 1 : colorArray.length;
    for (i = 0; i < length; i++) {
      color = colorArray[i];
      color2 = colorArray[i + 1];

      attrArrayIndex = 16 * i;
      for (j = 0; j < 4; j++) {
        reconstructedColor.red = attributeArray[attrArrayIndex + 4 * j] / 255;
        reconstructedColor.green =
          attributeArray[attrArrayIndex + 4 * j + 1] / 255;
        reconstructedColor.blue =
          attributeArray[attrArrayIndex + 4 * j + 2] / 255;
        reconstructedColor.alpha =
          attributeArray[attrArrayIndex + 4 * j + 3] / 255;
        if (colorsPerVertex && j > 1) {
          if (!reconstructedColor.equalsEpsilon(color2, CesiumMath.EPSILON2)) {
            return false;
          }
        } else if (
          !reconstructedColor.equalsEpsilon(color, CesiumMath.EPSILON2)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  it("createGeometry removes segment colors corresponding to duplicate positions", function () {
    const positions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
    ];

    const colors = [
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
    ];

    const expectedColors = [
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        colors: colors,
        width: 10.0,
        vertexFormat: VertexFormat.POSITION_ONLY,
        arcType: ArcType.NONE,
      })
    );

    const numVertices = expectedPositions.length * 4 - 4;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    expect(
      attributeArrayEqualsColorArray(
        line.attributes.color.values,
        expectedColors
      )
    ).toBe(true);
  });

  it("createGeometry removes per-vertex colors corresponding to duplicate positions", function () {
    const positions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
      new Cartesian3(6.0, 2.0, 3.0),
    ];

    const colors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(1.0, 0.5, 0.0, 1.0),
      new Color(0.0, 0.0, 0.0, 1.0),
      new Color(1.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 1.0, 1.0, 1.0),
      new Color(0.0, 0.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
      new Cartesian3(4.0, 2.0, 3.0),
      new Cartesian3(5.0, 2.0, 3.0),
      new Cartesian3(6.0, 2.0, 3.0),
    ];

    const expectedColors = [
      new Color(1.0, 0.0, 0.0, 1.0),
      new Color(1.0, 0.5, 0.0, 1.0),
      new Color(1.0, 1.0, 0.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 1.0, 1.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        colors: colors,
        colorsPerVertex: true,
        width: 10.0,
        vertexFormat: VertexFormat.DEFAULT,
        arcType: ArcType.NONE,
      })
    );

    const numVertices = expectedPositions.length * 4 - 4;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    expect(
      attributeArrayEqualsColorArray(
        line.attributes.color.values,
        expectedColors,
        true
      )
    ).toBe(true);
  });

  it("createGeometry removes first color corresponding to endpoint with duplicate position", function () {
    const positions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
    ];

    const colors = [
      new Color(0.0, 0.0, 0.0, 1.0),
      new Color(1.0, 1.0, 1.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(3.0, 2.0, 3.0),
    ];

    const expectedColors = [
      new Color(1.0, 1.0, 1.0, 1.0),
      new Color(0.0, 1.0, 0.0, 1.0),
      new Color(0.0, 0.0, 1.0, 1.0),
    ];

    const line = PolylineGeometry.createGeometry(
      new PolylineGeometry({
        positions: positions,
        colors: colors,
        colorsPerVertex: true,
        width: 10.0,
        vertexFormat: VertexFormat.DEFAULT,
        arcType: ArcType.NONE,
      })
    );

    const numVertices = expectedPositions.length * 4 - 4;
    expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    expect(
      attributeArrayEqualsColorArray(
        line.attributes.color.values,
        expectedColors,
        true
      )
    ).toBe(true);
  });

  const positions = [
    new Cartesian3(1, 2, 3),
    new Cartesian3(4, 5, 6),
    new Cartesian3(7, 8, 9),
  ];
  let line = new PolylineGeometry({
    positions: positions,
    width: 10.0,
    colors: [Color.RED, Color.LIME, Color.BLUE],
    colorsPerVertex: true,
    arcType: ArcType.NONE,
    granularity: 11,
    vertexFormat: VertexFormat.POSITION_ONLY,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  let packedInstance = [
    3,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    3,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    1,
    0,
    0,
    1,
    1,
    12,
    13,
    14,
    1,
    0,
    0,
    0,
    0,
    0,
    10,
    1,
    0,
    11,
  ];
  createPackableSpecs(
    PolylineGeometry,
    line,
    packedInstance,
    "per vertex colors"
  );

  line = new PolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.NONE,
    granularity: 11,
    vertexFormat: VertexFormat.POSITION_ONLY,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [
    3,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    0,
    12,
    13,
    14,
    1,
    0,
    0,
    0,
    0,
    0,
    10,
    0,
    0,
    11,
  ];
  createPackableSpecs(PolylineGeometry, line, packedInstance, "straight line");

  line = new PolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.GEODESIC,
    granularity: 11,
    vertexFormat: VertexFormat.POSITION_ONLY,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [
    3,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    0,
    12,
    13,
    14,
    1,
    0,
    0,
    0,
    0,
    0,
    10,
    0,
    1,
    11,
  ];
  createPackableSpecs(PolylineGeometry, line, packedInstance, "geodesic line");

  line = new PolylineGeometry({
    positions: positions,
    width: 10.0,
    colorsPerVertex: false,
    arcType: ArcType.RHUMB,
    granularity: 11,
    vertexFormat: VertexFormat.POSITION_ONLY,
    ellipsoid: new Ellipsoid(12, 13, 14),
  });
  packedInstance = [
    3,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    0,
    12,
    13,
    14,
    1,
    0,
    0,
    0,
    0,
    0,
    10,
    0,
    2,
    11,
  ];
  createPackableSpecs(PolylineGeometry, line, packedInstance, "rhumb line");
});
