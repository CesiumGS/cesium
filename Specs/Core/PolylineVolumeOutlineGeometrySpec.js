import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { CornerType } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { PolylineVolumeOutlineGeometry } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/PolylineVolumeOutlineGeometry", function () {
  let shape;

  beforeAll(function () {
    shape = [
      new Cartesian2(-100, -100),
      new Cartesian2(100, -100),
      new Cartesian2(100, 100),
      new Cartesian2(-100, 100),
    ];
  });

  it("throws without polyline positions", function () {
    expect(function () {
      return new PolylineVolumeOutlineGeometry({});
    }).toThrowDeveloperError();
  });

  it("throws without shape positions", function () {
    expect(function () {
      return new PolylineVolumeOutlineGeometry({
        polylinePositions: [new Cartesian3()],
      });
    }).toThrowDeveloperError();
  });

  it("createGeometry returnes undefined without 2 unique polyline positions", function () {
    const geometry = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: [new Cartesian3()],
        shapePositions: shape,
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("createGeometry returnes undefined without 3 unique shape positions", function () {
    const geometry = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: [Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
        shapePositions: [
          Cartesian2.UNIT_X,
          Cartesian2.UNIT_X,
          Cartesian2.UNIT_X,
        ],
      })
    );
    expect(geometry).toBeUndefined();
  });

  it("computes positions", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -35.0,
        ]),
        shapePositions: shape,
        cornerType: CornerType.MITERED,
      })
    );

    expect(m.attributes.position.values.length).toEqual(24 * 3); // 6 polyline positions * 4 box positions
    expect(m.indices.length).toEqual(28 * 2); // 4 lines * 5 positions + 4 lines * 2 end caps
  });

  it("computes positions, clockwise shape", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -35.0,
        ]),
        shapePositions: shape.reverse(),
        cornerType: CornerType.MITERED,
      })
    );

    expect(m.attributes.position.values.length).toEqual(24 * 3);
    expect(m.indices.length).toEqual(28 * 2);
  });

  it("computes right turn", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          91.0,
          -31.0,
        ]),
        cornerType: CornerType.MITERED,
        shapePositions: shape,
      })
    );

    expect(m.attributes.position.values.length).toEqual(20 * 3); // (2 ends + 3 corner positions) * 4 box positions
    expect(m.indices.length).toEqual(24 * 2); // 4 lines * 4 positions + 4 lines * 2 end caps
  });

  it("computes left turn", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
        ]),
        cornerType: CornerType.MITERED,
        shapePositions: shape,
      })
    );

    expect(m.attributes.position.values.length).toEqual(20 * 3);
    expect(m.indices.length).toEqual(24 * 2);
  });

  it("computes with rounded corners", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
          89.0,
          -32.0,
        ]),
        cornerType: CornerType.ROUNDED,
        shapePositions: shape,
      })
    );

    const corners = 36 * 4;
    const numVertices = corners + 28; // corners + 7 positions * 4 for shape
    const numLines = corners + 32; // corners + 6 segments * 4 lines per segment + 4 lines * 2 ends
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numLines * 2);
  });

  it("computes with beveled corners", function () {
    const m = PolylineVolumeOutlineGeometry.createGeometry(
      new PolylineVolumeOutlineGeometry({
        polylinePositions: Cartesian3.fromDegreesArray([
          90.0,
          -30.0,
          90.0,
          -31.0,
          89.0,
          -31.0,
          89.0,
          -32.0,
        ]),
        cornerType: CornerType.BEVELED,
        shapePositions: shape,
      })
    );

    expect(m.attributes.position.values.length).toEqual(40 * 3); // 10 positions * 4 for shape
    expect(m.indices.length).toEqual(44 * 2); // 9 segments * 4 lines per segment + 4 lines * 2 ends
  });

  const positions = [
    new Cartesian3(1.0, 0.0, 0.0),
    new Cartesian3(0.0, 1.0, 0.0),
    new Cartesian3(0.0, 0.0, 1.0),
  ];
  const volumeShape = [
    new Cartesian2(0.0, 0.0),
    new Cartesian2(1.0, 0.0),
    new Cartesian2(0.0, 1.0),
  ];
  const volume = new PolylineVolumeOutlineGeometry({
    polylinePositions: positions,
    cornerType: CornerType.BEVELED,
    shapePositions: volumeShape,
    ellipsoid: Ellipsoid.UNIT_SPHERE,
    granularity: 0.1,
  });
  const packedInstance = [
    3.0,
    1.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    1.0,
    3.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    1.0,
    1.0,
    1.0,
    1.0,
    2.0,
    0.1,
  ];
  createPackableSpecs(PolylineVolumeOutlineGeometry, volume, packedInstance);
});
