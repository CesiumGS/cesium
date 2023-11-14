import {
  BoundingSphere,
  Cartesian3,
  Cartesian4,
  Ellipsoid,
  Intersect,
  Matrix3,
  Matrix4,
  Occluder,
  OrientedBoundingBox,
  Plane,
  Quaternion,
  Rectangle,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/OrientedBoundingBox", function () {
  const positions = [
    new Cartesian3(2.0, 0.0, 0.0),
    new Cartesian3(0.0, 3.0, 0.0),
    new Cartesian3(0.0, 0.0, 4.0),
    new Cartesian3(-2.0, 0.0, 0.0),
    new Cartesian3(0.0, -3.0, 0.0),
    new Cartesian3(0.0, 0.0, -4.0),
  ];

  function rotatePositions(positions, axis, angle) {
    const points = [];

    const quaternion = Quaternion.fromAxisAngle(axis, angle);
    const rotation = Matrix3.fromQuaternion(quaternion);

    for (let i = 0; i < positions.length; ++i) {
      points.push(
        Matrix3.multiplyByVector(rotation, positions[i], new Cartesian3())
      );
    }

    return {
      points: points,
      rotation: rotation,
    };
  }

  function translatePositions(positions, translation) {
    const points = [];
    for (let i = 0; i < positions.length; ++i) {
      points.push(Cartesian3.add(translation, positions[i], new Cartesian3()));
    }

    return points;
  }

  it("constructor sets expected default values", function () {
    const box = new OrientedBoundingBox();
    expect(box.center).toEqual(Cartesian3.ZERO);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
  });

  it("fromPoints constructs empty box with undefined positions", function () {
    const box = OrientedBoundingBox.fromPoints(undefined);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints constructs empty box with empty positions", function () {
    const box = OrientedBoundingBox.fromPoints([]);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints correct scale", function () {
    const box = OrientedBoundingBox.fromPoints(positions);
    expect(box.halfAxes).toEqual(
      Matrix3.fromScale(new Cartesian3(2.0, 3.0, 4.0))
    );
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints correct translation", function () {
    const translation = new Cartesian3(10.0, -20.0, 30.0);
    const points = translatePositions(positions, translation);
    const box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqual(
      Matrix3.fromScale(new Cartesian3(2.0, 3.0, 4.0))
    );
    expect(box.center).toEqual(translation);
  });

  it("fromPoints rotation about z", function () {
    const result = rotatePositions(
      positions,
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    const points = result.points;
    const rotation = result.rotation;
    rotation[1] = -rotation[1];
    rotation[3] = -rotation[3];

    const box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByScale(
        rotation,
        new Cartesian3(3.0, 2.0, 4.0),
        new Matrix3()
      ),
      CesiumMath.EPSILON15
    );
    expect(box.center).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
  });

  it("fromPoints rotation about y", function () {
    const result = rotatePositions(
      positions,
      Cartesian3.UNIT_Y,
      CesiumMath.PI_OVER_FOUR
    );
    const points = result.points;
    const rotation = result.rotation;
    rotation[2] = -rotation[2];
    rotation[6] = -rotation[6];

    const box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByScale(
        rotation,
        new Cartesian3(4.0, 3.0, 2.0),
        new Matrix3()
      ),
      CesiumMath.EPSILON15
    );
    expect(box.center).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
  });

  it("fromPoints rotation about x", function () {
    const result = rotatePositions(
      positions,
      Cartesian3.UNIT_X,
      CesiumMath.PI_OVER_FOUR
    );
    const points = result.points;
    const rotation = result.rotation;
    rotation[5] = -rotation[5];
    rotation[7] = -rotation[7];

    const box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByScale(
        rotation,
        new Cartesian3(2.0, 4.0, 3.0),
        new Matrix3()
      ),
      CesiumMath.EPSILON15
    );
    expect(box.center).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
  });

  it("fromPoints rotation and translation", function () {
    const result = rotatePositions(
      positions,
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    let points = result.points;
    const rotation = result.rotation;
    rotation[1] = -rotation[1];
    rotation[3] = -rotation[3];

    const translation = new Cartesian3(-40.0, 20.0, -30.0);
    points = translatePositions(points, translation);

    const box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByScale(
        rotation,
        new Cartesian3(3.0, 2.0, 4.0),
        new Matrix3()
      ),
      CesiumMath.EPSILON14
    );
    expect(box.center).toEqualEpsilon(translation, CesiumMath.EPSILON15);
  });

  it("fromRectangle sets correct default ellipsoid", function () {
    const rectangle = new Rectangle(-0.9, -1.2, 0.5, 0.7);
    const box1 = OrientedBoundingBox.fromRectangle(rectangle, 0.0, 0.0);
    const box2 = OrientedBoundingBox.fromRectangle(
      rectangle,
      0.0,
      0.0,
      Ellipsoid.WGS84
    );

    expect(box1.center).toEqualEpsilon(box2.center, CesiumMath.EPSILON15);

    expect(box1.halfAxes).toEqualEpsilon(box2.halfAxes, CesiumMath.EPSILON15);
  });

  it("fromRectangle sets correct default heights", function () {
    const rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    const box = OrientedBoundingBox.fromRectangle(
      rectangle,
      undefined,
      undefined,
      Ellipsoid.UNIT_SPHERE
    );

    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    const rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle throws without rectangle", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    expect(function () {
      OrientedBoundingBox.fromRectangle(undefined, 0.0, 0.0, ellipsoid);
    }).toThrowDeveloperError();
  });

  it("fromRectangle throws with invalid rectangles", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-1.0, 1.0, 1.0, -1.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-2.0, 2.0, -1.0, 1.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-4.0, -2.0, 4.0, 1.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-2.0, -2.0, 1.0, 2.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-1.0, -2.0, 2.0, 2.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        new Rectangle(-4.0, -1.0, 4.0, 2.0),
        0.0,
        0.0,
        ellipsoid
      );
    }).toThrowDeveloperError();
  });

  it("fromRectangle throws with non-revolution ellipsoids", function () {
    const rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        rectangle,
        0.0,
        0.0,
        new Ellipsoid(1.01, 1.0, 1.01)
      );
    }).toThrowDeveloperError();
    expect(function () {
      return OrientedBoundingBox.fromRectangle(
        rectangle,
        0.0,
        0.0,
        new Ellipsoid(1.0, 1.01, 1.01)
      );
    }).toThrowDeveloperError();
  });

  it("fromRectangle creates an OrientedBoundingBox without a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    const box = OrientedBoundingBox.fromRectangle(
      rectangle,
      0.0,
      0.0,
      ellipsoid
    );

    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    const rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle creates an OrientedBoundingBox with a result parameter", function () {
    const ellipsoid = Ellipsoid.UNIT_SPHERE;
    const rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    const result = new OrientedBoundingBox();
    const box = OrientedBoundingBox.fromRectangle(
      rectangle,
      0.0,
      0.0,
      ellipsoid,
      result
    );
    expect(box).toBe(result);

    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    const rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle for rectangles with heights", function () {
    const d90 = CesiumMath.PI_OVER_TWO;

    let box;

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, 0.0, 0.0, 0.0),
      1.0,
      1.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(2.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, 0.0, 0.0, 0.0),
      -1.0,
      -1.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, 0.0, 0.0, 0.0),
      -1.0,
      1.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 1, 0, 0, 0, 0, 0, 0),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d90, d90, d90),
      0.0,
      1.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 1, 2, 0, 0, 0, 2, 0),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d90, d90, d90),
      -1.0,
      -1.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d90, d90, d90),
      -1.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.5, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 0.5, 1, 0, 0, 0, 1, 0),
      CesiumMath.EPSILON15
    );
  });

  it("fromRectangle for rectangles that span over half the ellipsoid", function () {
    const d90 = CesiumMath.PI_OVER_TWO;
    const d180 = CesiumMath.PI;
    const d135 = (3.0 / 4.0) * CesiumMath.PI;
    const d45 = CesiumMath.PI_OVER_FOUR;
    const onePlusSqrtHalfDivTwo = (1.0 + Math.SQRT1_2) / 2.0;
    const oneMinusOnePlusSqrtHalfDivTwo = 1.0 - onePlusSqrtHalfDivTwo;
    const sqrtTwoMinusOneDivFour = (Math.SQRT2 - 1.0) / 4.0;
    const sqrtTwoPlusOneDivFour = (Math.SQRT2 + 1.0) / 4.0;
    let box;

    // Entire ellipsoid
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, -d90, d180, d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, 0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0),
      CesiumMath.EPSILON15
    );

    // 3/4s of longitude, full latitude
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d135, -d90, d135, d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(oneMinusOnePlusSqrtHalfDivTwo, 0, 0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, onePlusSqrtHalfDivTwo, 1, 0, 0, 0, 1, 0),
      CesiumMath.EPSILON15
    );

    // 3/4s of longitude, 1/2 of latitude centered at equator
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d135, -d45, d135, d45),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(oneMinusOnePlusSqrtHalfDivTwo, 0, 0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, onePlusSqrtHalfDivTwo, 1, 0, 0, 0, Math.SQRT1_2, 0),
      CesiumMath.EPSILON15
    );

    // 3/4s of longitude centered at IDL, 1/2 of latitude centered at equator
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(d180, -d45, d90, d45),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(sqrtTwoMinusOneDivFour, -sqrtTwoMinusOneDivFour, 0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        Math.SQRT1_2,
        0,
        sqrtTwoPlusOneDivFour,
        Math.SQRT1_2,
        0,
        -sqrtTwoPlusOneDivFour,
        0,
        Math.SQRT1_2,
        0.0
      ),
      CesiumMath.EPSILON15
    );

    // Full longitude, 1/2 of latitude centered at equator
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, -d45, d180, d45),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, 0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 1, 1, 0, 0, 0, Math.SQRT1_2, 0),
      CesiumMath.EPSILON15
    );

    // Full longitude, 1/4 of latitude starting from north pole
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, d45, d180, d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, onePlusSqrtHalfDivTwo),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        0,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        0,
        0,
        oneMinusOnePlusSqrtHalfDivTwo,
        0
      ),
      CesiumMath.EPSILON15
    );

    // Full longitude, 1/4 of latitude starting from south pole
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, -d90, d180, -d45),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, -onePlusSqrtHalfDivTwo),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        0,
        0,
        Math.SQRT1_2,
        Math.SQRT1_2,
        0,
        0,
        0,
        oneMinusOnePlusSqrtHalfDivTwo,
        0
      ),
      CesiumMath.EPSILON15
    );

    // Cmpletely on north pole
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, d90, d180, d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, 1),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0),
      CesiumMath.EPSILON15
    );

    // Completely on north pole 2
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d135, d90, d135, d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, 1),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0),
      CesiumMath.EPSILON15
    );

    // Completely on south pole
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d180, -d90, d180, -d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, -1),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0),
      CesiumMath.EPSILON15
    );

    // Completely on south pole 2
    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d135, -d90, d135, -d90),
      0,
      0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0, 0, -1),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0),
      CesiumMath.EPSILON15
    );
  });

  it("fromRectangle for interesting, degenerate, and edge-case rectangles", function () {
    const d45 = CesiumMath.PI_OVER_FOUR;
    const d30 = CesiumMath.PI_OVER_SIX;
    const d90 = CesiumMath.PI_OVER_TWO;
    const d135 = 3 * CesiumMath.PI_OVER_FOUR;
    const d180 = CesiumMath.PI;
    const sqrt3 = Math.sqrt(3.0);

    let box;

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, 0.0, 0.0, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(d180, 0.0, -d180, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(-1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(d180, 0.0, d180, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(-1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, d90, 0.0, d90),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.0, 1.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(Matrix3.ZERO, CesiumMath.EPSILON15);

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, 0.0, d180, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.5, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(-1.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d90, d90, d90),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.5, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0.0, 0.0, 0.5, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d30, d90, d90),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.1875 * sqrt3, 0.0, 0.1875),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, -sqrt3 / 4, (5 * sqrt3) / 16, 1, 0, 0, 0, 3 / 4, 5 / 16),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, -d90, d90, d30),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.1875 * sqrt3, 0.0, -0.1875),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0, sqrt3 / 4, (5 * sqrt3) / 16, 1, 0, 0, 0, 3 / 4, -5 / 16),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, -d30, d180, d90),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.1875 * sqrt3, 0.1875),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(-1, 0, 0, 0, -sqrt3 / 4, (5 * sqrt3) / 16, 0, 3 / 4, 5 / 16),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, -d90, d180, d30),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.0, 0.1875 * sqrt3, -0.1875),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(-1, 0, 0, 0, sqrt3 / 4, (5 * sqrt3) / 16, 0, 3 / 4, -5 / 16),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d45, 0.0, d45, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3((1.0 + Math.SQRT1_2) / 2.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        0.0,
        0.0,
        0.5 * (1.0 - Math.SQRT1_2),
        Math.SQRT1_2,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0
      ),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(d135, 0.0, -d135, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(-(1.0 + Math.SQRT1_2) / 2.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        0.0,
        0.0,
        -0.5 * (1.0 - Math.SQRT1_2),
        -Math.SQRT1_2,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0
      ),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, -d45, 0.0, d45),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3((1.0 + Math.SQRT1_2) / 2.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(
        0.0,
        0.0,
        0.5 * (1.0 - Math.SQRT1_2),
        0.0,
        0.0,
        0.0,
        0.0,
        Math.SQRT1_2,
        0.0
      ),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(-d90, 0.0, d90, 0.0),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.5, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0.0, 0.0, 0.5, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    box = OrientedBoundingBox.fromRectangle(
      new Rectangle(0.0, -d90, 0.0, d90),
      0.0,
      0.0,
      Ellipsoid.UNIT_SPHERE
    );
    expect(box.center).toEqualEpsilon(
      new Cartesian3(0.5, 0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(box.halfAxes).toEqualEpsilon(
      new Matrix3(0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0),
      CesiumMath.EPSILON15
    );
  });

  it("fromTransformation works with a result parameter", function () {
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, 0.4);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const transformation = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const box = new OrientedBoundingBox();
    OrientedBoundingBox.fromTransformation(transformation, box);

    expect(box.center).toEqual(translation);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByUniformScale(
        Matrix4.getMatrix3(transformation, new Matrix3()),
        0.5,
        new Matrix3()
      ),
      CesiumMath.EPSILON14
    );
  });

  it("fromTransformation works without a result parameter", function () {
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, 0.4);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const transformation = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const box = OrientedBoundingBox.fromTransformation(transformation);

    expect(box.center).toEqual(translation);
    expect(box.halfAxes).toEqualEpsilon(
      Matrix3.multiplyByUniformScale(
        Matrix4.getMatrix3(transformation, new Matrix3()),
        0.5,
        new Matrix3()
      ),
      CesiumMath.EPSILON14
    );
  });

  it("fromTransformation works with a transformation that has zero scale", function () {
    const transformation = Matrix4.fromScale(Cartesian3.ZERO);

    const box = OrientedBoundingBox.fromTransformation(transformation);

    expect(box.center).toEqual(Cartesian3.ZERO);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
  });

  it("fromTransformation throws with no transformation parameter", function () {
    expect(function () {
      OrientedBoundingBox.fromTransformation(undefined);
    }).toThrowDeveloperError();
  });

  const intersectPlaneTestCornersEdgesFaces = function (center, axes) {
    const SQRT1_2 = Math.pow(1.0 / 2.0, 1 / 2.0);
    const SQRT3_4 = Math.pow(3.0 / 4.0, 1 / 2.0);

    const box = new OrientedBoundingBox(
      center,
      Matrix3.multiplyByScalar(axes, 0.5, new Matrix3())
    );

    const planeNormXform = function (nx, ny, nz, dist) {
      const n = new Cartesian3(nx, ny, nz);
      const arb = new Cartesian3(357, 924, 258);
      const p0 = Cartesian3.normalize(n, new Cartesian3());
      Cartesian3.multiplyByScalar(p0, -dist, p0);
      const tang = Cartesian3.cross(n, arb, new Cartesian3());
      Cartesian3.normalize(tang, tang);
      const binorm = Cartesian3.cross(n, tang, new Cartesian3());
      Cartesian3.normalize(binorm, binorm);

      Matrix3.multiplyByVector(axes, p0, p0);
      Matrix3.multiplyByVector(axes, tang, tang);
      Matrix3.multiplyByVector(axes, binorm, binorm);
      Cartesian3.cross(tang, binorm, n);
      if (Cartesian3.magnitude(n) === 0) {
        return undefined;
      }
      Cartesian3.normalize(n, n);

      Cartesian3.add(p0, center, p0);
      const d = -Cartesian3.dot(p0, n);
      if (Math.abs(d) > 0.0001 && Cartesian3.magnitudeSquared(n) > 0.0001) {
        return new Plane(n, d);
      }
      return undefined;
    };

    let pl;

    // Tests against faces

    pl = planeNormXform(+1.0, +0.0, +0.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, +0.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, +0.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, +0.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, +0.0, +1.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, +0.0, -1.0, 0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }

    pl = planeNormXform(+1.0, +0.0, +0.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, +0.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, +0.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, +0.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +0.0, +1.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +0.0, -1.0, 0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +0.0, +0.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, +0.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, +0.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, +0.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +0.0, +1.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +0.0, -1.0, -0.49999);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +0.0, +0.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, +0.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, +0.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, +0.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, +0.0, +1.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, +0.0, -1.0, -0.50001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }

    // Tests against edges

    pl = planeNormXform(+1.0, +1.0, +0.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, +0.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, +0.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, +0.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, +0.0, +1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, +0.0, -1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, +1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, -1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, +1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, -1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, +1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, -1.0, SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }

    pl = planeNormXform(+1.0, +1.0, +0.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, +0.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, +0.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, +0.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +0.0, +1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +0.0, -1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, +1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, -1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, +1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, -1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, +1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, -1.0, SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +1.0, +0.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, +0.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, +0.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, +0.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +0.0, +1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +0.0, -1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, +1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +0.0, -1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, +1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, +1.0, -1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, +1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+0.0, -1.0, -1.0, -SQRT1_2 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +1.0, +0.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, +0.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, +0.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, +0.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, +0.0, +1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, +0.0, -1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, +1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +0.0, -1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, +1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, +1.0, -1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, +1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+0.0, -1.0, -1.0, -SQRT1_2 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }

    // Tests against corners

    pl = planeNormXform(+1.0, +1.0, +1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, +1.0, -1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, +1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, -1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, +1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, -1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, +1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, -1.0, SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INSIDE);
    }

    pl = planeNormXform(+1.0, +1.0, +1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +1.0, -1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, +1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, -1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, +1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, -1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, +1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, -1.0, SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +1.0, +1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, +1.0, -1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, +1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(+1.0, -1.0, -1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, +1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, +1.0, -1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, +1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }
    pl = planeNormXform(-1.0, -1.0, -1.0, -SQRT3_4 + 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.INTERSECTING);
    }

    pl = planeNormXform(+1.0, +1.0, +1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, +1.0, -1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, +1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(+1.0, -1.0, -1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, +1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, +1.0, -1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, +1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
    pl = planeNormXform(-1.0, -1.0, -1.0, -SQRT3_4 - 0.00001);
    if (pl) {
      expect(box.intersectPlane(pl)).toEqual(Intersect.OUTSIDE);
    }
  };

  it("intersectPlane works with untransformed box", function () {
    intersectPlaneTestCornersEdgesFaces(Cartesian3.ZERO, Matrix3.IDENTITY);
  });

  it("intersectPlane works with off-center box", function () {
    intersectPlaneTestCornersEdgesFaces(
      new Cartesian3(1.0, 0.0, 0.0),
      Matrix3.IDENTITY
    );
    intersectPlaneTestCornersEdgesFaces(
      new Cartesian3(0.7, -1.8, 12.0),
      Matrix3.IDENTITY
    );
  });

  it("intersectPlane works with rotated box", function () {
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromQuaternion(
        Quaternion.fromAxisAngle(new Cartesian3(0.5, 1.5, -1.2), 1.2),
        new Matrix3()
      )
    );
  });

  it("intersectPlane works with scaled box", function () {
    const m = new Matrix3();
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(1.5, 0.4, 20.6), m)
    );
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(0.0, 0.4, 20.6), m)
    );
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(1.5, 0.0, 20.6), m)
    );
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(1.5, 0.4, 0.0), m)
    );
    intersectPlaneTestCornersEdgesFaces(
      Cartesian3.ZERO,
      Matrix3.fromScale(new Cartesian3(0.0, 0.0, 0.0), m)
    );
  });

  it("intersectPlane works with this arbitrary box", function () {
    const m = Matrix3.fromScale(new Cartesian3(1.5, 80.4, 2.6), new Matrix3());
    const n = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(new Cartesian3(0.5, 1.5, -1.2), 1.2),
      new Matrix3()
    );
    Matrix3.multiply(m, n, n);
    intersectPlaneTestCornersEdgesFaces(new Cartesian3(-5.1, 0.0, 0.1), n);
  });

  it("intersectPlane fails without box parameter", function () {
    const plane = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expect(function () {
      OrientedBoundingBox.intersectPlane(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("intersectPlane fails without plane parameter", function () {
    const box = new OrientedBoundingBox(Cartesian3.IDENTITY, Matrix3.ZERO);
    expect(function () {
      OrientedBoundingBox.intersectPlane(box, undefined);
    }).toThrowDeveloperError();
  });

  it("distanceSquaredTo", function () {
    const r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(-45.0));
    const r1 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    const rotation = Matrix3.multiply(r1, r0, r0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    const xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    const yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    const zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center) - scale.x;
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.x;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from corner point
    Cartesian3.add(xAxis, yAxis, cartesian);
    Cartesian3.add(zAxis, cartesian, cartesian);

    const cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - X", function () {
    const rotation = Matrix3.fromRotationX(CesiumMath.toRadians(45.0));

    const scale = new Cartesian3(0.0, 4.0, 3.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    let xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    const yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    const zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);

    // Since x-axis is degenerate, we define what direction it really would have been
    xAxis = new Cartesian3(1.0, 0.0, 0.0);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center);
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from corner point
    Cartesian3.add(yAxis, zAxis, cartesian);

    const cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - Y", function () {
    const rotation = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    const scale = new Cartesian3(2.0, 0.0, 3.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    const xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    let yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    const zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(yAxis).toEqual(Cartesian3.ZERO);

    // Since y-axis is degenerate, we define what direction it really would have been
    yAxis = new Cartesian3(0.0, 1.0, 0.0);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center) - scale.x;
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.x;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from corner point
    Cartesian3.add(xAxis, zAxis, cartesian);

    const cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - Z", function () {
    const rotation = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));

    const scale = new Cartesian3(2.0, 4.0, 0.0);
    const rotationScale = Matrix3.multiplyByScale(rotation, scale, rotation);

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    const xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    const yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    let zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since z-axis is degenerate, we define what direction it really would have been
    zAxis = new Cartesian3(0.0, 0.0, 1.0);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center) - scale.x;
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.x;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from corner point
    Cartesian3.add(xAxis, yAxis, cartesian);

    const cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - XY", function () {
    const r0 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));
    const r1 = Matrix3.fromRotationX(CesiumMath.toRadians(-45.0));

    const rotation = Matrix3.multiply(r1, r0, r0);
    const scale = new Cartesian3(0.0, 0.0, 3.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    let xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    let yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    const zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(yAxis).toEqual(Cartesian3.ZERO);

    // Since x-, y-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    Matrix3.multiplyByVector(rotation, xAxis, xAxis);
    Matrix3.multiplyByVector(rotation, yAxis, yAxis);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center);
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.z;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in posiive direction
    Cartesian3.clone(zAxis, cartesian);
    let endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in negative direction
    Cartesian3.clone(zAxis, cartesian);
    Cartesian3.multiplyByScalar(cartesian, -1.0, cartesian);
    endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - XZ", function () {
    const r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));
    const r1 = Matrix3.fromRotationX(CesiumMath.toRadians(-45.0));

    const rotation = Matrix3.multiply(r1, r0, r0);
    const scale = new Cartesian3(0.0, 4.0, 0.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    let xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    const yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    let zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since x-, z-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);
    Matrix3.multiplyByVector(rotation, xAxis, xAxis);
    Matrix3.multiplyByVector(rotation, zAxis, zAxis);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center);
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.y;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in positive direction
    Cartesian3.clone(yAxis, cartesian);
    let endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in negative direction
    Cartesian3.clone(yAxis, cartesian);
    Cartesian3.multiplyByScalar(cartesian, -1.0, cartesian);
    endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - YZ", function () {
    const r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));
    const r1 = Matrix3.fromRotationY(CesiumMath.toRadians(-45.0));

    const rotation = Matrix3.multiply(r1, r0, r0);
    const scale = new Cartesian3(2.0, 0.0, 0.0);
    const rotationScale = Matrix3.multiplyByScale(
      rotation,
      scale,
      new Matrix3()
    );

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    const xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    let yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    let zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(yAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since y-, z-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);
    Matrix3.multiplyByVector(rotation, yAxis, yAxis);
    Matrix3.multiplyByVector(rotation, zAxis, zAxis);

    // from positive x direction
    const cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center) - scale.x;
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - scale.x;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in positive direction
    Cartesian3.clone(xAxis, cartesian);
    let endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from endpoint in negative direction   // from endpoint in negative direction
    Cartesian3.clone(xAxis, cartesian);
    Cartesian3.multiplyByScalar(cartesian, -1.0, cartesian);
    endpointDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - endpointDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    const offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles three degenerate axes", function () {
    const scale = new Cartesian3(0.0, 0.0, 0.0);
    const center = new Cartesian3(4.0, 3.0, 2.0);
    const obb = new OrientedBoundingBox(center, scale);

    const halfAxes = obb.halfAxes;
    let xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    let yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    let zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(yAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since all axes are degenerate, we define an arbitrary coordinate system
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);

    // from positive x direction
    let cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    let d = Cartesian3.distance(cartesian, center);
    let expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative x direction
    Cartesian3.multiplyByScalar(xAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative y direction
    Cartesian3.multiplyByScalar(yAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from positive z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from negative z direction
    Cartesian3.multiplyByScalar(zAxis, -2.0, cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // from arbitrary point
    cartesian = new Cartesian3(5.0, 10.0, 15.0);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center);
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    cartesian = center;
    expect(obb.distanceSquaredTo(center)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo throws without box", function () {
    expect(function () {
      OrientedBoundingBox.distanceSquaredTo(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("distanceSquaredTo throws without cartesian", function () {
    expect(function () {
      OrientedBoundingBox.distanceSquaredTo(
        new OrientedBoundingBox(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances", function () {
    const r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(-45.0));
    const r1 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    const rotation = Matrix3.multiply(r1, r0, r0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotationScale = Matrix3.multiplyByScale(rotation, scale, rotation);

    const center = new Cartesian3(4.0, 3.0, 2.0);

    const obb = new OrientedBoundingBox(center, rotationScale);

    const halfAxes = obb.halfAxes;
    const xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    const yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    const zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    // from x direction
    const position = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(position, center, position);

    const direction = Cartesian3.negate(xAxis, new Cartesian3());
    Cartesian3.normalize(direction, direction);

    let d = Cartesian3.distance(position, center);
    let expectedNear = d - scale.x;
    let expectedFar = d + scale.x;

    const distances = obb.computePlaneDistances(position, direction);
    expect(distances.start).toEqualEpsilon(expectedNear, CesiumMath.EPSILON14);
    expect(distances.stop).toEqualEpsilon(expectedFar, CesiumMath.EPSILON14);

    // from y direction
    Cartesian3.multiplyByScalar(yAxis, 2.0, position);
    Cartesian3.add(position, center, position);

    Cartesian3.negate(yAxis, direction);
    Cartesian3.normalize(direction, direction);

    d = Cartesian3.distance(position, center);
    expectedNear = d - scale.y;
    expectedFar = d + scale.y;

    obb.computePlaneDistances(position, direction, distances);
    expect(distances.start).toEqualEpsilon(expectedNear, CesiumMath.EPSILON14);
    expect(distances.stop).toEqualEpsilon(expectedFar, CesiumMath.EPSILON14);

    // from z direction
    Cartesian3.multiplyByScalar(zAxis, 2.0, position);
    Cartesian3.add(position, center, position);

    Cartesian3.negate(zAxis, direction);
    Cartesian3.normalize(direction, direction);

    d = Cartesian3.distance(position, center);
    expectedNear = d - scale.z;
    expectedFar = d + scale.z;

    obb.computePlaneDistances(position, direction, distances);
    expect(distances.start).toEqualEpsilon(expectedNear, CesiumMath.EPSILON14);
    expect(distances.stop).toEqualEpsilon(expectedFar, CesiumMath.EPSILON14);

    // from corner point
    Cartesian3.add(xAxis, yAxis, position);
    Cartesian3.add(zAxis, position, position);

    Cartesian3.negate(position, direction);
    Cartesian3.normalize(direction, direction);

    const cornerDistance = Cartesian3.magnitude(position);
    Cartesian3.add(position, center, position);

    d = Cartesian3.distance(position, center);
    expectedNear = d - cornerDistance;
    expectedFar = d + cornerDistance;

    obb.computePlaneDistances(position, direction, distances);
    expect(distances.start).toEqualEpsilon(expectedNear, CesiumMath.EPSILON14);
    expect(distances.stop).toEqualEpsilon(expectedFar, CesiumMath.EPSILON14);
  });

  it("computePlaneDistances throws without a box", function () {
    expect(function () {
      OrientedBoundingBox.computePlaneDistances(
        undefined,
        new Cartesian3(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances throws without a position", function () {
    expect(function () {
      OrientedBoundingBox.computePlaneDistances(
        new OrientedBoundingBox(),
        undefined,
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("computePlaneDistances throws without a direction", function () {
    expect(function () {
      OrientedBoundingBox.computePlaneDistances(
        new OrientedBoundingBox(),
        new Cartesian3(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("computeCorners works with a result parameter", function () {
    const center = new Cartesian3(1, 2, 3);
    const halfScale = new Cartesian3(1, 2, 3);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const corners = new Array(
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3(),
      new Cartesian3()
    );
    const result = box.computeCorners(corners);

    expect(result[0]).toEqual(new Cartesian3(0, 0, 0));
    expect(result[1]).toEqual(new Cartesian3(0, 0, 6));
    expect(result[2]).toEqual(new Cartesian3(0, 4, 0));
    expect(result[3]).toEqual(new Cartesian3(0, 4, 6));
    expect(result[4]).toEqual(new Cartesian3(2, 0, 0));
    expect(result[5]).toEqual(new Cartesian3(2, 0, 6));
    expect(result[6]).toEqual(new Cartesian3(2, 4, 0));
    expect(result[7]).toEqual(new Cartesian3(2, 4, 6));
    expect(result).toBe(corners);
  });

  it("computeCorners works without a result parameter", function () {
    const center = new Cartesian3(1, 2, 3);
    const halfScale = new Cartesian3(1, 2, 3);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const corners = box.computeCorners();

    expect(corners[0]).toEqual(new Cartesian3(0, 0, 0));
    expect(corners[1]).toEqual(new Cartesian3(0, 0, 6));
    expect(corners[2]).toEqual(new Cartesian3(0, 4, 0));
    expect(corners[3]).toEqual(new Cartesian3(0, 4, 6));
    expect(corners[4]).toEqual(new Cartesian3(2, 0, 0));
    expect(corners[5]).toEqual(new Cartesian3(2, 0, 6));
    expect(corners[6]).toEqual(new Cartesian3(2, 4, 0));
    expect(corners[7]).toEqual(new Cartesian3(2, 4, 6));
  });

  it("computeCorners works with a box that has zero scale", function () {
    const center = new Cartesian3(0, 0, 0);
    const halfScale = new Cartesian3(0, 0, 0);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const corners = box.computeCorners();

    expect(corners[0]).toEqual(Cartesian3.ZERO);
    expect(corners[1]).toEqual(Cartesian3.ZERO);
    expect(corners[2]).toEqual(Cartesian3.ZERO);
    expect(corners[3]).toEqual(Cartesian3.ZERO);
    expect(corners[4]).toEqual(Cartesian3.ZERO);
    expect(corners[5]).toEqual(Cartesian3.ZERO);
    expect(corners[6]).toEqual(Cartesian3.ZERO);
    expect(corners[7]).toEqual(Cartesian3.ZERO);
  });

  it("computeCorners throws with no box parameter", function () {
    expect(function () {
      OrientedBoundingBox.computeCorners();
    }).toThrowDeveloperError();
  });

  it("computeTransformation works with a result parameter", function () {
    const center = new Cartesian3(1, 2, 3);
    const halfScale = new Cartesian3(1, 2, 3);
    const expectedScale = new Cartesian3(2, 4, 6);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const transformation = new Matrix4();
    const result = box.computeTransformation(transformation);

    const extractedTranslation = Matrix4.getTranslation(
      result,
      new Cartesian3()
    );
    const extractedScale = Matrix4.getScale(result, new Cartesian3());

    expect(extractedTranslation).toEqual(center);
    expect(extractedScale).toEqual(expectedScale);
    expect(result).toBe(transformation);
  });

  it("computeTransformation works without a result parameter", function () {
    const center = new Cartesian3(1, 2, 3);
    const halfScale = new Cartesian3(1, 2, 3);
    const expectedScale = new Cartesian3(2, 4, 6);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const transformation = box.computeTransformation();

    const extractedTranslation = Matrix4.getTranslation(
      transformation,
      new Cartesian3()
    );
    const extractedScale = Matrix4.getScale(transformation, new Cartesian3());

    expect(extractedTranslation).toEqual(center);
    expect(extractedScale).toEqual(expectedScale);
  });

  it("computeTransformation works with box that has zero scale", function () {
    const center = new Cartesian3(0, 0, 0);
    const halfScale = new Cartesian3(0, 0, 0);
    const halfAxes = Matrix3.fromScale(halfScale);
    const box = new OrientedBoundingBox(center, halfAxes);

    const expectedTransformation = Matrix4.fromScale(Cartesian3.ZERO);
    const transformation = box.computeTransformation();
    expect(transformation).toEqual(expectedTransformation);
  });

  it("computeTransformation throws with no box parameter", function () {
    expect(function () {
      OrientedBoundingBox.computeTransformation();
    }).toThrowDeveloperError();
  });

  it("isOccluded", function () {
    let occluderSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    let occluder = new Occluder(occluderSphere, Cartesian3.ZERO);

    let radius = 0.25 / Math.sqrt(2.0);
    let halfAxes = Matrix3.multiplyByScale(
      Matrix3.IDENTITY,
      new Cartesian3(radius, radius, radius),
      new Matrix3()
    );
    let obb = new OrientedBoundingBox(new Cartesian3(0, 0, -2.75), halfAxes);
    expect(obb.isOccluded(occluder)).toEqual(true);

    occluderSphere = new BoundingSphere(new Cartesian3(0, 0, -2.75), 0.25);
    occluder = new Occluder(occluderSphere, Cartesian3.ZERO);

    radius = 0.5 / Math.sqrt(2.0);
    halfAxes = Matrix3.multiplyByScale(
      Matrix3.IDENTITY,
      new Cartesian3(radius, radius, radius),
      new Matrix3()
    );
    obb = new OrientedBoundingBox(new Cartesian3(0, 0, -1.5), halfAxes);
    expect(obb.isOccluded(occluder)).toEqual(false);
  });

  it("isOccluded throws without a box", function () {
    expect(function () {
      OrientedBoundingBox.isOccluded(
        undefined,
        new Occluder(new BoundingSphere(), new Cartesian3())
      );
    }).toThrowDeveloperError();
  });

  it("isOccluded throws without a occluder", function () {
    expect(function () {
      OrientedBoundingBox.isOccluded(new OrientedBoundingBox(), undefined);
    }).toThrowDeveloperError();
  });

  it("clone without a result parameter", function () {
    const box = new OrientedBoundingBox();
    const result = OrientedBoundingBox.clone(box);
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
    expect(box.clone()).toEqual(box);
  });

  it("clone with a result parameter", function () {
    const box = new OrientedBoundingBox();
    const box2 = new OrientedBoundingBox();
    const result = new OrientedBoundingBox();
    const returnedResult = OrientedBoundingBox.clone(box, result);
    expect(result).toBe(returnedResult);
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
    expect(box.clone(box2)).toBe(box2);
    expect(box.clone(box2)).toEqual(box2);
  });

  it("clone undefined OBB with a result parameter", function () {
    const box = new OrientedBoundingBox();
    expect(OrientedBoundingBox.clone(undefined, box)).toBe(undefined);
  });

  it("clone undefined OBB without a result parameter", function () {
    expect(OrientedBoundingBox.clone(undefined)).toBe(undefined);
  });

  it("equals works in all cases", function () {
    const box = new OrientedBoundingBox();
    expect(box.equals(new OrientedBoundingBox())).toEqual(true);
    expect(box.equals(undefined)).toEqual(false);
  });

  it("is a rotated/scaled 2x2x2 cube centered at the origin", function () {
    const box = new OrientedBoundingBox(Cartesian3.ZERO, Matrix3.IDENTITY);

    // All corners are 1 unit from the origin in each direction, so the cube is 2x2x2.
    const corners = box.computeCorners();
    for (const corner of corners) {
      expect(Math.abs(corner.x)).toEqual(1.0);
      expect(Math.abs(corner.y)).toEqual(1.0);
      expect(Math.abs(corner.z)).toEqual(1.0);
    }
  });

  createPackableSpecs(
    OrientedBoundingBox,
    new OrientedBoundingBox(new Cartesian3(1.0, 2.0, 3.0), Matrix3.IDENTITY),
    [1.0, 2.0, 3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
  );
});
