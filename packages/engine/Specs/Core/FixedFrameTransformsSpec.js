import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Ellipsoid,
  GeographicProjection,
  HeadingPitchRoll,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Quaternion,
  FixedFrameTransforms,
} from "../../index.js";

describe("Core/FixedFrameTransforms", function () {
  const negativeX = new Cartesian4(-1, 0, 0, 0);
  const negativeY = new Cartesian4(0, -1, 0, 0);
  const negativeZ = new Cartesian4(0, 0, -1, 0);

  it("eastNorthUpToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("eastNorthUpToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = FixedFrameTransforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0,
    );

    const result = new Matrix4();
    const returnedResult = FixedFrameTransforms.eastNorthUpToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.eastNorthUpToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = FixedFrameTransforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.WGS84,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northEastDownToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeX,
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northEastDownToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = FixedFrameTransforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeX,
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northEastDownToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0,
    );

    const result = new Matrix4();
    const returnedResult = FixedFrameTransforms.northEastDownToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ,
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northEastDownToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northEastDownToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northEastDownToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = FixedFrameTransforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ,
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northUpEastToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northUpEastToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = FixedFrameTransforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northUpEastToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0,
    );

    const result = new Matrix4();
    const returnedResult = FixedFrameTransforms.northUpEastToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northUpEastToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northUpEastToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeZ,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northUpEastToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = FixedFrameTransforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y,
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northWestUpToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY,
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northWestUpToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0,
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = FixedFrameTransforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY,
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northWestUpToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0,
    );

    const result = new Matrix4();
    const returnedResult = FixedFrameTransforms.northWestUpToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result,
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY,
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northWestUpToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0,
    );

    const returnedResult = FixedFrameTransforms.northWestUpToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY,
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("northWestUpToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = FixedFrameTransforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX,
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY,
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z,
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation,
    ); // translation
  });

  it("normal use of localFrameToFixedFrameGenerator", function () {
    const cartesianTab = [
      new Cartesian3(0.0, 0.0, 1.0),
      new Cartesian3(0.0, 0.0, -1.0),
      new Cartesian3(10.0, 20.0, 30.0),
      new Cartesian3(-10.0, -20.0, -30.0),
      new Cartesian3(-25.0, 60.0, -1.0),
      new Cartesian3(9.0, 0.0, -7.0),
    ];

    const converterTab = [
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "north",
          "east",
        ),
        order: ["north", "east", "down"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "north",
          "west",
        ),
        order: ["north", "west", "up"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "north",
          "up",
        ),
        order: ["north", "up", "east"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "north",
          "down",
        ),
        order: ["north", "down", "west"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "south",
          "east",
        ),
        order: ["south", "east", "up"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "south",
          "west",
        ),
        order: ["south", "west", "down"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "south",
          "up",
        ),
        order: ["south", "up", "west"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "south",
          "down",
        ),
        order: ["south", "down", "east"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "east",
          "north",
        ),
        order: ["east", "north", "up"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "east",
          "south",
        ),
        order: ["east", "south", "down"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "east",
          "up",
        ),
        order: ["east", "up", "south"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "east",
          "down",
        ),
        order: ["east", "down", "north"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "west",
          "north",
        ),
        order: ["west", "north", "down"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "west",
          "south",
        ),
        order: ["west", "south", "up"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "west",
          "up",
        ),
        order: ["west", "up", "north"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "west",
          "down",
        ),
        order: ["west", "down", "south"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "up",
          "north",
        ),
        order: ["up", "north", "west"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "up",
          "south",
        ),
        order: ["up", "south", "east"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "up",
          "east",
        ),
        order: ["up", "east", "north"],
      },
      {
        converter: FixedFrameTransforms.localFrameToFixedFrameGenerator(
          "up",
          "west",
        ),
        order: ["up", "west", "south"],
      },
    ];

    function testAllLocalFrame(classicalENUMatrix, position) {
      const ENUColumn = new Cartesian4();
      const converterColumn = new Cartesian4();
      for (let i = 0; i < converterTab.length; i++) {
        const converterMatrix = converterTab[i].converter(
          position,
          Ellipsoid.UNIT_SPHERE,
        );
        const order = converterTab[i].order;
        // check translation
        Matrix4.getColumn(classicalENUMatrix, 3, ENUColumn);
        Matrix4.getColumn(converterMatrix, 3, converterColumn);
        expect(ENUColumn).toEqual(converterColumn);
        // check axis
        for (let j = 0; j < 3; j++) {
          Matrix4.getColumn(converterMatrix, j, converterColumn);
          const axisName = order[j];
          if (axisName === "east") {
            Matrix4.getColumn(classicalENUMatrix, 0, ENUColumn);
          } else if (axisName === "west") {
            Matrix4.getColumn(classicalENUMatrix, 0, ENUColumn);
            Cartesian4.negate(ENUColumn, ENUColumn);
          } else if (axisName === "north") {
            Matrix4.getColumn(classicalENUMatrix, 1, ENUColumn);
          } else if (axisName === "south") {
            Matrix4.getColumn(classicalENUMatrix, 1, ENUColumn);
            Cartesian4.negate(ENUColumn, ENUColumn);
          } else if (axisName === "up") {
            Matrix4.getColumn(classicalENUMatrix, 2, ENUColumn);
          } else if (axisName === "down") {
            Matrix4.getColumn(classicalENUMatrix, 2, ENUColumn);
            Cartesian4.negate(ENUColumn, ENUColumn);
          }
          expect(ENUColumn).toEqual(converterColumn);
        }
      }
    }

    for (let i = 0; i < cartesianTab.length; i++) {
      const cartesian = cartesianTab[i];
      const classicalEastNorthUpReferential =
        FixedFrameTransforms.eastNorthUpToFixedFrame(
          cartesian,
          Ellipsoid.UNIT_SPHERE,
        );
      testAllLocalFrame(classicalEastNorthUpReferential, cartesian);
    }
  });

  it("abnormal use of localFrameToFixedFrameGenerator", function () {
    function checkDeveloperError(firstAxis, secondAxis) {
      expect(function () {
        FixedFrameTransforms.localFrameToFixedFrameGenerator(
          firstAxis,
          secondAxis,
        );
      }).toThrowDeveloperError();
    }

    checkDeveloperError(undefined, undefined);
    checkDeveloperError("north", undefined);
    checkDeveloperError(undefined, "north");
    checkDeveloperError("south", undefined);
    checkDeveloperError("northe", "southe");

    checkDeveloperError("north", "north");
    checkDeveloperError("north", "south");
    checkDeveloperError("south", "north");
    checkDeveloperError("south", "south");

    checkDeveloperError("up", "up");
    checkDeveloperError("up", "down");
    checkDeveloperError("down", "up");
    checkDeveloperError("down", "down");

    checkDeveloperError("east", "east");
    checkDeveloperError("east", "west");
    checkDeveloperError("west", "east");
    checkDeveloperError("west", "west");
  });

  it("headingPitchRollToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const expectedRotation = Matrix3.fromQuaternion(
      Quaternion.fromHeadingPitchRoll(hpr),
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(actualX).toEqual(expectedX);
    expect(actualY).toEqual(expectedY);
    expect(actualZ).toEqual(expectedZ);
    expect(actualTranslation).toEqual(origin);
  });

  it("headingPitchRollToFixedFrame works with a HeadingPitchRoll object and without a result parameter and a fixedFrameTransform", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const expectedRotation = Matrix3.fromQuaternion(
      Quaternion.fromHeadingPitchRoll(hpr),
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(actualX).toEqual(expectedX);
    expect(actualY).toEqual(expectedY);
    expect(actualZ).toEqual(expectedZ);
    expect(actualTranslation).toEqual(origin);
  });

  it("headingPitchRollToFixedFrame works with a HeadingPitchRoll object and without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const expectedRotation = Matrix3.fromQuaternion(
      Quaternion.fromHeadingPitchRoll(hpr),
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      FixedFrameTransforms.eastNorthUpToFixedFrame,
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(actualX).toEqual(expectedX);
    expect(actualY).toEqual(expectedY);
    expect(actualZ).toEqual(expectedZ);
    expect(actualTranslation).toEqual(origin);
  });

  it("headingPitchRollToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const expectedRotation = Matrix3.fromQuaternion(
      Quaternion.fromHeadingPitchRoll(hpr),
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const result = new Matrix4();
    const returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      FixedFrameTransforms.eastNorthUpToFixedFrame,
      result,
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(returnedResult).toBe(result);
    expect(actualX).toEqual(expectedX);
    expect(actualY).toEqual(expectedY);
    expect(actualZ).toEqual(expectedZ);
    expect(actualTranslation).toEqual(origin);
  });

  it("headingPitchRollToFixedFrame works with a custom fixedFrameTransform", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const expectedRotation = Matrix3.fromQuaternion(
      Quaternion.fromHeadingPitchRoll(hpr),
    );
    const expectedEast = Matrix3.getColumn(
      expectedRotation,
      0,
      new Cartesian3(),
    ); // east
    const expectedNorth = Matrix3.getColumn(
      expectedRotation,
      1,
      new Cartesian3(),
    ); // north
    const expectedUp = Matrix3.getColumn(expectedRotation, 2, new Cartesian3()); // up

    Cartesian3.fromElements(
      expectedEast.z,
      expectedEast.x,
      expectedEast.y,
      expectedEast,
    );
    Cartesian3.fromElements(
      expectedNorth.z,
      expectedNorth.x,
      expectedNorth.y,
      expectedNorth,
    );
    Cartesian3.fromElements(
      expectedUp.z,
      expectedUp.x,
      expectedUp.y,
      expectedUp,
    );

    const result = new Matrix4();
    let returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      FixedFrameTransforms.eastNorthUpToFixedFrame,
      result,
    );
    let actualEast = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    ); // east
    let actualNorth = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    ); // north
    let actualUp = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    ); // up
    let actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(returnedResult).toBe(result);
    expect(actualEast).toEqual(expectedEast);
    expect(actualNorth).toEqual(expectedNorth);
    expect(actualUp).toEqual(expectedUp);
    expect(actualTranslation).toEqual(origin);

    const UNEFixedFrameConverter =
      FixedFrameTransforms.localFrameToFixedFrameGenerator("west", "south"); // up north east
    returnedResult = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      UNEFixedFrameConverter,
      result,
    );
    actualEast = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4()),
    ); // east
    actualEast.y = -actualEast.y;
    actualEast.z = -actualEast.z;
    actualNorth = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4()),
    ); // north
    actualNorth.y = -actualNorth.y;
    actualNorth.z = -actualNorth.z;
    actualUp = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4()),
    ); // up
    actualUp.y = -actualUp.y;
    actualUp.z = -actualUp.z;
    actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4()),
    );

    expect(returnedResult).toBe(result);
    expect(actualEast).toEqual(expectedEast);
    expect(actualNorth).toEqual(expectedNorth);
    expect(actualUp).toEqual(expectedUp);
    expect(actualTranslation).toEqual(origin);
  });

  it("headingPitchRollQuaternion works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const transform = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const quaternion = FixedFrameTransforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      FixedFrameTransforms.eastNorthUpToFixedFrame,
    );
    const actual = Matrix3.fromQuaternion(quaternion);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  it("headingPitchRollQuaternion works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const transform = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = FixedFrameTransforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      FixedFrameTransforms.eastNorthUpToFixedFrame,
      result,
    );
    const actual = Matrix3.fromQuaternion(quaternion);
    expect(quaternion).toBe(result);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  it("headingPitchRollQuaternion works without a custom fixedFrameTransform", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const transform = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = FixedFrameTransforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      undefined,
      result,
    );
    const actual = Matrix3.fromQuaternion(quaternion);
    expect(quaternion).toBe(result);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  it("headingPitchRollQuaternion works with a custom fixedFrameTransform", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const heading = CesiumMath.toRadians(20.0);
    const pitch = CesiumMath.toRadians(30.0);
    const roll = CesiumMath.toRadians(40.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);
    const fixedFrameTransform =
      FixedFrameTransforms.localFrameToFixedFrameGenerator("west", "south");

    const transform = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      fixedFrameTransform,
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = FixedFrameTransforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      fixedFrameTransform,
      result,
    );
    const actual = Matrix3.fromQuaternion(quaternion);
    expect(quaternion).toBe(result);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  const width = 1024.0;
  const height = 768.0;
  const perspective = Matrix4.computePerspectiveFieldOfView(
    CesiumMath.toRadians(60.0),
    width / height,
    1.0,
    10.0,
    new Matrix4(),
  );
  const vpTransform = Matrix4.computeViewportTransformation(
    {
      width: width,
      height: height,
    },
    0,
    1,
    new Matrix4(),
  );

  it("pointToGLWindowCoordinates works at the center", function () {
    // View matrix looking from X=2 back to the origin
    const view = new Matrix4(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, -2, 0, 0, 0, 1);
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const returnedResult = FixedFrameTransforms.pointToGLWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
    );
    expect(returnedResult).toEqual(expected);
  });

  it("pointToGLWindowCoordinates works with a result parameter", function () {
    // View matrix looking from X=2 back to the origin
    const view = new Matrix4(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, -2, 0, 0, 0, 1);
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const result = new Cartesian2();
    const returnedResult = FixedFrameTransforms.pointToGLWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });

  it("pointToGLWindowCoordinates works at the lower left", function () {
    const z =
      -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
    const x = z / perspective[Matrix4.COLUMN0ROW0];
    const y = z / perspective[Matrix4.COLUMN1ROW1];
    const point = new Cartesian3(x, y, z);

    const expected = new Cartesian2(0.0, 0.0);
    const returnedResult = FixedFrameTransforms.pointToGLWindowCoordinates(
      perspective,
      vpTransform,
      point,
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("pointToGLWindowCoordinates works at the upper right", function () {
    const z =
      -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
    const x = -z / perspective[Matrix4.COLUMN0ROW0];
    const y = -z / perspective[Matrix4.COLUMN1ROW1];
    const point = new Cartesian3(x, y, z);
    const expected = new Cartesian2(width, height);

    const returnedResult = FixedFrameTransforms.pointToGLWindowCoordinates(
      perspective,
      vpTransform,
      point,
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("pointToWindowCoordinates works at the center", function () {
    // View matrix looking from X=2 back to the origin
    const view = new Matrix4(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, -2, 0, 0, 0, 1);
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const returnedResult = FixedFrameTransforms.pointToWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
    );
    expect(returnedResult).toEqual(expected);
  });

  it("pointToWindowCoordinates works with a result parameter", function () {
    // View matrix looking from X=2 back to the origin
    const view = new Matrix4(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, -2, 0, 0, 0, 1);
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const result = new Cartesian2();
    const returnedResult = FixedFrameTransforms.pointToWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
      result,
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });

  it("pointToWindowCoordinates works at the lower left", function () {
    const z =
      -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
    const x = z / perspective[Matrix4.COLUMN0ROW0];
    const y = z / perspective[Matrix4.COLUMN1ROW1];
    const point = new Cartesian3(x, y, z);

    const expected = new Cartesian2(0.0, height);
    const returnedResult = FixedFrameTransforms.pointToWindowCoordinates(
      perspective,
      vpTransform,
      point,
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("pointToWindowCoordinates works at the upper right", function () {
    const z =
      -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
    const x = -z / perspective[Matrix4.COLUMN0ROW0];
    const y = -z / perspective[Matrix4.COLUMN1ROW1];
    const point = new Cartesian3(x, y, z);
    const expected = new Cartesian2(width, 0.0);

    const returnedResult = FixedFrameTransforms.pointToWindowCoordinates(
      perspective,
      vpTransform,
      point,
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("rotationMatrixFromPositionVelocity works without a result parameter", function () {
    let matrix = FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
    );
    let expected = new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    matrix = FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Z,
    );
    expected = new Matrix3(0, 0, 1, 0, -1, 0, 1, 0, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    matrix = FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    );
    expected = new Matrix3(0, 1, 0, 0, 0, 1, 1, 0, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("rotationMatrixFromPositionVelocity works with a result parameter", function () {
    const result = new Matrix3();
    FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Ellipsoid.WGS84,
      result,
    );
    let expected = new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Z,
      Ellipsoid.WGS84,
      result,
    );
    expected = new Matrix3(0, 0, 1, 0, -1, 0, 1, 0, 0);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    FixedFrameTransforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Ellipsoid.WGS84,
      result,
    );
    expected = new Matrix3(0, 1, 0, 0, 0, 1, 1, 0, 0);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("basisTo2D projects translation", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const projection = new GeographicProjection(ellipsoid);
    const origin = Cartesian3.fromDegrees(-72.0, 40.0, 100.0, ellipsoid);
    const heading = CesiumMath.toRadians(90.0);
    const pitch = CesiumMath.toRadians(45.0);
    const roll = 0.0;
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const modelMatrix = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      ellipsoid,
    );
    const modelMatrix2D = FixedFrameTransforms.basisTo2D(
      projection,
      modelMatrix,
      new Matrix4(),
    );

    const translation2D = Cartesian3.fromCartesian4(
      Matrix4.getColumn(modelMatrix2D, 3, new Cartesian4()),
    );

    const carto = ellipsoid.cartesianToCartographic(origin);
    const expected = projection.project(carto);
    Cartesian3.fromElements(expected.z, expected.x, expected.y, expected);

    expect(translation2D).toEqual(expected);
  });

  it("basisTo2D transforms rotation", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const projection = new GeographicProjection(ellipsoid);
    const origin = Cartesian3.fromDegrees(-72.0, 40.0, 100.0, ellipsoid);
    const heading = CesiumMath.toRadians(90.0);
    const pitch = CesiumMath.toRadians(45.0);
    const roll = 0.0;
    const hpr = new HeadingPitchRoll(heading, pitch, roll);

    const modelMatrix = FixedFrameTransforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      ellipsoid,
    );
    const modelMatrix2D = FixedFrameTransforms.basisTo2D(
      projection,
      modelMatrix,
      new Matrix4(),
    );

    const rotation2D = Matrix4.getMatrix3(modelMatrix2D, new Matrix3());

    const enu = FixedFrameTransforms.eastNorthUpToFixedFrame(origin, ellipsoid);
    const enuInverse = Matrix4.inverseTransformation(enu, enu);

    const hprPlusTranslate = Matrix4.multiply(
      enuInverse,
      modelMatrix,
      new Matrix4(),
    );
    const hpr2 = Matrix4.getMatrix3(hprPlusTranslate, new Matrix3());

    const row0 = Matrix3.getRow(hpr2, 0, new Cartesian3());
    const row1 = Matrix3.getRow(hpr2, 1, new Cartesian3());
    const row2 = Matrix3.getRow(hpr2, 2, new Cartesian3());

    const expected = new Matrix3();
    Matrix3.setRow(expected, 0, row2, expected);
    Matrix3.setRow(expected, 1, row0, expected);
    Matrix3.setRow(expected, 2, row1, expected);

    expect(rotation2D).toEqualEpsilon(expected, CesiumMath.EPSILON3);
  });

  it("ellipsoidTo2DModelMatrix creates a model matrix to transform vertices centered origin to 2D", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const projection = new GeographicProjection(ellipsoid);
    const origin = Cartesian3.fromDegrees(-72.0, 40.0, 100.0, ellipsoid);

    const actual = FixedFrameTransforms.ellipsoidTo2DModelMatrix(
      projection,
      origin,
      new Matrix4(),
    );
    const expected = Matrix4.fromTranslation(origin);
    FixedFrameTransforms.basisTo2D(projection, expected, expected);

    const actualRotation = Matrix4.getMatrix3(actual, new Matrix3());
    const expectedRotation = Matrix4.getMatrix3(expected, new Matrix3());
    expect(actualRotation).toEqualEpsilon(
      expectedRotation,
      CesiumMath.EPSILON14,
    );

    const fromENU = FixedFrameTransforms.eastNorthUpToFixedFrame(
      origin,
      ellipsoid,
      new Matrix4(),
    );
    const toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());
    const toENUTranslation = Matrix4.getTranslation(toENU, new Cartesian4());
    const projectedTranslation = Matrix4.getTranslation(
      expected,
      new Cartesian4(),
    );

    const expectedTranslation = new Cartesian4();
    expectedTranslation.x = projectedTranslation.x + toENUTranslation.z;
    expectedTranslation.y = projectedTranslation.y + toENUTranslation.x;
    expectedTranslation.z = projectedTranslation.z + toENUTranslation.y;

    const actualTranslation = Matrix4.getTranslation(actual, new Cartesian4());

    expect(actualTranslation).toEqualEpsilon(
      expectedTranslation,
      CesiumMath.EPSILON14,
    );
  });

  it("fixedFrameToHeadingPitchRoll returns heading/pitch/roll from a transform", function () {
    const expected = new HeadingPitchRoll(0.5, 0.6, 0.7);

    let transform = FixedFrameTransforms.eastNorthUpToFixedFrame(
      Cartesian3.fromDegrees(0, 0),
    );
    const transform2 = Matrix4.fromTranslationQuaternionRotationScale(
      new Cartesian3(),
      Quaternion.fromHeadingPitchRoll(expected),
      new Cartesian3(1, 1, 1),
    );
    transform = Matrix4.multiply(transform, transform2, transform2);

    const actual = FixedFrameTransforms.fixedFrameToHeadingPitchRoll(transform);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON10);
  });

  it("fixedFrameToHeadingPitchRoll throws with no transform", function () {
    expect(function () {
      return FixedFrameTransforms.fixedFrameToHeadingPitchRoll();
    }).toThrowDeveloperError();
  });

  it("eastNorthUpToFixedFrame throws without an origin", function () {
    expect(function () {
      FixedFrameTransforms.eastNorthUpToFixedFrame(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("northEastDownToFixedFrame throws without an origin", function () {
    expect(function () {
      FixedFrameTransforms.northEastDownToFixedFrame(
        undefined,
        Ellipsoid.WGS84,
      );
    }).toThrowDeveloperError();
  });

  it("northWestUpToFixedFrame throws without an origin", function () {
    expect(function () {
      FixedFrameTransforms.northWestUpToFixedFrame(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("headingPitchRollToFixedFrame throws without an origin", function () {
    expect(function () {
      FixedFrameTransforms.headingPitchRollToFixedFrame(
        undefined,
        new HeadingPitchRoll(),
      );
    }).toThrowDeveloperError();
  });

  it("headingPitchRollToFixedFrame throws without a headingPitchRoll", function () {
    expect(function () {
      FixedFrameTransforms.headingPitchRollToFixedFrame(
        Cartesian3.ZERO,
        undefined,
      );
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without modelViewProjectionMatrix", function () {
    expect(function () {
      FixedFrameTransforms.pointToWindowCoordinates(
        undefined,
        Matrix4.IDENTITY,
        Cartesian3.ZERO,
      );
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without viewportTransformation", function () {
    expect(function () {
      FixedFrameTransforms.pointToWindowCoordinates(
        Matrix4.IDENTITY,
        undefined,
        Cartesian3.ZERO,
      );
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without a point", function () {
    expect(function () {
      FixedFrameTransforms.pointToWindowCoordinates(
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
        undefined,
      );
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without projection", function () {
    expect(function () {
      FixedFrameTransforms.basisTo2D(
        undefined,
        Matrix4.IDENTITY,
        new Matrix4(),
      );
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without matrix", function () {
    expect(function () {
      FixedFrameTransforms.basisTo2D(
        new GeographicProjection(),
        undefined,
        new Matrix4(),
      );
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without result", function () {
    expect(function () {
      FixedFrameTransforms.basisTo2D(
        new GeographicProjection(),
        Matrix4.IDENTITY,
        undefined,
      );
    }).toThrowDeveloperError();
  });

  it("ellipsoidTo2DModelMatrix throws without projection", function () {
    expect(function () {
      FixedFrameTransforms.ellipsoidTo2DModelMatrix(
        undefined,
        Cartesian3.UNIT_X,
        new Matrix4(),
      );
    }).toThrowDeveloperError();
  });

  it("ellipsoidTo2DModelMatrix throws without center", function () {
    expect(function () {
      FixedFrameTransforms.ellipsoidTo2DModelMatrix(
        new GeographicProjection(),
        undefined,
        new Matrix4(),
      );
    }).toThrowDeveloperError();
  });

  it("ellipsoidTo2DModelMatrix throws without result", function () {
    expect(function () {
      FixedFrameTransforms.ellipsoidTo2DModelMatrix(
        new GeographicProjection(),
        Cartesian3.UNIT_X,
        undefined,
      );
    }).toThrowDeveloperError();
  });
});
