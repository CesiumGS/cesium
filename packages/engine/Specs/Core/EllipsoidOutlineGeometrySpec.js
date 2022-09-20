import {
  Cartesian3,
  EllipsoidOutlineGeometry,
  GeometryOffsetAttribute,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/EllipsoidOutlineGeometry", function () {
  it("constructor throws if stackPartitions less than 1", function () {
    expect(function () {
      return new EllipsoidOutlineGeometry({
        stackPartitions: 0,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if slicePartitions less than 0", function () {
    expect(function () {
      return new EllipsoidOutlineGeometry({
        slicePartitions: -1,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if subdivisions less than 0", function () {
    expect(function () {
      return new EllipsoidOutlineGeometry({
        subdivisions: -2,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if offset attribute is equal to GeometryOffsetAttribute.TOP", function () {
    expect(function () {
      return new EllipsoidOutlineGeometry({
        offsetAttribute: GeometryOffsetAttribute.TOP,
      });
    }).toThrowDeveloperError();
  });

  it("constructor rounds floating-point slicePartitions", function () {
    const m = new EllipsoidOutlineGeometry({
      slicePartitions: 3.5,
      stackPartitions: 3,
      subdivisions: 3,
    });
    expect(m._slicePartitions).toEqual(4);
  });

  it("constructor rounds floating-point stackPartitions", function () {
    const m = new EllipsoidOutlineGeometry({
      slicePartitions: 3,
      stackPartitions: 3.5,
      subdivisions: 3,
    });
    expect(m._stackPartitions).toEqual(4);
  });

  it("constructor rounds floating-point subdivisions", function () {
    const m = new EllipsoidOutlineGeometry({
      slicePartitions: 3,
      stackPartitions: 3,
      subdivisions: 3.5,
    });
    expect(m._subdivisions).toEqual(4);
  });

  it("computes positions", function () {
    const m = EllipsoidOutlineGeometry.createGeometry(
      new EllipsoidOutlineGeometry({
        stackPartitions: 3,
        slicePartitions: 3,
        subdivisions: 3,
      })
    );

    expect(m.attributes.position.values.length).toEqual(24 * 3);
    expect(m.indices.length).toEqual(16 * 2);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes positions for partial ellipsoid", function () {
    const m = EllipsoidOutlineGeometry.createGeometry(
      new EllipsoidOutlineGeometry({
        innerRadii: new Cartesian3(0.5, 0.5, 0.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
        minimumCone: CesiumMath.toRadians(30.0),
        maximumCone: CesiumMath.toRadians(120.0),
        stackPartitions: 3,
        slicePartitions: 3,
        subdivisions: 3,
      })
    );

    expect(m.attributes.position.values.length).toEqual(24 * 3);
    expect(m.indices.length).toEqual(20 * 2);
    expect(m.boundingSphere.radius).toEqual(1);
  });

  it("computes offset attribute", function () {
    const m = EllipsoidOutlineGeometry.createGeometry(
      new EllipsoidOutlineGeometry({
        stackPartitions: 3,
        slicePartitions: 3,
        subdivisions: 3,
        offsetAttribute: GeometryOffsetAttribute.ALL,
      })
    );

    const numVertices = 24;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);

    const offset = m.attributes.applyOffset.values;
    expect(offset.length).toEqual(numVertices);
    const expected = new Array(offset.length).fill(1);
    expect(offset).toEqual(expected);
  });

  it("computes partitions to default to 2 if less than 2", function () {
    const geometry = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(0.5, 0.5, 0.5),
    });

    geometry._slicePartitions = 0;
    geometry._stackPartitions = 0;

    const m = EllipsoidOutlineGeometry.createGeometry(geometry);

    expect(m.indices.length).toEqual(1016);
  });

  it("undefined is returned if the x, y, or z radii are equal or less than zero", function () {
    const ellipsoidOutline0 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(0.0, 500000.0, 500000.0),
    });
    const ellipsoidOutline1 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(1000000.0, 0.0, 500000.0),
    });
    const ellipsoidOutline2 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(1000000.0, 500000.0, 0.0),
    });
    const ellipsoidOutline3 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(-10.0, 500000.0, 500000.0),
    });
    const ellipsoidOutline4 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(1000000.0, -10.0, 500000.0),
    });
    const ellipsoidOutline5 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(1000000.0, 500000.0, -10.0),
    });
    const ellipsoidOutline6 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(0.0, 100000.0, 100000.0),
    });
    const ellipsoidOutline7 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 0.0, 100000.0),
    });
    const ellipsoidOutline8 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, 0.0),
    });
    const ellipsoidOutline9 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(-10.0, 100000.0, 100000.0),
    });
    const ellipsoidOutline10 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, -10.0, 100000.0),
    });
    const ellipsoidOutline11 = new EllipsoidOutlineGeometry({
      radii: new Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cartesian3(100000.0, 100000.0, -10.0),
    });

    const geometry0 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline0
    );
    const geometry1 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline1
    );
    const geometry2 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline2
    );
    const geometry3 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline3
    );
    const geometry4 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline4
    );
    const geometry5 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline5
    );
    const geometry6 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline6
    );
    const geometry7 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline7
    );
    const geometry8 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline8
    );
    const geometry9 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline9
    );
    const geometry10 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline10
    );
    const geometry11 = EllipsoidOutlineGeometry.createGeometry(
      ellipsoidOutline11
    );

    expect(geometry0).toBeUndefined();
    expect(geometry1).toBeUndefined();
    expect(geometry2).toBeUndefined();
    expect(geometry3).toBeUndefined();
    expect(geometry4).toBeUndefined();
    expect(geometry5).toBeUndefined();
    expect(geometry6).toBeUndefined();
    expect(geometry7).toBeUndefined();
    expect(geometry8).toBeUndefined();
    expect(geometry9).toBeUndefined();
    expect(geometry10).toBeUndefined();
    expect(geometry11).toBeUndefined();
  });

  const ellipsoidgeometry = new EllipsoidOutlineGeometry({
    radii: new Cartesian3(1.0, 2.0, 3.0),
    innerRadii: new Cartesian3(0.5, 0.6, 0.7),
    minimumClock: 0.1,
    maximumClock: 0.2,
    minimumCone: 0.3,
    maximumCone: 0.4,
    slicePartitions: 3,
    stackPartitions: 3,
    subdivisions: 3,
  });
  const packedInstance = [
    1.0,
    2.0,
    3.0,
    0.5,
    0.6,
    0.7,
    0.1,
    0.2,
    0.3,
    0.4,
    3.0,
    3.0,
    3.0,
    -1,
  ];
  createPackableSpecs(
    EllipsoidOutlineGeometry,
    ellipsoidgeometry,
    packedInstance
  );
});
