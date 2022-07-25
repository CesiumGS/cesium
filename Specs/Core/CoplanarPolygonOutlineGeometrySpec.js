import {
  Cartesian3,
  CoplanarPolygonOutlineGeometry,
} from "../../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/CoplanarPolygonOutlineGeometry", function () {
  it("throws with no hierarchy", function () {
    expect(function () {
      return new CoplanarPolygonOutlineGeometry();
    }).toThrowDeveloperError();
  });

  it("fromPositions throws without positions", function () {
    expect(function () {
      return CoplanarPolygonOutlineGeometry.fromPositions();
    }).toThrowDeveloperError();
  });

  it("returns undefined with less than 3 unique positions", function () {
    const geometry = CoplanarPolygonOutlineGeometry.createGeometry(
      CoplanarPolygonOutlineGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArrayHeights([
          49.0,
          18.0,
          1000.0,
          49.0,
          18.0,
          5000.0,
          49.0,
          18.0,
          5000.0,
          49.0,
          18.0,
          1000.0,
        ]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("returns undefined when positions are linear", function () {
    const geometry = CoplanarPolygonOutlineGeometry.createGeometry(
      CoplanarPolygonOutlineGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArrayHeights([
          0.0,
          0.0,
          1.0,
          0.0,
          0.0,
          2.0,
          0.0,
          0.0,
          3.0,
        ]),
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returns undefined due to duplicate hierarchy positions", function () {
    const hierarchy = {
      positions: Cartesian3.fromDegreesArray([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
      holes: [
        {
          positions: Cartesian3.fromDegreesArray([
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
          ]),
        },
      ],
    };

    const geometry = CoplanarPolygonOutlineGeometry.createGeometry(
      new CoplanarPolygonOutlineGeometry({ polygonHierarchy: hierarchy })
    );
    expect(geometry).toBeUndefined();
  });

  it("creates positions", function () {
    const geometry = CoplanarPolygonOutlineGeometry.createGeometry(
      CoplanarPolygonOutlineGeometry.fromPositions({
        positions: Cartesian3.fromDegreesArrayHeights([
          -1.0,
          -1.0,
          0.0,
          -1.0,
          0.0,
          1.0,
          -1.0,
          1.0,
          1.0,
          -1.0,
          2.0,
          0.0,
        ]),
      })
    );

    expect(geometry.attributes.position.values.length).toEqual(4 * 3);
    expect(geometry.indices.length).toEqual(4 * 2);
  });

  const positions = Cartesian3.fromDegreesArray([
    -124.0,
    35.0,
    -110.0,
    35.0,
    -110.0,
    40.0,
  ]);
  const holePositions0 = Cartesian3.fromDegreesArray([
    -122.0,
    36.0,
    -122.0,
    39.0,
    -112.0,
    39.0,
  ]);
  const holePositions1 = Cartesian3.fromDegreesArray([
    -120.0,
    36.5,
    -114.0,
    36.5,
    -114.0,
    38.5,
  ]);
  const hierarchy = {
    positions: positions,
    holes: [
      {
        positions: holePositions0,
        holes: [
          {
            positions: holePositions1,
            holes: undefined,
          },
        ],
      },
    ],
  };
  const polygon = new CoplanarPolygonOutlineGeometry({
    polygonHierarchy: hierarchy,
  });
  function addPositions(array, positions) {
    for (let i = 0; i < positions.length; ++i) {
      array.push(positions[i].x, positions[i].y, positions[i].z);
    }
  }
  const packedInstance = [3.0, 1.0];
  addPositions(packedInstance, positions);
  packedInstance.push(3.0, 1.0);
  addPositions(packedInstance, holePositions0);
  packedInstance.push(3.0, 0.0);
  addPositions(packedInstance, holePositions1);
  packedInstance.push(34);

  createPackableSpecs(CoplanarPolygonOutlineGeometry, polygon, packedInstance);
});
