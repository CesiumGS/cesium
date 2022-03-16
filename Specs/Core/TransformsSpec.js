import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { EarthOrientationParameters } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Iau2006XysData } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";

describe("Core/Transforms", function () {
  const negativeX = new Cartesian4(-1, 0, 0, 0);
  const negativeY = new Cartesian4(0, -1, 0, 0);
  const negativeZ = new Cartesian4(0, 0, -1, 0);

  it("eastNorthUpToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );

    const returnedResult = Transforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("eastNorthUpToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = Transforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0
    );

    const result = new Matrix4();
    const returnedResult = Transforms.eastNorthUpToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0
    );

    const returnedResult = Transforms.eastNorthUpToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("eastNorthUpToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = Transforms.eastNorthUpToFixedFrame(
      origin,
      Ellipsoid.WGS84
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northEastDownToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );

    const returnedResult = Transforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeX
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northEastDownToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = Transforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeX
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northEastDownToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0
    );

    const result = new Matrix4();
    const returnedResult = Transforms.northEastDownToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northEastDownToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0
    );

    const returnedResult = Transforms.northEastDownToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northEastDownToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = Transforms.northEastDownToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ
    ); // down
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northUpEastToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );

    const returnedResult = Transforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northUpEastToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = Transforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northUpEastToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0
    );

    const result = new Matrix4();
    const returnedResult = Transforms.northUpEastToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northUpEastToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0
    );

    const returnedResult = Transforms.northUpEastToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeZ
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northUpEastToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = Transforms.northUpEastToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    ); // east
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northWestUpToFixedFrame works without a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );

    const returnedResult = Transforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northWestUpToFixedFrame works with a result parameter", function () {
    const origin = new Cartesian3(1.0, 0.0, 0.0);
    const expectedTranslation = new Cartesian4(
      origin.x,
      origin.y,
      origin.z,
      1.0
    );
    const result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

    const returnedResult = Transforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(result).toBe(returnedResult);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northWestUpToFixedFrame works at the north pole", function () {
    const northPole = new Cartesian3(0.0, 0.0, 1.0);
    const expectedTranslation = new Cartesian4(
      northPole.x,
      northPole.y,
      northPole.z,
      1.0
    );

    const result = new Matrix4();
    const returnedResult = Transforms.northWestUpToFixedFrame(
      northPole,
      Ellipsoid.UNIT_SPHERE,
      result
    );
    expect(returnedResult).toBe(result);
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northWestUpToFixedFrame works at the south pole", function () {
    const southPole = new Cartesian3(0.0, 0.0, -1.0);
    const expectedTranslation = new Cartesian4(
      southPole.x,
      southPole.y,
      southPole.z,
      1.0
    );

    const returnedResult = Transforms.northWestUpToFixedFrame(
      southPole,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      negativeZ
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
    ); // translation
  });

  it("northWestUpToFixedFrame works at the origin", function () {
    const origin = Cartesian3.ZERO;
    const expectedTranslation = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    const returnedResult = Transforms.northWestUpToFixedFrame(
      origin,
      Ellipsoid.UNIT_SPHERE
    );
    expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(
      negativeX
    ); // north
    expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(
      negativeY
    ); // west
    expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    ); // up
    expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(
      expectedTranslation
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
        converter: Transforms.localFrameToFixedFrameGenerator("north", "east"),
        order: ["north", "east", "down"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("north", "west"),
        order: ["north", "west", "up"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("north", "up"),
        order: ["north", "up", "east"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("north", "down"),
        order: ["north", "down", "west"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("south", "east"),
        order: ["south", "east", "up"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("south", "west"),
        order: ["south", "west", "down"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("south", "up"),
        order: ["south", "up", "west"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("south", "down"),
        order: ["south", "down", "east"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("east", "north"),
        order: ["east", "north", "up"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("east", "south"),
        order: ["east", "south", "down"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("east", "up"),
        order: ["east", "up", "south"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("east", "down"),
        order: ["east", "down", "north"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("west", "north"),
        order: ["west", "north", "down"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("west", "south"),
        order: ["west", "south", "up"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("west", "up"),
        order: ["west", "up", "north"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("west", "down"),
        order: ["west", "down", "south"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("up", "north"),
        order: ["up", "north", "west"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("up", "south"),
        order: ["up", "south", "east"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("up", "east"),
        order: ["up", "east", "north"],
      },
      {
        converter: Transforms.localFrameToFixedFrameGenerator("up", "west"),
        order: ["up", "west", "south"],
      },
    ];

    function testAllLocalFrame(classicalENUMatrix, position) {
      const ENUColumn = new Cartesian4();
      const converterColumn = new Cartesian4();
      for (let i = 0; i < converterTab.length; i++) {
        const converterMatrix = converterTab[i].converter(
          position,
          Ellipsoid.UNIT_SPHERE
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
      const classicalEastNorthUpReferential = Transforms.eastNorthUpToFixedFrame(
        cartesian,
        Ellipsoid.UNIT_SPHERE
      );
      testAllLocalFrame(classicalEastNorthUpReferential, cartesian);
    }
  });

  it("abnormal use of localFrameToFixedFrameGenerator", function () {
    function checkDeveloperError(firstAxis, secondAxis) {
      expect(function () {
        Transforms.localFrameToFixedFrameGenerator(firstAxis, secondAxis);
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
      Quaternion.fromHeadingPitchRoll(hpr)
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
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
      Quaternion.fromHeadingPitchRoll(hpr)
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
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
      Quaternion.fromHeadingPitchRoll(hpr)
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      Transforms.eastNorthUpToFixedFrame
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
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
      Quaternion.fromHeadingPitchRoll(hpr)
    );
    const expectedX = Matrix3.getColumn(expectedRotation, 0, new Cartesian3());
    const expectedY = Matrix3.getColumn(expectedRotation, 1, new Cartesian3());
    const expectedZ = Matrix3.getColumn(expectedRotation, 2, new Cartesian3());

    Cartesian3.fromElements(expectedX.z, expectedX.x, expectedX.y, expectedX);
    Cartesian3.fromElements(expectedY.z, expectedY.x, expectedY.y, expectedY);
    Cartesian3.fromElements(expectedZ.z, expectedZ.x, expectedZ.y, expectedZ);

    const result = new Matrix4();
    const returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      Transforms.eastNorthUpToFixedFrame,
      result
    );
    const actualX = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    );
    const actualY = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    );
    const actualZ = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    );
    const actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
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
      Quaternion.fromHeadingPitchRoll(hpr)
    );
    const expectedEast = Matrix3.getColumn(
      expectedRotation,
      0,
      new Cartesian3()
    ); // east
    const expectedNorth = Matrix3.getColumn(
      expectedRotation,
      1,
      new Cartesian3()
    ); // north
    const expectedUp = Matrix3.getColumn(expectedRotation, 2, new Cartesian3()); // up

    Cartesian3.fromElements(
      expectedEast.z,
      expectedEast.x,
      expectedEast.y,
      expectedEast
    );
    Cartesian3.fromElements(
      expectedNorth.z,
      expectedNorth.x,
      expectedNorth.y,
      expectedNorth
    );
    Cartesian3.fromElements(
      expectedUp.z,
      expectedUp.x,
      expectedUp.y,
      expectedUp
    );

    const result = new Matrix4();
    let returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      Transforms.eastNorthUpToFixedFrame,
      result
    );
    let actualEast = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    ); // east
    let actualNorth = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    ); // north
    let actualUp = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    ); // up
    let actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
    );

    expect(returnedResult).toBe(result);
    expect(actualEast).toEqual(expectedEast);
    expect(actualNorth).toEqual(expectedNorth);
    expect(actualUp).toEqual(expectedUp);
    expect(actualTranslation).toEqual(origin);

    const UNEFixedFrameConverter = Transforms.localFrameToFixedFrameGenerator(
      "west",
      "south"
    ); // up north east
    returnedResult = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      UNEFixedFrameConverter,
      result
    );
    actualEast = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 0, new Cartesian4())
    ); // east
    actualEast.y = -actualEast.y;
    actualEast.z = -actualEast.z;
    actualNorth = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 1, new Cartesian4())
    ); // north
    actualNorth.y = -actualNorth.y;
    actualNorth.z = -actualNorth.z;
    actualUp = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 2, new Cartesian4())
    ); // up
    actualUp.y = -actualUp.y;
    actualUp.z = -actualUp.z;
    actualTranslation = Cartesian3.fromCartesian4(
      Matrix4.getColumn(returnedResult, 3, new Cartesian4())
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

    const transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const quaternion = Transforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      Transforms.eastNorthUpToFixedFrame
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

    const transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = Transforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      Transforms.eastNorthUpToFixedFrame,
      result
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

    const transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = Transforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      undefined,
      result
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
    const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "west",
      "south"
    );

    const transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      fixedFrameTransform
    );
    const expected = Matrix4.getMatrix3(transform, new Matrix3());

    const result = new Quaternion();
    const quaternion = Transforms.headingPitchRollQuaternion(
      origin,
      hpr,
      Ellipsoid.UNIT_SPHERE,
      fixedFrameTransform,
      result
    );
    const actual = Matrix3.fromQuaternion(quaternion);
    expect(quaternion).toBe(result);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  it("computeTemeToPseudoFixedMatrix works before noon", function () {
    let time = JulianDate.fromDate(new Date("June 29, 2015 12:00:00 UTC"));
    const t = Transforms.computeTemeToPseudoFixedMatrix(time);

    // rotation matrix determinants are 1.0
    const det =
      t[0] * t[4] * t[8] +
      t[3] * t[7] * t[2] +
      t[6] * t[1] * t[5] -
      t[6] * t[4] * t[2] -
      t[3] * t[1] * t[8] -
      t[0] * t[7] * t[5];
    expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

    // rotation matrix inverses are equal to its transpose
    const t4 = Matrix4.fromRotationTranslation(
      t,
      Cartesian3.ZERO,
      new Matrix4()
    );
    expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
      Matrix4.inverseTransformation(t4, new Matrix4()),
      CesiumMath.EPSILON14
    );

    time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
    const u = Transforms.computeTemeToPseudoFixedMatrix(time);
    const tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
    const uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
    expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
  });

  it("computeTemeToPseudoFixedMatrix works after noon", function () {
    let time = JulianDate.fromDate(new Date("June 29, 2015 12:00:00 UTC"));

    const t = Transforms.computeTemeToPseudoFixedMatrix(time);

    // rotation matrix determinants are 1.0
    const det =
      t[0] * t[4] * t[8] +
      t[3] * t[7] * t[2] +
      t[6] * t[1] * t[5] -
      t[6] * t[4] * t[2] -
      t[3] * t[1] * t[8] -
      t[0] * t[7] * t[5];
    expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

    // rotation matrix inverses are equal to its transpose
    const t4 = Matrix4.fromRotationTranslation(t);
    expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
      Matrix4.inverseTransformation(t4, new Matrix4()),
      CesiumMath.EPSILON14
    );

    time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
    const u = Transforms.computeTemeToPseudoFixedMatrix(time);
    const tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
    const uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
    expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
  });

  it("computeTemeToPseudoFixedMatrix works with a result parameter", function () {
    let time = JulianDate.fromDate(new Date("June 29, 2015 12:00:00 UTC"));

    const resultT = new Matrix3();
    const t = Transforms.computeTemeToPseudoFixedMatrix(time, resultT);
    expect(t).toBe(resultT);

    // rotation matrix determinants are 1.0
    const det =
      t[0] * t[4] * t[8] +
      t[3] * t[7] * t[2] +
      t[6] * t[1] * t[5] -
      t[6] * t[4] * t[2] -
      t[3] * t[1] * t[8] -
      t[0] * t[7] * t[5];
    expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

    // rotation matrix inverses are equal to its transpose
    const t4 = Matrix4.fromRotationTranslation(t);
    expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
      Matrix4.inverseTransformation(t4, new Matrix4()),
      CesiumMath.EPSILON14
    );

    time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
    const resultU = new Matrix3();
    const u = Transforms.computeTemeToPseudoFixedMatrix(time, resultU);
    expect(u).toBe(resultU);
    const tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
    const uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
    expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
  });

  describe("computeIcrfToFixedMatrix", function () {
    function preloadTransformationData(start, stop, eopDescription) {
      Transforms.earthOrientationParameters = new EarthOrientationParameters(
        eopDescription
      );
      Transforms.iau2006XysData = new Iau2006XysData();
      const preloadInterval = new TimeInterval({
        start: start,
        stop: stop,
      });

      return Transforms.preloadIcrfFixed(preloadInterval);
    }

    it("throws if the date parameter is not specified", function () {
      expect(function () {
        Transforms.computeIcrfToFixedMatrix(undefined);
      }).toThrowDeveloperError();

      expect(function () {
        Transforms.computeFixedToIcrfMatrix(undefined);
      }).toThrowDeveloperError();
    });

    it("works with data from STK Components", function () {
      // This data set represents a set of data encompassing the corresponding EOP data below.
      // The rotation data from Components span before and after the EOP data so as to test
      // what happens when we try evaluating at times when we don't have EOP as well as at
      // times where we do.  The samples are not at exact EOP times, in order to test interpolation.
      return Resource.fetchJson(
        "Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json"
      ).then(function (componentsData) {
        const start = JulianDate.fromIso8601(componentsData[0].date);
        const stop = JulianDate.fromIso8601(
          componentsData[componentsData.length - 1].date
        );

        return preloadTransformationData(start, stop, {
          url: "Data/EarthOrientationParameters/EOP-2011-July.json",
        }).then(function () {
          for (let i = 0; i < componentsData.length; ++i) {
            const time = JulianDate.fromIso8601(componentsData[i].date);
            const resultT = new Matrix3();
            const t = Transforms.computeIcrfToFixedMatrix(time, resultT);
            expect(t).toBe(resultT);

            // rotation matrix determinants are 1.0
            const det =
              t[0] * t[4] * t[8] +
              t[3] * t[7] * t[2] +
              t[6] * t[1] * t[5] -
              t[6] * t[4] * t[2] -
              t[3] * t[1] * t[8] -
              t[0] * t[7] * t[5];
            expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

            // rotation matrix inverses are equal to its transpose
            const t4 = Matrix4.fromRotationTranslation(t);
            expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
              Matrix4.inverseTransformation(t4, new Matrix4()),
              CesiumMath.EPSILON14
            );

            const expectedMtx = Matrix3.fromQuaternion(
              Quaternion.conjugate(
                componentsData[i].icrfToFixedQuaternion,
                new Quaternion()
              )
            );
            const testInverse = Matrix3.multiply(
              Matrix3.transpose(t, new Matrix3()),
              expectedMtx,
              new Matrix3()
            );
            const testDiff = new Matrix3();
            for (let k = 0; k < 9; k++) {
              testDiff[k] = t[k] - expectedMtx[k];
            }
            expect(testInverse).toEqualEpsilon(
              Matrix3.IDENTITY,
              CesiumMath.EPSILON14
            );
            expect(testDiff).toEqualEpsilon(
              new Matrix3(),
              CesiumMath.EPSILON14
            );
          }
        });
      });
    });

    it("works with hard-coded data", function () {
      // 2011-07-03 00:00:00 UTC
      let time = new JulianDate(2455745, 43200);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-2011-July.json",
      }).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);
        expect(t).toBe(resultT);

        // rotation matrix determinants are 1.0
        const det =
          t[0] * t[4] * t[8] +
          t[3] * t[7] * t[2] +
          t[6] * t[1] * t[5] -
          t[6] * t[4] * t[2] -
          t[3] * t[1] * t[8] -
          t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        const t4 = Matrix4.fromRotationTranslation(t);
        expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
          Matrix4.inverseTransformation(t4, new Matrix4()),
          CesiumMath.EPSILON14
        );

        time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
        const resultU = new Matrix3();
        const u = Transforms.computeIcrfToFixedMatrix(time, resultU);
        expect(u).toBe(resultU);
        const tAngle = Quaternion.computeAngle(
          Quaternion.fromRotationMatrix(t)
        );
        const uAngle = Quaternion.computeAngle(
          Quaternion.fromRotationMatrix(u)
        );
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);

        // The rotation matrix from STK Components corresponding to the time and data inputs above
        const expectedMtx = new Matrix3(
          0.18264414843630006,
          -0.98317906144315947,
          -0.00021950336420248503,
          0.98317840915224974,
          0.18264428011734501,
          -0.0011325710874539787,
          0.0011536112127187594,
          -0.0000089534866085598909,
          0.99999933455028112
        );

        const testInverse = Matrix3.multiply(
          Matrix3.transpose(t, new Matrix3()),
          expectedMtx,
          new Matrix3()
        );
        const testDiff = new Matrix3();
        for (let i = 0; i < 9; i++) {
          testDiff[i] = t[i] - expectedMtx[i];
        }
        expect(testInverse).toEqualEpsilon(
          Matrix3.IDENTITY,
          CesiumMath.EPSILON14
        );
        expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
      });
    });

    it("works over day boundary", function () {
      const time = new JulianDate(2455745, 86395);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-2011-July.json",
      }).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);

        // The rotation matrix from STK Components corresponding to the time and data inputs above
        const expectedMtx = new Matrix3(
          -0.19073578935932833,
          0.98164138366748721,
          0.00022919174269963536,
          -0.98164073712836186,
          -0.19073592679333939,
          0.0011266944449015753,
          0.0011497249933208494,
          -0.000010082996932331842,
          0.99999933901516791
        );

        const testInverse = Matrix3.multiply(
          Matrix3.transpose(t, new Matrix3()),
          expectedMtx,
          new Matrix3()
        );
        const testDiff = new Matrix3();
        for (let i = 0; i < 9; i++) {
          testDiff[i] = t[i] - expectedMtx[i];
        }
        expect(testInverse).toEqualEpsilon(
          Matrix3.IDENTITY,
          CesiumMath.EPSILON14
        );
        expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
      });
    });

    it("works over day boundary backwards", function () {
      const time = new JulianDate(2455745, 10);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-2011-July.json",
      }).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);

        //The rotation matrix from STK Components corresponding to the time and data inputs above
        const expectedMtx = new Matrix3(
          -0.17489910479510423,
          0.984586338811966,
          0.00021110831245616662,
          -0.98458569065286827,
          -0.17489923190143036,
          0.0011297972845023996,
          0.0011493056536445096,
          -0.00001025368996280683,
          0.99999933949547
        );

        const testInverse = Matrix3.multiply(
          Matrix3.transpose(t, new Matrix3()),
          expectedMtx,
          new Matrix3()
        );
        const testDiff = new Matrix3();
        for (let i = 0; i < 9; i++) {
          testDiff[i] = t[i] - expectedMtx[i];
        }
        expect(testInverse).toEqualEpsilon(
          Matrix3.IDENTITY,
          CesiumMath.EPSILON14
        );
        expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
      });
    });

    it("works with position rotation", function () {
      // GEO Satellite position
      const inertialPos = new Cartesian3(
        -7322101.15395708,
        -41525699.1558387,
        0
      );
      // The following is the value computed by STK Components for the date specified below
      const expectedFixedPos = new Cartesian3(
        39489858.9917795,
        -14783363.192887,
        -8075.05820056297
      );

      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-2011-July.json",
      }).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);

        const result = Matrix3.multiplyByVector(
          t,
          inertialPos,
          new Cartesian3()
        );
        const error = Cartesian3.subtract(
          result,
          expectedFixedPos,
          new Cartesian3()
        );

        // Given the magnitude of the positions involved (1e8)
        // this tolerance represents machine precision
        expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
      });
    });

    it("undefined prior to 1974", function () {
      // 1970 jan 1 0h UTC
      const time = new JulianDate(2440587, 43200);
      // Purposefully do not load EOP!  EOP doesn't make a lot of sense before 1972.
      // Even though we are trying to load the data for 1970,
      // we don't have the data in Cesium to load.
      return preloadTransformationData(
        time,
        JulianDate.addDays(time, 1, new JulianDate())
      ).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);
        // Check that we get undefined, since we don't have ICRF data
        expect(t).toEqual(undefined);
      });
    });

    it("works after 2028", function () {
      // 2030 jan 1 0h UTC
      const time = new JulianDate(2462502, 43200);
      // Purposefully do not load EOP!  EOP doesn't exist yet that far into the future
      // Even though we are trying to load the data for 2030,
      // we don't have the data in Cesium to load.
      return preloadTransformationData(
        time,
        JulianDate.addDays(time, 1, new JulianDate())
      ).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);
        expect(t).toBeDefined();
      });
    });

    it("works without EOP data loaded", function () {
      // GEO Satellite position
      const inertialPos = new Cartesian3(
        -7322101.15395708,
        -41525699.1558387,
        0
      );
      // The following is the value computed by STK Components for the date specified below
      const expectedFixedPos = new Cartesian3(
        39489545.7583001,
        -14784199.9085371,
        -8034.77037239318
      );

      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      return preloadTransformationData(time, time, undefined).then(function () {
        const resultT = new Matrix3();
        const t = Transforms.computeIcrfToFixedMatrix(time, resultT);

        const result = Matrix3.multiplyByVector(
          t,
          inertialPos,
          new Cartesian3()
        );
        const error = Cartesian3.subtract(
          result,
          expectedFixedPos,
          new Cartesian3()
        );

        // Given the magnitude of the positions involved (1e8)
        // this tolerance represents machine precision
        expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
      });
    });

    it("throws a RuntimeError when asked to compute with invalid EOP data", function () {
      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-Invalid.json",
      }).then(function () {
        expect(function () {
          return Transforms.computeIcrfToFixedMatrix(time);
        }).toThrowRuntimeError();
      });
    });

    it("throws a RuntimeError when asked to compute with a missing EOP data file", function () {
      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      return preloadTransformationData(time, time, {
        url: "Data/EarthOrientationParameters/EOP-DoesNotExist.json",
      }).then(function () {
        expect(function () {
          return Transforms.computeIcrfToFixedMatrix(time);
        }).toThrowRuntimeError();
      });
    });

    it("returns undefined before XYS data is loaded.", function () {
      Transforms.earthOrientationParameters = new EarthOrientationParameters();
      Transforms.iau2006XysData = new Iau2006XysData();

      const time = new JulianDate(2455745, 43200);
      expect(Transforms.computeIcrfToFixedMatrix(time)).toBeUndefined();
    });

    it("returns undefined before EOP data is loaded.", function () {
      const time = new JulianDate(2455745, 43200);
      return preloadTransformationData(time, time).then(function () {
        expect(Transforms.computeIcrfToFixedMatrix(time)).toBeDefined();
        Transforms.earthOrientationParameters = new EarthOrientationParameters({
          url: "Data/EarthOrientationParameters/EOP-2011-July.json",
        });
        expect(Transforms.computeIcrfToFixedMatrix(time)).toBeUndefined();
      });
    });
  });

  const width = 1024.0;
  const height = 768.0;
  const perspective = Matrix4.computePerspectiveFieldOfView(
    CesiumMath.toRadians(60.0),
    width / height,
    1.0,
    10.0,
    new Matrix4()
  );
  const vpTransform = Matrix4.computeViewportTransformation(
    {
      width: width,
      height: height,
    },
    0,
    1,
    new Matrix4()
  );

  it("pointToGLWindowCoordinates works at the center", function () {
    const view = Matrix4.fromCamera({
      position: Cartesian3.multiplyByScalar(
        Cartesian3.UNIT_X,
        2.0,
        new Cartesian3()
      ),
      direction: Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      up: Cartesian3.UNIT_Z,
    });
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const returnedResult = Transforms.pointToGLWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO
    );
    expect(returnedResult).toEqual(expected);
  });

  it("pointToGLWindowCoordinates works with a result parameter", function () {
    const view = Matrix4.fromCamera({
      position: Cartesian3.multiplyByScalar(
        Cartesian3.UNIT_X,
        2.0,
        new Cartesian3()
      ),
      direction: Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      up: Cartesian3.UNIT_Z,
    });
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const result = new Cartesian2();
    const returnedResult = Transforms.pointToGLWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
      result
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
    const returnedResult = Transforms.pointToGLWindowCoordinates(
      perspective,
      vpTransform,
      point
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

    const returnedResult = Transforms.pointToGLWindowCoordinates(
      perspective,
      vpTransform,
      point
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("pointToWindowCoordinates works at the center", function () {
    const view = Matrix4.fromCamera({
      position: Cartesian3.multiplyByScalar(
        Cartesian3.UNIT_X,
        2.0,
        new Cartesian3()
      ),
      direction: Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      up: Cartesian3.UNIT_Z,
    });
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const returnedResult = Transforms.pointToWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO
    );
    expect(returnedResult).toEqual(expected);
  });

  it("pointToWindowCoordinates works with a result parameter", function () {
    const view = Matrix4.fromCamera({
      position: Cartesian3.multiplyByScalar(
        Cartesian3.UNIT_X,
        2.0,
        new Cartesian3()
      ),
      direction: Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      up: Cartesian3.UNIT_Z,
    });
    const mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

    const expected = new Cartesian2(width * 0.5, height * 0.5);
    const result = new Cartesian2();
    const returnedResult = Transforms.pointToWindowCoordinates(
      mvpMatrix,
      vpTransform,
      Cartesian3.ZERO,
      result
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
    const returnedResult = Transforms.pointToWindowCoordinates(
      perspective,
      vpTransform,
      point
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

    const returnedResult = Transforms.pointToWindowCoordinates(
      perspective,
      vpTransform,
      point
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
  });

  it("rotationMatrixFromPositionVelocity works without a result parameter", function () {
    let matrix = Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y
    );
    let expected = new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    matrix = Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Z
    );
    expected = new Matrix3(0, 0, 1, 0, -1, 0, 1, 0, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    matrix = Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z
    );
    expected = new Matrix3(0, 1, 0, 0, 0, 1, 1, 0, 0);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("rotationMatrixFromPositionVelocity works with a result parameter", function () {
    const result = new Matrix3();
    Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Ellipsoid.WGS84,
      result
    );
    let expected = new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Z,
      Ellipsoid.WGS84,
      result
    );
    expected = new Matrix3(0, 0, 1, 0, -1, 0, 1, 0, 0);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON14);

    Transforms.rotationMatrixFromPositionVelocity(
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Ellipsoid.WGS84,
      result
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

    const modelMatrix = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      ellipsoid
    );
    const modelMatrix2D = Transforms.basisTo2D(
      projection,
      modelMatrix,
      new Matrix4()
    );

    const translation2D = Cartesian3.fromCartesian4(
      Matrix4.getColumn(modelMatrix2D, 3, new Cartesian4())
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

    const modelMatrix = Transforms.headingPitchRollToFixedFrame(
      origin,
      hpr,
      ellipsoid
    );
    const modelMatrix2D = Transforms.basisTo2D(
      projection,
      modelMatrix,
      new Matrix4()
    );

    const rotation2D = Matrix4.getMatrix3(modelMatrix2D, new Matrix3());

    const enu = Transforms.eastNorthUpToFixedFrame(origin, ellipsoid);
    const enuInverse = Matrix4.inverseTransformation(enu, enu);

    const hprPlusTranslate = Matrix4.multiply(
      enuInverse,
      modelMatrix,
      new Matrix4()
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

  it("wgs84To2DModelMatrix creates a model matrix to transform vertices centered origin to 2D", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const projection = new GeographicProjection(ellipsoid);
    const origin = Cartesian3.fromDegrees(-72.0, 40.0, 100.0, ellipsoid);

    const actual = Transforms.wgs84To2DModelMatrix(
      projection,
      origin,
      new Matrix4()
    );
    const expected = Matrix4.fromTranslation(origin);
    Transforms.basisTo2D(projection, expected, expected);

    const actualRotation = Matrix4.getMatrix3(actual, new Matrix3());
    const expectedRotation = Matrix4.getMatrix3(expected, new Matrix3());
    expect(actualRotation).toEqualEpsilon(
      expectedRotation,
      CesiumMath.EPSILON14
    );

    const fromENU = Transforms.eastNorthUpToFixedFrame(
      origin,
      ellipsoid,
      new Matrix4()
    );
    const toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());
    const toENUTranslation = Matrix4.getTranslation(toENU, new Cartesian4());
    const projectedTranslation = Matrix4.getTranslation(
      expected,
      new Cartesian4()
    );

    const expectedTranslation = new Cartesian4();
    expectedTranslation.x = projectedTranslation.x + toENUTranslation.z;
    expectedTranslation.y = projectedTranslation.y + toENUTranslation.x;
    expectedTranslation.z = projectedTranslation.z + toENUTranslation.y;

    const actualTranslation = Matrix4.getTranslation(actual, new Cartesian4());

    expect(actualTranslation).toEqualEpsilon(
      expectedTranslation,
      CesiumMath.EPSILON14
    );
  });

  it("fixedFrameToHeadingPitchRoll returns heading/pitch/roll from a transform", function () {
    const expected = new HeadingPitchRoll(0.5, 0.6, 0.7);

    let transform = Transforms.eastNorthUpToFixedFrame(
      Cartesian3.fromDegrees(0, 0)
    );
    const transform2 = Matrix4.fromTranslationQuaternionRotationScale(
      new Cartesian3(),
      Quaternion.fromHeadingPitchRoll(expected),
      new Cartesian3(1, 1, 1)
    );
    transform = Matrix4.multiply(transform, transform2, transform2);

    const actual = Transforms.fixedFrameToHeadingPitchRoll(transform);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON10);
  });

  it("fixedFrameToHeadingPitchRoll throws with no transform", function () {
    expect(function () {
      return Transforms.fixedFrameToHeadingPitchRoll();
    }).toThrowDeveloperError();
  });

  it("eastNorthUpToFixedFrame throws without an origin", function () {
    expect(function () {
      Transforms.eastNorthUpToFixedFrame(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("northEastDownToFixedFrame throws without an origin", function () {
    expect(function () {
      Transforms.northEastDownToFixedFrame(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("northWestUpToFixedFrame throws without an origin", function () {
    expect(function () {
      Transforms.northWestUpToFixedFrame(undefined, Ellipsoid.WGS84);
    }).toThrowDeveloperError();
  });

  it("headingPitchRollToFixedFrame throws without an origin", function () {
    expect(function () {
      Transforms.headingPitchRollToFixedFrame(
        undefined,
        new HeadingPitchRoll()
      );
    }).toThrowDeveloperError();
  });

  it("headingPitchRollToFixedFrame throws without a headingPitchRoll", function () {
    expect(function () {
      Transforms.headingPitchRollToFixedFrame(Cartesian3.ZERO, undefined);
    }).toThrowDeveloperError();
  });

  it("computeTemeToPseudoFixedMatrix throws without a date", function () {
    expect(function () {
      Transforms.computeTemeToPseudoFixedMatrix(undefined);
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without modelViewProjectionMatrix", function () {
    expect(function () {
      Transforms.pointToWindowCoordinates(
        undefined,
        Matrix4.IDENTITY,
        Cartesian3.ZERO
      );
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without viewportTransformation", function () {
    expect(function () {
      Transforms.pointToWindowCoordinates(
        Matrix4.IDENTITY,
        undefined,
        Cartesian3.ZERO
      );
    }).toThrowDeveloperError();
  });

  it("pointToWindowCoordinates throws without a point", function () {
    expect(function () {
      Transforms.pointToWindowCoordinates(
        Matrix4.IDENTITY,
        Matrix4.IDENTITY,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without projection", function () {
    expect(function () {
      Transforms.basisTo2D(undefined, Matrix4.IDENTITY, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without matrix", function () {
    expect(function () {
      Transforms.basisTo2D(
        new GeographicProjection(),
        undefined,
        new Matrix4()
      );
    }).toThrowDeveloperError();
  });

  it("basisTo2D throws without result", function () {
    expect(function () {
      Transforms.basisTo2D(
        new GeographicProjection(),
        Matrix4.IDENTITY,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("wgs84To2DModelMatrix throws without projection", function () {
    expect(function () {
      Transforms.wgs84To2DModelMatrix(
        undefined,
        Cartesian3.UNIT_X,
        new Matrix4()
      );
    }).toThrowDeveloperError();
  });

  it("wgs84To2DModelMatrix throws without center", function () {
    expect(function () {
      Transforms.wgs84To2DModelMatrix(
        new GeographicProjection(),
        undefined,
        new Matrix4()
      );
    }).toThrowDeveloperError();
  });

  it("wgs84To2DModelMatrix throws without result", function () {
    expect(function () {
      Transforms.wgs84To2DModelMatrix(
        new GeographicProjection(),
        Cartesian3.UNIT_X,
        undefined
      );
    }).toThrowDeveloperError();
  });
});
