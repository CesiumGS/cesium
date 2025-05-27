import {
  Rectangle,
  MappedPositions,
  Ellipsoid,
  Matrix4,
  Cartographic,
  ModelImageryMapping,
  Cartesian3,
  BoundingRectangle,
  Math as CesiumMath,
  Cartesian2,
  WebMercatorProjection,
} from "../../../index.js";

describe("Scene/Model/ModelImageryMapping", function () {
  it("createTextureCoordinatesForMappedPositions throws without mappedPositions", function () {
    const mappedPositions = undefined;
    const projection = new WebMercatorProjection();
    expect(function () {
      ModelImageryMapping.createTextureCoordinatesForMappedPositions(
        mappedPositions,
        projection,
      );
    }).toThrowDeveloperError();
  });

  it("createTextureCoordinatesForMappedPositions throws without projection", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const numPositions = 4;
    const cartographicBoundingRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const ellipsoid = Ellipsoid.WGS84;
    const mappedPositions = new MappedPositions(
      cartographicPositions,
      numPositions,
      cartographicBoundingRectangle,
      ellipsoid,
    );
    const projection = undefined;
    expect(function () {
      ModelImageryMapping.createTextureCoordinatesForMappedPositions(
        mappedPositions,
        projection,
      );
    }).toThrowDeveloperError();
  });

  it("createIterableCartesian3FromTypedArray throws with undefined typedArray", function () {
    const typedArray = undefined;
    const stride = 3;
    expect(function () {
      ModelImageryMapping.createIterableCartesian3FromTypedArray(
        typedArray,
        stride,
      );
    }).toThrowDeveloperError();
  });

  it("createIterableCartesian3FromTypedArray throws with invalid stride", function () {
    const typedArray = new Float32Array([
      0.0, 0.1, 0.2, 1.0, 1.1, 1.2, 2.0, 2.1, 2.2,
    ]);
    const stride = 2;
    expect(function () {
      ModelImageryMapping.createIterableCartesian3FromTypedArray(
        typedArray,
        stride,
      );
    }).toThrowDeveloperError();
  });

  it("createIterableCartesian3FromTypedArray creates proper cartesians with stride 3", function () {
    const typedArray = new Float32Array([
      0.0, 0.1, 0.2, 1.0, 1.1, 1.2, 2.0, 2.1, 2.2,
    ]);
    const stride = 3;
    const iterable = ModelImageryMapping.createIterableCartesian3FromTypedArray(
      typedArray,
      stride,
    );
    const actualCartesians = [
      ...ModelImageryMapping.map(iterable, (c) => Cartesian3.clone(c)),
    ];
    const expectedCartesians = [
      new Cartesian3(0.0, 0.1, 0.2),
      new Cartesian3(1.0, 1.1, 1.2),
      new Cartesian3(2.0, 2.1, 2.2),
    ];
    for (let i = 0; i < actualCartesians.length; i++) {
      expect(
        Cartesian3.equalsEpsilon(
          actualCartesians[i],
          expectedCartesians[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("createIterableCartesian3FromTypedArray creates proper cartesians with stride 4", function () {
    const typedArray = new Float32Array([
      0.0, 0.1, 0.2, 9.9, 1.0, 1.1, 1.2, 9.9, 2.0, 2.1, 2.2, 9.9,
    ]);
    const stride = 4;
    const iterable = ModelImageryMapping.createIterableCartesian3FromTypedArray(
      typedArray,
      stride,
    );
    const actualCartesians = [
      ...ModelImageryMapping.map(iterable, (c) => Cartesian3.clone(c)),
    ];
    const expectedCartesians = [
      new Cartesian3(0.0, 0.1, 0.2),
      new Cartesian3(1.0, 1.1, 1.2),
      new Cartesian3(2.0, 2.1, 2.2),
    ];
    for (let i = 0; i < actualCartesians.length; i++) {
      expect(
        Cartesian3.equalsEpsilon(
          actualCartesians[i],
          expectedCartesians[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("map throws with undefined iterable", function () {
    const iterable = undefined;
    const mapper = (c) => Cartesian3.length(c);
    expect(function () {
      ModelImageryMapping.map(iterable, mapper);
    }).toThrowDeveloperError();
  });

  it("map throws with undefined mapper", function () {
    const iterable = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const mapper = undefined;
    expect(function () {
      ModelImageryMapping.map(iterable, mapper);
    }).toThrowDeveloperError();
  });

  it("map maps", function () {
    const iterable = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const mapper = (c) => Cartesian3.magnitude(c);
    const resultIterable = ModelImageryMapping.map(iterable, mapper);
    const actualValues = [...resultIterable];
    const expectedValues = [1.0, 2.0, 3.0];
    expect(actualValues).toEqualEpsilon(expectedValues, CesiumMath.EPSILON6);
  });

  it("computeCartographicBoundingRectangle throws with undefined cartographicPositions", function () {
    const cartographicPositions = undefined;
    const result = new Rectangle();
    expect(function () {
      ModelImageryMapping.computeCartographicBoundingRectangle(
        cartographicPositions,
        result,
      );
    }).toThrowDeveloperError();
  });

  it("computeCartographicBoundingRectangle computes the bounding rectangle", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const result = new Rectangle();
    const expectedRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const actualRectangle =
      ModelImageryMapping.computeCartographicBoundingRectangle(
        cartographicPositions,
        result,
      );
    expect(
      Rectangle.equalsEpsilon(
        actualRectangle,
        expectedRectangle,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();
  });

  it("computeCartographicBoundingRectangle computes the bounding rectangle with undefined result", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const result = undefined;
    const expectedRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const actualRectangle =
      ModelImageryMapping.computeCartographicBoundingRectangle(
        cartographicPositions,
        result,
      );
    expect(
      Rectangle.equalsEpsilon(
        actualRectangle,
        expectedRectangle,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();
  });

  it("transformCartesians3 throws with undefined positions", function () {
    const positions = undefined;
    const matrix = Matrix4.IDENTITY;
    expect(function () {
      ModelImageryMapping.transformCartesians3(positions, matrix);
    }).toThrowDeveloperError();
  });

  it("transformCartesians3 throws with undefined matrix", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const matrix = undefined;
    expect(function () {
      ModelImageryMapping.transformCartesians3(positions, matrix);
    }).toThrowDeveloperError();
  });

  it("transformCartesians3 transforms the cartesians", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const matrix = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
    const resultIterable = ModelImageryMapping.transformCartesians3(
      positions,
      matrix,
    );
    const actualCartesians = [
      ...ModelImageryMapping.map(resultIterable, (c) => Cartesian3.clone(c)),
    ];
    const expectedCartesians = [
      new Cartesian3(2.0, 2.0, 3.0),
      new Cartesian3(1.0, 4.0, 3.0),
      new Cartesian3(1.0, 2.0, 6.0),
    ];
    for (let i = 0; i < actualCartesians.length; i++) {
      expect(
        Cartesian3.equalsEpsilon(
          actualCartesians[i],
          expectedCartesians[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("transformToCartographic throws with undefined positions", function () {
    const positions = undefined;
    const ellipsoid = Ellipsoid.WGS84;
    expect(function () {
      ModelImageryMapping.transformToCartographic(positions, ellipsoid);
    }).toThrowDeveloperError();
  });

  it("transformToCartographic throws with undefined ellipsoid", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const ellipsoid = undefined;
    expect(function () {
      ModelImageryMapping.transformToCartographic(positions, ellipsoid);
    }).toThrowDeveloperError();
  });

  it("transformToCartographic transforms to cartographic", function () {
    const positions = [
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 2.0, 0.0),
      new Cartesian3(0.0, 0.0, 3.0),
    ];
    const ellipsoid = Ellipsoid.WGS84;
    const resultIterable = ModelImageryMapping.transformToCartographic(
      positions,
      ellipsoid,
    );
    const actualCartographics = [
      ...ModelImageryMapping.map(resultIterable, (c) => Cartographic.clone(c)),
    ];
    // Let's hope these values never appear in reality.
    const expectedCartographics = [
      new Cartographic(0.0, 0.0, -6378137.0 + 1.0),
      new Cartographic(CesiumMath.PI / 2.0, 0.0, -6378137.0 + 2.0),
      new Cartographic(0.0, CesiumMath.PI / 2.0, -6356752.314245179 + 3.0),
    ];
    for (let i = 0; i < actualCartographics.length; i++) {
      expect(
        Cartographic.equalsEpsilon(
          actualCartographics[i],
          expectedCartographics[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("createProjectedPositions throws with undefined cartographicPositions", function () {
    const cartographicPositions = undefined;
    const projection = new WebMercatorProjection();
    expect(function () {
      ModelImageryMapping.createProjectedPositions(
        cartographicPositions,
        projection,
      );
    }).toThrowDeveloperError();
  });

  it("createProjectedPositions throws with undefined projection", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const projection = undefined;
    expect(function () {
      ModelImageryMapping.createProjectedPositions(
        cartographicPositions,
        projection,
      );
    }).toThrowDeveloperError();
  });

  it("createProjectedPositions creates projected positions", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const projection = new WebMercatorProjection();

    const resultIterable = ModelImageryMapping.createProjectedPositions(
      cartographicPositions,
      projection,
    );
    const actualCartesians = [
      ...ModelImageryMapping.map(resultIterable, (c) => Cartesian3.clone(c)),
    ];
    const expectedCartesians = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(637813.7, 0.0, 0.0),
      new Cartesian3(0.0, 638879.3881344117, 0.0),
      new Cartesian3(637813.7, 638879.3881344117, 0.0),
    ];
    console.log(actualCartesians);
    console.log(expectedCartesians);
    for (let i = 0; i < actualCartesians.length; i++) {
      expect(
        Cartesian3.equalsEpsilon(
          actualCartesians[i],
          expectedCartesians[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("computeTexCoords throws with undefined positions", function () {
    const positions = undefined;
    const boundingRectangle = new BoundingRectangle(0.0, 0.0, 2.0, 2.0);
    expect(function () {
      ModelImageryMapping.computeTexCoords(positions, boundingRectangle);
    }).toThrowDeveloperError();
  });

  it("computeTexCoords throws with undefined boundingRectangle", function () {
    const positions = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(4.0, 4.0, 0.0),
    ];
    const boundingRectangle = undefined;
    expect(function () {
      ModelImageryMapping.computeTexCoords(positions, boundingRectangle);
    }).toThrowDeveloperError();
  });

  it("computeTexCoords computes the texture coordinates", function () {
    const positions = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(-4.0, 4.0, 0.0),
    ];
    const boundingRectangle = new BoundingRectangle(0.0, 0.0, 2.0, 2.0);
    const resultIterable = ModelImageryMapping.computeTexCoords(
      positions,
      boundingRectangle,
    );
    const actualCartesians = [
      ...ModelImageryMapping.map(resultIterable, (c) => Cartesian2.clone(c)),
    ];
    const expectedCartesians = [
      new Cartesian2(0.0, 0.0),
      new Cartesian2(0.5, 0.0),
      new Cartesian2(0.0, 0.5),
      new Cartesian2(0.0, 1.0), // Clamped!
    ];
    console.log(actualCartesians);
    for (let i = 0; i < actualCartesians.length; i++) {
      expect(
        Cartesian2.equalsEpsilon(
          actualCartesians[i],
          expectedCartesians[i],
          CesiumMath.EPSILON6,
        ),
      ).toBeTrue();
    }
  });

  it("createTypedArrayFromCartesians2 throws with invalid numElements", function () {
    const numElements = -1;
    const elements = [
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
      new Cartesian2(0.0, 1.0),
      new Cartesian2(1.0, 1.0),
    ];
    expect(function () {
      ModelImageryMapping.createTypedArrayFromCartesians2(
        numElements,
        elements,
      );
    }).toThrowDeveloperError();
  });

  it("createTypedArrayFromCartesians2 throws with undefined elements", function () {
    const numElements = 4;
    const elements = undefined;
    expect(function () {
      ModelImageryMapping.createTypedArrayFromCartesians2(
        numElements,
        elements,
      );
    }).toThrowDeveloperError();
  });

  it("createTypedArrayFromCartesians2 creates a typed array", function () {
    const numElements = 4;
    const elements = [
      new Cartesian2(0.0, 0.0),
      new Cartesian2(1.0, 0.0),
      new Cartesian2(0.0, 1.0),
      new Cartesian2(1.0, 1.0),
    ];
    const actualTypedArray =
      ModelImageryMapping.createTypedArrayFromCartesians2(
        numElements,
        elements,
      );
    const expectedTypedArray = new Float32Array([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    ]);
    expect(actualTypedArray).toEqual(expectedTypedArray);
  });
});
