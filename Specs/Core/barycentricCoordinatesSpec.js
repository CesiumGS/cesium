import { barycentricCoordinates } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/barycentricCoordinates", function () {
  var p0 = new Cartesian3(-1.0, 0.0, 0.0);
  var p1 = new Cartesian3(1.0, 0.0, 0.0);
  var p2 = new Cartesian3(0.0, 1.0, 1.0);

  it("evaluates to p0", function () {
    var point = Cartesian3.clone(p0);
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      Cartesian3.UNIT_X
    );
  });

  it("evaluates to p1", function () {
    var point = Cartesian3.clone(p1);
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      Cartesian3.UNIT_Y
    );
  });

  it("evaluates to p2", function () {
    var point = Cartesian3.clone(p2);
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      Cartesian3.UNIT_Z
    );
  });

  it("evaluates on the p0-p1 edge", function () {
    var point = Cartesian3.multiplyByScalar(
      Cartesian3.add(p1, p0, new Cartesian3()),
      0.5,
      new Cartesian3()
    );
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      new Cartesian3(0.5, 0.5, 0.0)
    );
  });

  it("evaluates on the p0-p2 edge", function () {
    var point = Cartesian3.multiplyByScalar(
      Cartesian3.add(p2, p0, new Cartesian3()),
      0.5,
      new Cartesian3()
    );
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      new Cartesian3(0.5, 0.0, 0.5)
    );
  });

  it("evaluates on the p1-p2 edge", function () {
    var point = Cartesian3.multiplyByScalar(
      Cartesian3.add(p2, p1, new Cartesian3()),
      0.5,
      new Cartesian3()
    );
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqual(
      new Cartesian3(0.0, 0.5, 0.5)
    );
  });

  it("evaluates on the interior", function () {
    var scalar = 1.0 / 3.0;
    var point = Cartesian3.multiplyByScalar(
      Cartesian3.add(
        Cartesian3.add(p0, p1, new Cartesian3()),
        p2,
        new Cartesian3()
      ),
      scalar,
      new Cartesian3()
    );
    expect(barycentricCoordinates(point, p0, p1, p2)).toEqualEpsilon(
      new Cartesian3(scalar, scalar, scalar),
      CesiumMath.EPSILON14
    );
  });

  it("returns undefined for colinear points", function () {
    var p0 = new Cartesian3(-1.0, -1.0, 0.0);
    var p1 = new Cartesian3(0.0, 0.0, 0.0);
    var p2 = new Cartesian3(1.0, 1.0, 0.0);
    var point = new Cartesian3(0.5, 0.5, 0.0);
    var coord = barycentricCoordinates(point, p0, p1, p2);
    expect(coord).toBeUndefined();
  });

  it("evaluates with equal length sides", function () {
    var p0 = new Cartesian3(
      9635312487071484,
      13827945400273020,
      -16479219993905144
    );
    var p1 = new Cartesian3(
      12832234.180639317,
      -10455085.701705107,
      750010.7274386138
    );
    var p2 = new Cartesian3(
      -9689011.10628853,
      -13420063.892507521,
      750010.7274386119
    );
    expect(barycentricCoordinates(p0, p0, p1, p2)).toEqual(Cartesian3.UNIT_X);
    expect(barycentricCoordinates(p1, p0, p1, p2)).toEqual(Cartesian3.UNIT_Y);
    expect(barycentricCoordinates(p2, p0, p1, p2)).toEqual(Cartesian3.UNIT_Z);
  });

  it("throws without point", function () {
    expect(function () {
      barycentricCoordinates();
    }).toThrowDeveloperError();
  });

  it("throws without p0", function () {
    expect(function () {
      barycentricCoordinates(new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("throws without p1", function () {
    expect(function () {
      barycentricCoordinates(new Cartesian3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("throws without p2", function () {
    expect(function () {
      barycentricCoordinates(
        new Cartesian3(),
        new Cartesian3(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });
});
