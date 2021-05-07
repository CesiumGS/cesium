import { arrayFill } from "../../Source/Cesium.js";
import { AxisAlignedBoundingBox } from "../../Source/Cesium.js";
import { BoxOutlineGeometry } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/BoxOutlineGeometry", function () {
  it("constructor throws without maximum corner", function () {
    expect(function () {
      return new BoxOutlineGeometry({
        maximum: new Cartesian3(),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without minimum corner", function () {
    expect(function () {
      return new BoxOutlineGeometry({
        minimum: new Cartesian3(),
      });
    }).toThrowDeveloperError();
  });

  it("constructor creates positions", function () {
    var m = BoxOutlineGeometry.createGeometry(
      new BoxOutlineGeometry({
        minimum: new Cartesian3(-1, -2, -3),
        maximum: new Cartesian3(1, 2, 3),
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(12 * 2);
  });

  it("computes offset attribute", function () {
    var m = BoxOutlineGeometry.createGeometry(
      new BoxOutlineGeometry({
        minimum: new Cartesian3(-1, -2, -3),
        maximum: new Cartesian3(1, 2, 3),
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    var numVertices = 8;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    var offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    var expected = new Array(offset.length);
    expected = arrayFill(expected, 1);
    expect(offset).toEqual(expected);
  });

  it("fromDimensions throws without dimensions", function () {
    expect(function () {
      return BoxOutlineGeometry.fromDimensions();
    }).toThrowDeveloperError();
  });

  it("fromDimensions throws with negative dimensions", function () {
    expect(function () {
      return BoxOutlineGeometry.fromDimensions({
        dimensions: new Cartesian3(1, 2, -1),
      });
    }).toThrowDeveloperError();
  });

  it("fromDimensions", function () {
    var m = BoxOutlineGeometry.createGeometry(
      BoxOutlineGeometry.fromDimensions({
        dimensions: new Cartesian3(1, 2, 3),
      })
    );

    expect(m.attributes.position.values.length).toEqual(8 * 3);
    expect(m.indices.length).toEqual(12 * 2);
  });

  it("fromAxisAlignedBoundingBox throws with no boundingBox", function () {
    expect(function () {
      return BoxOutlineGeometry.fromAxisAlignedBoundingBox(undefined);
    }).toThrowDeveloperError();
  });

  it("fromAxisAlignedBoundingBox", function () {
    var min = new Cartesian3(-1, -2, -3);
    var max = new Cartesian3(1, 2, 3);
    var m = BoxOutlineGeometry.fromAxisAlignedBoundingBox(
      new AxisAlignedBoundingBox(min, max)
    );
    expect(m._min).toEqual(min);
    expect(m._max).toEqual(max);
  });

  it("undefined is returned if min and max are equal", function () {
    var box = new BoxOutlineGeometry({
      maximum: new Cartesian3(250000.0, 250000.0, 250000.0),
      minimum: new Cartesian3(250000.0, 250000.0, 250000.0),
    });

    var geometry = BoxOutlineGeometry.createGeometry(box);

    expect(geometry).toBeUndefined();
  });

  createPackableSpecs(
    BoxOutlineGeometry,
    new BoxOutlineGeometry({
      minimum: new Cartesian3(1.0, 2.0, 3.0),
      maximum: new Cartesian3(4.0, 5.0, 6.0),
    }),
    [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, -1.0]
  );
});
