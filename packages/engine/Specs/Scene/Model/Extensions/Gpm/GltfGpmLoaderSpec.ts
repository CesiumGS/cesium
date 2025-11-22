import {
  Matrix3,
  Math as CesiumMath,
  Cartesian3,
  GltfGpmLoader,
} from "../../../../../index.js";

describe("Scene/Model/Extensions/Gpm/GltfGpmLoader", function () {
  it("load throws with invalid storageType", async function () {
    const gltfGpmLocalJson = {
      storageType: "INVALID",
    };
    expect(function () {
      GltfGpmLoader.load(gltfGpmLocalJson);
    }).toThrowError();
  });

  it("load throws for storageType Direct without anchorPointsDirect", async function () {
    const gltfGpmLocalJson = {
      storageType: "Direct",
    };
    expect(function () {
      GltfGpmLoader.load(gltfGpmLocalJson);
    }).toThrowError();
  });

  it("load throws for storageType Direct without covarianceDirectUpperTriangle", async function () {
    const gltfGpmLocalJson = {
      storageType: "Direct",
      anchorPointsDirect: [
        {
          position: [1.0, 2.0, 3.0],
          adjustmentParams: [0.1, 0.2, 0.3],
        },
      ],
    };
    expect(function () {
      GltfGpmLoader.load(gltfGpmLocalJson);
    }).toThrowError();
  });

  it("load returns result for valid JSON for storageType Direct", async function () {
    const gltfGpmLocalJson = {
      storageType: "Direct",
      anchorPointsDirect: [
        {
          position: [1.0, 2.0, 3.0],
          adjustmentParams: [0.1, 0.2, 0.3],
        },
      ],
      covarianceDirectUpperTriangle: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    };

    const result = GltfGpmLoader.load(gltfGpmLocalJson);
    expect(result).toBeDefined();
    expect(result.anchorPointsDirect.length).toBe(1);

    const actualAnchorPoint = result.anchorPointsDirect[0];

    const expectedPosition = new Cartesian3(1.0, 2.0, 3.0);
    expect(
      Cartesian3.equalsEpsilon(
        actualAnchorPoint.position,
        expectedPosition,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    const expectedAdjustmentParams = new Cartesian3(0.1, 0.2, 0.3);
    expect(
      Cartesian3.equalsEpsilon(
        actualAnchorPoint.adjustmentParams,
        expectedAdjustmentParams,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    const expectedCovarianceDirect = Matrix3.fromArray(
      [0.1, 0.2, 0.4, 0.2, 0.3, 0.5, 0.4, 0.5, 0.6],
      0,
      new Matrix3(),
    );
    expect(
      Matrix3.equalsEpsilon(
        result.covarianceDirect,
        expectedCovarianceDirect,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();
  });

  it("load throws for storageType Indirect without anchorPointsIndirect", async function () {
    const gltfGpmLocalJson = {
      storageType: "Indirect",
    };
    expect(function () {
      GltfGpmLoader.load(gltfGpmLocalJson);
    }).toThrowDeveloperError();
  });

  it("load throws for storageType Indirect without intraTileCorrelationGroups", async function () {
    const gltfGpmLocalJson = {
      storageType: "Indirect",
      anchorPointsIndirect: [
        {
          position: [1.0, 2.0, 3.0],
          adjustmentParams: [0.1, 0.2, 0.3],
        },
      ],
    };
    expect(function () {
      GltfGpmLoader.load(gltfGpmLocalJson);
    }).toThrowDeveloperError();
  });

  it("load returns result for valid JSON for storageType Indirect", async function () {
    const gltfGpmLocalJson = {
      storageType: "Indirect",
      anchorPointsIndirect: [
        {
          position: [1.0, 2.0, 3.0],
          adjustmentParams: [0.1, 0.2, 0.3],
          covarianceMatrix: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        },
      ],
      intraTileCorrelationGroups: [
        {
          groupFlags: [true, true, true],
          rotationThetas: [0.1, 0.2, 0.3],
          params: [
            {
              A: 0.1,
              alpha: 0.2,
              beta: 0.3,
              T: 0.4,
            },
          ],
        },
      ],
    };

    const result = GltfGpmLoader.load(gltfGpmLocalJson);
    expect(result).toBeDefined();

    expect(result.anchorPointsIndirect.length).toBe(1);

    const actualAnchorPoint = result.anchorPointsIndirect[0];

    const expectedPosition = new Cartesian3(1.0, 2.0, 3.0);
    expect(
      Cartesian3.equalsEpsilon(
        actualAnchorPoint.position,
        expectedPosition,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    const expectedAdjustmentParams = new Cartesian3(0.1, 0.2, 0.3);
    expect(
      Cartesian3.equalsEpsilon(
        actualAnchorPoint.adjustmentParams,
        expectedAdjustmentParams,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    const expectedCovarianceMatrix = Matrix3.fromArray(
      [0.1, 0.2, 0.4, 0.2, 0.3, 0.5, 0.4, 0.5, 0.6],
      0,
      new Matrix3(),
    );
    expect(
      Matrix3.equalsEpsilon(
        actualAnchorPoint.covarianceMatrix,
        expectedCovarianceMatrix,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    expect(result.intraTileCorrelationGroups.length).toBe(1);

    const correlationGroup = result.intraTileCorrelationGroups[0];
    const groupFlags = correlationGroup.groupFlags;
    expect(groupFlags).toEqual([true, true, true]);

    const expectedRotationThetas = new Cartesian3(0.1, 0.2, 0.3);
    expect(
      Cartesian3.equalsEpsilon(
        correlationGroup.rotationThetas,
        expectedRotationThetas,
        CesiumMath.EPSILON6,
      ),
    ).toBeTrue();

    const params = correlationGroup.params;
    expect(params.length).toBe(1);
    const param = params[0];
    expect(param.A).toBe(0.1);
    expect(param.alpha).toBe(0.2);
    expect(param.beta).toBe(0.3);
    expect(param.T).toBe(0.4);
  });
});
