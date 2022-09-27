import { HeadingPitchRoll, Quaternion } from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("Core/HeadingPitchRoll", function () {
  const deg2rad = CesiumMath.RADIANS_PER_DEGREE;

  it("construct with default values", function () {
    const headingPitchRoll = new HeadingPitchRoll();
    expect(headingPitchRoll.heading).toEqual(0.0);
    expect(headingPitchRoll.pitch).toEqual(0.0);
    expect(headingPitchRoll.roll).toEqual(0.0);
  });

  it("construct with all values", function () {
    const headingPitchRoll = new HeadingPitchRoll(
      1.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
    expect(headingPitchRoll.heading).toEqual(
      1.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
    expect(headingPitchRoll.pitch).toEqual(
      2.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
    expect(headingPitchRoll.roll).toEqual(
      3.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
  });

  it("conversion from quaternion", function () {
    const testingTab = [
      [0, 0, 0],
      [90 * deg2rad, 0, 0],
      [-90 * deg2rad, 0, 0],
      [0, 89 * deg2rad, 0],
      [0, -89 * deg2rad, 0],
      [0, 0, 90 * deg2rad],
      [0, 0, -90 * deg2rad],
      [30 * deg2rad, 30 * deg2rad, 30 * deg2rad],
      [-30 * deg2rad, -30 * deg2rad, 45 * deg2rad],
    ];
    const hpr = new HeadingPitchRoll();
    for (let i = 0; i < testingTab.length; i++) {
      const init = testingTab[i];
      hpr.heading = init[0];
      hpr.pitch = init[1];
      hpr.roll = init[2];

      const result = HeadingPitchRoll.fromQuaternion(
        Quaternion.fromHeadingPitchRoll(hpr)
      );
      expect(init[0]).toEqualEpsilon(result.heading, CesiumMath.EPSILON11);
      expect(init[1]).toEqualEpsilon(result.pitch, CesiumMath.EPSILON11);
      expect(init[2]).toEqualEpsilon(result.roll, CesiumMath.EPSILON11);
    }
  });

  it("it should return the correct pitch, even with a quaternion rounding error", function () {
    const q = new Quaternion(
      8.801218199179452e-17,
      -0.7071067801637715,
      -8.801218315071006e-17,
      -0.7071067822093238
    );
    const result = HeadingPitchRoll.fromQuaternion(q);
    expect(result.pitch).toEqual(-(Math.PI / 2));
  });

  it("conversion from degrees", function () {
    const testingTab = [
      [0, 0, 0],
      [90, 0, 0],
      [-90, 0, 0],
      [0, 89, 0],
      [0, -89, 0],
      [0, 0, 90],
      [0, 0, -90],
      [30, 30, 30],
      [-30, -30, 45],
    ];
    for (let i = 0; i < testingTab.length; i++) {
      const init = testingTab[i];
      const result = HeadingPitchRoll.fromDegrees(init[0], init[1], init[2]);
      expect(init[0] * deg2rad).toEqualEpsilon(
        result.heading,
        CesiumMath.EPSILON11
      );
      expect(init[1] * deg2rad).toEqualEpsilon(
        result.pitch,
        CesiumMath.EPSILON11
      );
      expect(init[2] * deg2rad).toEqualEpsilon(
        result.roll,
        CesiumMath.EPSILON11
      );
    }
  });

  it("fromDegrees with result", function () {
    const headingDeg = -115;
    const pitchDeg = 37;
    const rollDeg = 40;
    const headingRad = headingDeg * deg2rad;
    const pitchRad = pitchDeg * deg2rad;
    const rollRad = rollDeg * deg2rad;
    const result = new HeadingPitchRoll();
    const actual = HeadingPitchRoll.fromDegrees(
      headingDeg,
      pitchDeg,
      rollDeg,
      result
    );
    const expected = new HeadingPitchRoll(headingRad, pitchRad, rollRad);
    expect(actual).toEqual(expected);
    expect(actual).toBe(result);
  });

  it("clone with a result parameter", function () {
    const headingPitchRoll = new HeadingPitchRoll(
      1.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
    const result = new HeadingPitchRoll();
    const returnedResult = HeadingPitchRoll.clone(headingPitchRoll, result);
    expect(headingPitchRoll).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(headingPitchRoll).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const headingPitchRoll = new HeadingPitchRoll(
      1.0 * deg2rad,
      2.0 * deg2rad,
      3.0 * deg2rad
    );
    const returnedResult = HeadingPitchRoll.clone(
      headingPitchRoll,
      headingPitchRoll
    );
    expect(headingPitchRoll).toBe(returnedResult);
  });

  it("equals", function () {
    const headingPitchRoll = new HeadingPitchRoll(1.0, 2.0, 3.0);
    expect(
      HeadingPitchRoll.equals(
        headingPitchRoll,
        new HeadingPitchRoll(1.0, 2.0, 3.0)
      )
    ).toEqual(true);
    expect(
      HeadingPitchRoll.equals(
        headingPitchRoll,
        new HeadingPitchRoll(2.0, 2.0, 3.0)
      )
    ).toEqual(false);
    expect(
      HeadingPitchRoll.equals(
        headingPitchRoll,
        new HeadingPitchRoll(2.0, 1.0, 3.0)
      )
    ).toEqual(false);
    expect(
      HeadingPitchRoll.equals(
        headingPitchRoll,
        new HeadingPitchRoll(1.0, 2.0, 4.0)
      )
    ).toEqual(false);
    expect(HeadingPitchRoll.equals(headingPitchRoll, undefined)).toEqual(false);
  });

  it("equalsEpsilon", function () {
    let headingPitchRoll = new HeadingPitchRoll(1.0, 2.0, 3.0);
    expect(
      headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 3.0), 0.0)
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(2.0, 2.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 3.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(2.0, 2.0, 3.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(1.0, 3.0, 3.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(1.0, 2.0, 4.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(headingPitchRoll.equalsEpsilon(undefined, 1)).toEqual(false);

    headingPitchRoll = new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.0);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.0),
        0.0
      )
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.2, 4000000.0, 5000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.0, 4000000.2, 5000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.2, 4000000.2, 5000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      headingPitchRoll.equalsEpsilon(
        new HeadingPitchRoll(3000000.2, 4000000.2, 5000000.2),
        CesiumMath.EPSILON9
      )
    ).toEqual(false);
    expect(headingPitchRoll.equalsEpsilon(undefined, 1)).toEqual(false);

    expect(
      HeadingPitchRoll.equalsEpsilon(undefined, headingPitchRoll, 1)
    ).toEqual(false);
  });

  it("toString", function () {
    const headingPitchRoll = new HeadingPitchRoll(1.123, 2.345, 6.789);
    expect(headingPitchRoll.toString()).toEqual("(1.123, 2.345, 6.789)");
  });

  it("fromQuaternion throws with no parameter", function () {
    expect(function () {
      HeadingPitchRoll.fromQuaternion();
    }).toThrowDeveloperError();
  });

  const scratchHeadingPitchRoll = new HeadingPitchRoll();

  it("fromDegrees throws with no heading parameter", function () {
    expect(function () {
      HeadingPitchRoll.fromDegrees(undefined, 0, 0, scratchHeadingPitchRoll);
    }).toThrowDeveloperError();
    expect(function () {
      HeadingPitchRoll.fromDegrees(undefined, 0, 0);
    }).toThrowDeveloperError();
  });

  it("fromDegrees throws with no pitch parameter", function () {
    expect(function () {
      HeadingPitchRoll.fromDegrees(0, undefined, 0, scratchHeadingPitchRoll);
    }).toThrowDeveloperError();
    expect(function () {
      HeadingPitchRoll.fromDegrees(0, undefined, 0);
    }).toThrowDeveloperError();
  });

  it("fromDegrees throws with no roll parameter", function () {
    expect(function () {
      HeadingPitchRoll.fromDegrees(0, 0, undefined, scratchHeadingPitchRoll);
    }).toThrowDeveloperError();
    expect(function () {
      HeadingPitchRoll.fromDegrees(0, 0, undefined);
    }).toThrowDeveloperError();
  });
});
