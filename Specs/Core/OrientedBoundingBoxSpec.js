import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Occluder } from "../../Source/Cesium.js";
import { OrientedBoundingBox } from "../../Source/Cesium.js";
import { Plane } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import Region from "../../Source/Core/Region.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/OrientedBoundingBox", function () {
  var positions = [
    new Cartesian3(2.0, 0.0, 0.0),
    new Cartesian3(0.0, 3.0, 0.0),
    new Cartesian3(0.0, 0.0, 4.0),
    new Cartesian3(-2.0, 0.0, 0.0),
    new Cartesian3(0.0, -3.0, 0.0),
    new Cartesian3(0.0, 0.0, -4.0),
  ];

  function rotatePositions(positions, axis, angle) {
    var points = [];

    var quaternion = Quaternion.fromAxisAngle(axis, angle);
    var rotation = Matrix3.fromQuaternion(quaternion);

    for (var i = 0; i < positions.length; ++i) {
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
    var points = [];
    for (var i = 0; i < positions.length; ++i) {
      points.push(Cartesian3.add(translation, positions[i], new Cartesian3()));
    }

    return points;
  }

  it("constructor sets expected default values", function () {
    var box = new OrientedBoundingBox();
    expect(box.center).toEqual(Cartesian3.ZERO);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
  });

  it("fromPoints constructs empty box with undefined positions", function () {
    var box = OrientedBoundingBox.fromPoints(undefined);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints constructs empty box with empty positions", function () {
    var box = OrientedBoundingBox.fromPoints([]);
    expect(box.halfAxes).toEqual(Matrix3.ZERO);
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints correct scale", function () {
    var box = OrientedBoundingBox.fromPoints(positions);
    expect(box.halfAxes).toEqual(
      Matrix3.fromScale(new Cartesian3(2.0, 3.0, 4.0))
    );
    expect(box.center).toEqual(Cartesian3.ZERO);
  });

  it("fromPoints correct translation", function () {
    var translation = new Cartesian3(10.0, -20.0, 30.0);
    var points = translatePositions(positions, translation);
    var box = OrientedBoundingBox.fromPoints(points);
    expect(box.halfAxes).toEqual(
      Matrix3.fromScale(new Cartesian3(2.0, 3.0, 4.0))
    );
    expect(box.center).toEqual(translation);
  });

  it("fromPoints rotation about z", function () {
    var result = rotatePositions(
      positions,
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    var points = result.points;
    var rotation = result.rotation;
    rotation[1] = -rotation[1];
    rotation[3] = -rotation[3];

    var box = OrientedBoundingBox.fromPoints(points);
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
    var result = rotatePositions(
      positions,
      Cartesian3.UNIT_Y,
      CesiumMath.PI_OVER_FOUR
    );
    var points = result.points;
    var rotation = result.rotation;
    rotation[2] = -rotation[2];
    rotation[6] = -rotation[6];

    var box = OrientedBoundingBox.fromPoints(points);
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
    var result = rotatePositions(
      positions,
      Cartesian3.UNIT_X,
      CesiumMath.PI_OVER_FOUR
    );
    var points = result.points;
    var rotation = result.rotation;
    rotation[5] = -rotation[5];
    rotation[7] = -rotation[7];

    var box = OrientedBoundingBox.fromPoints(points);
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
    var result = rotatePositions(
      positions,
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    var points = result.points;
    var rotation = result.rotation;
    rotation[1] = -rotation[1];
    rotation[3] = -rotation[3];

    var translation = new Cartesian3(-40.0, 20.0, -30.0);
    points = translatePositions(points, translation);

    var box = OrientedBoundingBox.fromPoints(points);
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
    var rectangle = new Rectangle(-0.9, -1.2, 0.5, 0.7);
    var box1 = OrientedBoundingBox.fromRectangle(rectangle, 0.0, 0.0);
    var box2 = OrientedBoundingBox.fromRectangle(
      rectangle,
      0.0,
      0.0,
      Ellipsoid.WGS84
    );

    expect(box1.center).toEqualEpsilon(box2.center, CesiumMath.EPSILON15);

    expect(box1.halfAxes).toEqualEpsilon(box2.halfAxes, CesiumMath.EPSILON15);
  });

  it("fromRectangle sets correct default heights", function () {
    var rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    var box = OrientedBoundingBox.fromRectangle(
      rectangle,
      undefined,
      undefined,
      Ellipsoid.UNIT_SPHERE
    );

    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    var rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle throws without rectangle", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    expect(function () {
      OrientedBoundingBox.fromRectangle(undefined, 0.0, 0.0, ellipsoid);
    }).toThrowDeveloperError();
  });

  it("fromRectangle throws with invalid rectangles", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
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
    var rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
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
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    var box = OrientedBoundingBox.fromRectangle(rectangle, 0.0, 0.0, ellipsoid);

    expect(box.center).toEqualEpsilon(
      new Cartesian3(1.0, 0.0, 0.0),
      CesiumMath.EPSILON15
    );

    var rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle creates an OrientedBoundingBox with a result parameter", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var rectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
    var result = new OrientedBoundingBox();
    var box = OrientedBoundingBox.fromRectangle(
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

    var rotScale = Matrix3.ZERO;
    expect(box.halfAxes).toEqualEpsilon(rotScale, CesiumMath.EPSILON15);
  });

  it("fromRectangle for rectangles with heights", function () {
    var d90 = CesiumMath.PI_OVER_TWO;

    var box;

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
    var d90 = CesiumMath.PI_OVER_TWO;
    var d180 = CesiumMath.PI;
    var d135 = (3.0 / 4.0) * CesiumMath.PI;
    var d45 = CesiumMath.PI_OVER_FOUR;
    var onePlusSqrtHalfDivTwo = (1.0 + Math.SQRT1_2) / 2.0;
    var oneMinusOnePlusSqrtHalfDivTwo = 1.0 - onePlusSqrtHalfDivTwo;
    var sqrtTwoMinusOneDivFour = (Math.SQRT2 - 1.0) / 4.0;
    var sqrtTwoPlusOneDivFour = (Math.SQRT2 + 1.0) / 4.0;
    var box;

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
    var d45 = CesiumMath.PI_OVER_FOUR;
    var d30 = CesiumMath.PI_OVER_SIX;
    var d90 = CesiumMath.PI_OVER_TWO;
    var d135 = 3 * CesiumMath.PI_OVER_FOUR;
    var d180 = CesiumMath.PI;
    var sqrt3 = Math.sqrt(3.0);

    var box;

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

  it("toRegion produces expected values.", function () {
    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    var boxCenterX = 2.0;
    var boxLen = 1.0;

    var west = Cartographic.fromCartesian(
      Cartesian3.fromElements(boxCenterX - boxLen, -boxLen, 0.0),
      ellipsoid
    );
    var south = Cartographic.fromCartesian(
      Cartesian3.fromElements(boxCenterX - boxLen, 0.0, -boxLen),
      ellipsoid
    );
    var east = Cartographic.fromCartesian(
      Cartesian3.fromElements(boxCenterX - boxLen, +boxLen, 0.0),
      ellipsoid
    );
    var north = Cartographic.fromCartesian(
      Cartesian3.fromElements(boxCenterX - boxLen, 0.0, +boxLen),
      ellipsoid
    );
    var rectangle = new Rectangle(west, south, east, north);
    var minimumHeight = 0.0;
    var maximumHeight = 2.0;

    var orientedBoundingBox = new OrientedBoundingBox(
      new Cartesian3(boxCenterX, 0.0, 0.0),
      new Matrix3(boxLen, 0.0, 0.0, 0.0, boxLen, 0.0, 0.0, 0.0, boxLen)
    );

    var region = OrientedBoundingBox.toRegion(orientedBoundingBox, ellipsoid);

    expect(region.rectangle).toEqual(rectangle);
    expect(region.minimumHeight).toEqual(minimumHeight);
    expect(region.maximumHeight).toEqual(maximumHeight);
  });

  it("toRegion produces region that crosses IDL.", function () {
    var minLon = Cartographic.fromDegrees(-178, 3);
    var minLat = Cartographic.fromDegrees(-179, -4);
    var maxLon = Cartographic.fromDegrees(178, 3);
    var maxLat = Cartographic.fromDegrees(179, 4);

    var orientedBoundingBox = new OrientedBoundingBox(
      new Cartesian3(),
      new Matrix3()
    );

    var region = OrientedBoundingBox.toRegion(
      orientedBoundingBox,
      Ellipsoid.WGS84
    );

    expect(region.rectangle.east).toEqual(minLon.longitude);
    expect(region.rectangle.south).toEqual(minLat.latitude);
    expect(region.rectangle.west).toEqual(maxLon.longitude);
    expect(region.rectangle.north).toEqual(maxLat.latitude);
  });

  it("toRectangle works with a result parameter.", function () {
    var west = -0.1;
    var south = 0.0;
    var east = 0.3;
    var north = 0.2;
    var minimumHeight = 0.0;
    var maximumHeight = 1.0;
    var rectangle = new Rectangle(west, south, east, north);

    var orientedBoundingBox = new OrientedBoundingBox(
      new Cartesian3(),
      new Matrix3()
    );

    var result = new Region();
    var region = OrientedBoundingBox.toRegion(
      orientedBoundingBox,
      Ellipsoid.WGS84,
      result
    );
    expect(region.rectangle).toEqual(rectangle);
    expect(region.minimumHeight).toEqual(minimumHeight);
    expect(region.maximumHeight).toEqual(maximumHeight);
  });

  var intersectPlaneTestCornersEdgesFaces = function (center, axes) {
    var SQRT1_2 = Math.pow(1.0 / 2.0, 1 / 2.0);
    var SQRT3_4 = Math.pow(3.0 / 4.0, 1 / 2.0);

    var box = new OrientedBoundingBox(
      center,
      Matrix3.multiplyByScalar(axes, 0.5, new Matrix3())
    );

    var planeNormXform = function (nx, ny, nz, dist) {
      var n = new Cartesian3(nx, ny, nz);
      var arb = new Cartesian3(357, 924, 258);
      var p0 = Cartesian3.normalize(n, new Cartesian3());
      Cartesian3.multiplyByScalar(p0, -dist, p0);
      var tang = Cartesian3.cross(n, arb, new Cartesian3());
      Cartesian3.normalize(tang, tang);
      var binorm = Cartesian3.cross(n, tang, new Cartesian3());
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
      var d = -Cartesian3.dot(p0, n);
      if (Math.abs(d) > 0.0001 && Cartesian3.magnitudeSquared(n) > 0.0001) {
        return new Plane(n, d);
      }
      return undefined;
    };

    var pl;

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
    var m = new Matrix3();
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
    var m = Matrix3.fromScale(new Cartesian3(1.5, 80.4, 2.6), new Matrix3());
    var n = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(new Cartesian3(0.5, 1.5, -1.2), 1.2),
      new Matrix3()
    );
    Matrix3.multiply(m, n, n);
    intersectPlaneTestCornersEdgesFaces(new Cartesian3(-5.1, 0.0, 0.1), n);
  });

  it("intersectPlane fails without box parameter", function () {
    var plane = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expect(function () {
      OrientedBoundingBox.intersectPlane(undefined, plane);
    }).toThrowDeveloperError();
  });

  it("intersectPlane fails without plane parameter", function () {
    var box = new OrientedBoundingBox(Cartesian3.IDENTITY, Matrix3.ZERO);
    expect(function () {
      OrientedBoundingBox.intersectPlane(box, undefined);
    }).toThrowDeveloperError();
  });

  it("distanceSquaredTo", function () {
    var r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(-45.0));
    var r1 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    var rotation = Matrix3.multiply(r1, r0, r0);
    var scale = new Cartesian3(2.0, 3.0, 4.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center) - scale.x;
    var expected = d * d;
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

    var cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - X", function () {
    var rotation = Matrix3.fromRotationX(CesiumMath.toRadians(45.0));

    var scale = new Cartesian3(0.0, 4.0, 3.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);

    // Since x-axis is degenerate, we define what direction it really would have been
    xAxis = new Cartesian3(1.0, 0.0, 0.0);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center);
    var expected = d * d;
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

    var cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - Y", function () {
    var rotation = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    var scale = new Cartesian3(2.0, 0.0, 3.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(yAxis).toEqual(Cartesian3.ZERO);

    // Since y-axis is degenerate, we define what direction it really would have been
    yAxis = new Cartesian3(0.0, 1.0, 0.0);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center) - scale.x;
    var expected = d * d;
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

    var cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles one degenerate axis - Z", function () {
    var rotation = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));

    var scale = new Cartesian3(2.0, 4.0, 0.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, rotation);

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since z-axis is degenerate, we define what direction it really would have been
    zAxis = new Cartesian3(0.0, 0.0, 1.0);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center) - scale.x;
    var expected = d * d;
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

    var cornerDistance = Cartesian3.magnitude(cartesian);
    Cartesian3.add(cartesian, center, cartesian);

    d = Cartesian3.distance(cartesian, center) - cornerDistance;
    expected = d * d;
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON10
    );

    // inside box
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - XY", function () {
    var r0 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));
    var r1 = Matrix3.fromRotationX(CesiumMath.toRadians(-45.0));

    var rotation = Matrix3.multiply(r1, r0, r0);
    var scale = new Cartesian3(0.0, 0.0, 3.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(yAxis).toEqual(Cartesian3.ZERO);

    // Since x-, y-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    Matrix3.multiplyByVector(rotation, xAxis, xAxis);
    Matrix3.multiplyByVector(rotation, yAxis, yAxis);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center);
    var expected = d * d;
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
    var endpointDistance = Cartesian3.magnitude(cartesian);
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
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - XZ", function () {
    var r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));
    var r1 = Matrix3.fromRotationX(CesiumMath.toRadians(-45.0));

    var rotation = Matrix3.multiply(r1, r0, r0);
    var scale = new Cartesian3(0.0, 4.0, 0.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since x-, z-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);
    Matrix3.multiplyByVector(rotation, xAxis, xAxis);
    Matrix3.multiplyByVector(rotation, zAxis, zAxis);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center);
    var expected = d * d;
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
    var endpointDistance = Cartesian3.magnitude(cartesian);
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
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles two degenerate axes - YZ", function () {
    var r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(45.0));
    var r1 = Matrix3.fromRotationY(CesiumMath.toRadians(-45.0));

    var rotation = Matrix3.multiply(r1, r0, r0);
    var scale = new Cartesian3(2.0, 0.0, 0.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, new Matrix3());

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(yAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since y-, z-axes are degenerate, we define what directions they could be
    // (there are infinite possibilities in this case)
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);
    Matrix3.multiplyByVector(rotation, yAxis, yAxis);
    Matrix3.multiplyByVector(rotation, zAxis, zAxis);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center) - scale.x;
    var expected = d * d;
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
    var endpointDistance = Cartesian3.magnitude(cartesian);
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
    var offset = Cartesian3.multiplyByScalar(scale, 0.25, new Cartesian3());
    Matrix3.multiplyByVector(rotation, offset, offset);
    Cartesian3.add(center, offset, cartesian);
    expect(obb.distanceSquaredTo(cartesian)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON10
    );
  });

  it("distanceSquaredTo handles three degenerate axes", function () {
    var scale = new Cartesian3(0.0, 0.0, 0.0);
    var center = new Cartesian3(4.0, 3.0, 2.0);
    var obb = new OrientedBoundingBox(center, scale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    expect(xAxis).toEqual(Cartesian3.ZERO);
    expect(yAxis).toEqual(Cartesian3.ZERO);
    expect(zAxis).toEqual(Cartesian3.ZERO);

    // Since all axes are degenerate, we define an arbitrary coordinate system
    xAxis = new Cartesian3(1.0, 0.0, 0.0);
    yAxis = new Cartesian3(0.0, 1.0, 0.0);
    zAxis = new Cartesian3(0.0, 0.0, 1.0);

    // from positive x direction
    var cartesian = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(cartesian, center, cartesian);

    var d = Cartesian3.distance(cartesian, center);
    var expected = d * d;
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
    var r0 = Matrix3.fromRotationZ(CesiumMath.toRadians(-45.0));
    var r1 = Matrix3.fromRotationY(CesiumMath.toRadians(45.0));

    var rotation = Matrix3.multiply(r1, r0, r0);
    var scale = new Cartesian3(2.0, 3.0, 4.0);
    var rotationScale = Matrix3.multiplyByScale(rotation, scale, rotation);

    var center = new Cartesian3(4.0, 3.0, 2.0);

    var obb = new OrientedBoundingBox(center, rotationScale);

    var halfAxes = obb.halfAxes;
    var xAxis = Matrix3.getColumn(halfAxes, 0, new Cartesian3());
    var yAxis = Matrix3.getColumn(halfAxes, 1, new Cartesian3());
    var zAxis = Matrix3.getColumn(halfAxes, 2, new Cartesian3());

    // from x direction
    var position = Cartesian3.multiplyByScalar(xAxis, 2.0, new Cartesian3());
    Cartesian3.add(position, center, position);

    var direction = Cartesian3.negate(xAxis, new Cartesian3());
    Cartesian3.normalize(direction, direction);

    var d = Cartesian3.distance(position, center);
    var expectedNear = d - scale.x;
    var expectedFar = d + scale.x;

    var distances = obb.computePlaneDistances(position, direction);
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

    var cornerDistance = Cartesian3.magnitude(position);
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

  it("isOccluded", function () {
    var occluderSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
    var occluder = new Occluder(occluderSphere, Cartesian3.ZERO);

    var radius = 0.25 / Math.sqrt(2.0);
    var halfAxes = Matrix3.multiplyByScale(
      Matrix3.IDENTITY,
      new Cartesian3(radius, radius, radius),
      new Matrix3()
    );
    var obb = new OrientedBoundingBox(new Cartesian3(0, 0, -2.75), halfAxes);
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
    var box = new OrientedBoundingBox();
    var result = OrientedBoundingBox.clone(box);
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
    expect(box.clone()).toEqual(box);
  });

  it("clone with a result parameter", function () {
    var box = new OrientedBoundingBox();
    var box2 = new OrientedBoundingBox();
    var result = new OrientedBoundingBox();
    var returnedResult = OrientedBoundingBox.clone(box, result);
    expect(result).toBe(returnedResult);
    expect(box).not.toBe(result);
    expect(box).toEqual(result);
    expect(box.clone(box2)).toBe(box2);
    expect(box.clone(box2)).toEqual(box2);
  });

  it("clone undefined OBB with a result parameter", function () {
    var box = new OrientedBoundingBox();
    expect(OrientedBoundingBox.clone(undefined, box)).toBe(undefined);
  });

  it("clone undefined OBB without a result parameter", function () {
    expect(OrientedBoundingBox.clone(undefined)).toBe(undefined);
  });

  it("equals works in all cases", function () {
    var box = new OrientedBoundingBox();
    expect(box.equals(new OrientedBoundingBox())).toEqual(true);
    expect(box.equals(undefined)).toEqual(false);
  });

  createPackableSpecs(
    OrientedBoundingBox,
    new OrientedBoundingBox(new Cartesian3(1.0, 2.0, 3.0), Matrix3.IDENTITY),
    [1.0, 2.0, 3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
  );
});
