import {
  arrayRemoveDuplicates,
  Cartesian3,
  Spherical,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/arrayRemoveDuplicates", function () {
  it("removeDuplicates returns positions if none removed - length === 1", function () {
    const positions = [Cartesian3.ZERO];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toBe(positions);
  });

  it("removeDuplicates returns positions if none removed - length > 1", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toBe(positions);
  });

  it("removeDuplicates wrapping returns positions if none removed", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true
    );
    expect(noDuplicates).toBe(positions);
  });

  it("removeDuplicates to remove duplicates", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];
    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates doesn't remove duplicates that are nonadjacent", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];
    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates to remove duplicates with anonymous types", function () {
    const positions = [
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 2.0, y: 2.0, z: 2.0 },
      { x: 3.0, y: 3.0, z: 3.0 },
      { x: 3.0, y: 3.0, z: 3.0 },
    ];
    const expectedPositions = [
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 2.0, y: 2.0, z: 2.0 },
      { x: 3.0, y: 3.0, z: 3.0 },
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates to remove duplicates with Spherical type", function () {
    const positions = [
      new Spherical(1.0, 1.0, 1.0),
      new Spherical(1.0, 1.0, 1.0),
      new Spherical(1.0, 1.0, 1.0),
      new Spherical(1.0, 1.0, 1.0),
      new Spherical(2.0, 2.0, 1.0),
      new Spherical(3.0, 3.0, 1.0),
      new Spherical(3.0, 3.0, 2.0),
    ];
    const expectedPositions = [
      new Spherical(1.0, 1.0, 1.0),
      new Spherical(2.0, 2.0, 1.0),
      new Spherical(3.0, 3.0, 1.0),
      new Spherical(3.0, 3.0, 2.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Spherical.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates works with empty array", function () {
    const positions = [];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(positions);
  });

  it("removeDuplicates to remove positions within absolute epsilon 10", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(1.0, 2.0, 3.0 + CesiumMath.EPSILON10),
    ];
    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 2.0, 3.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates to remove positions within relative epsilon 10", function () {
    const positions = [
      new Cartesian3(0.0, 0.0, 1000000.0),
      new Cartesian3(0.0, 0.0, 3000000.0),
      new Cartesian3(0.0, 0.0, 3000000.0002),
    ];
    const expectedPositions = [
      new Cartesian3(0.0, 0.0, 1000000.0),
      new Cartesian3(0.0, 0.0, 3000000.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates keeps positions that add up past relative epsilon 10", function () {
    const eightyPercentOfEpsilon = 0.8 * CesiumMath.EPSILON10;
    const positions = [
      new Cartesian3(0.0, 0.0, 1.0),
      new Cartesian3(0.0, 0.0, 1.0 + eightyPercentOfEpsilon),
      new Cartesian3(0.0, 0.0, 1.0 + 2 * eightyPercentOfEpsilon),
      new Cartesian3(0.0, 0.0, 1.0 + 3 * eightyPercentOfEpsilon),
    ];
    const expectedPositions = [
      new Cartesian3(0.0, 0.0, 1.0),
      new Cartesian3(0.0, 0.0, 1.0 + 2 * eightyPercentOfEpsilon),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates returns undefined", function () {
    const noDuplicates = arrayRemoveDuplicates(
      undefined,
      Cartesian3.equalsEpsilon
    );
    expect(noDuplicates).toBe(undefined);
  });

  it("removeDuplicates doesn't remove duplicate first and last points without wrapping", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon
    );

    expect(noDuplicates).toBe(positions);
  });

  it("removeDuplicates wrapping removes duplicate first and last points", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true
    );

    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates wrapping removes duplicate including first and last points", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true
    );

    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates wrapping removes string of duplicates at end", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true
    );

    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates wrapping doesn't remove nonadjacent duplicates", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true
    );

    expect(noDuplicates).toEqual(expectedPositions);
  });

  it("removeDuplicates doesn't modify removedIndices when there are no duplicates - length === 1", function () {
    const positions = [Cartesian3.ZERO];

    const removedIndices = [];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      false,
      removedIndices
    );

    expect(noDuplicates).toBe(positions);
    expect(removedIndices).toEqual([]);
  });

  it("removeDuplicates doesn't modify removedIndices when there are no duplicates - length > 1", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];

    const removedIndices = [];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      false,
      removedIndices
    );

    expect(noDuplicates).toBe(positions);
    expect(removedIndices).toEqual([]);
  });

  it("removeDuplicates modifies removedIndices when there are duplicates", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Cartesian3.UNIT_Z,
    ];

    const expectedPositions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];

    const removedIndices = [];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      false,
      removedIndices
    );

    expect(noDuplicates).toEqual(expectedPositions);
    expect(removedIndices).toEqual([2, 5]);
  });

  it("removeDuplicates doesn't modify removedIndices when there are duplicates without wrapping", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const removedIndices = [];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      false,
      removedIndices
    );

    expect(noDuplicates).toBe(positions);
    expect(removedIndices).toEqual([]);
  });

  it("removeDuplicates modifies removedIndices when there are duplicates wrapped around", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Cartesian3.ZERO,
    ];

    const expectedPositions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];

    const removedIndices = [];

    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true,
      removedIndices
    );

    expect(noDuplicates).toEqual(expectedPositions);
    expect(removedIndices).toEqual([4]);
  });

  it("removeDuplicates modifies removedIndices when there are duplicates including wrapped around", function () {
    const positions = [
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Cartesian3.UNIT_Z,
      Cartesian3.ZERO,
    ];

    const expectedPositions = [
      Cartesian3.ZERO,
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];

    const removedIndices = [];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true,
      removedIndices
    );

    expect(noDuplicates).toEqual(expectedPositions);
    expect(removedIndices).toEqual([1, 4, 6, 7]);
  });

  it("removeDuplicates wrapping modifies indicesRemoved with string of duplicates", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const removedIndices = [];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true,
      removedIndices
    );

    expect(noDuplicates).toEqual(expectedPositions);
    expect(removedIndices).toEqual([1, 4, 5, 6, 7, 8]);
  });

  it("removeDuplicates wrapping modifies indicesRemoved with multiple strings of duplicates", function () {
    const positions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(1.0, 1.0, 1.0),
    ];

    const expectedPositions = [
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(2.0, 2.0, 2.0),
      new Cartesian3(3.0, 3.0, 3.0),
      new Cartesian3(1.0, 1.0, 1.0),
      new Cartesian3(3.0, 3.0, 3.0),
    ];

    const removedIndices = [];
    const noDuplicates = arrayRemoveDuplicates(
      positions,
      Cartesian3.equalsEpsilon,
      true,
      removedIndices
    );

    expect(noDuplicates).toEqual(expectedPositions);
    expect(removedIndices).toEqual([1, 4, 6, 7, 9, 10, 11]);
  });
});
