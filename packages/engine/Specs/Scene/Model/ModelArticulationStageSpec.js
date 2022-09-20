import {
  ArticulationStageType,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  ModelArticulationStage,
} from "../../../Source/Cesium.js";

describe("Scene/Model/ModelArticulationStage", function () {
  const scratchCartesian3 = new Cartesian3();
  const scratchMatrix3 = new Matrix3();
  const scratchExpectedMatrix = new Matrix4();
  const scratchResultMatrix = new Matrix4();

  function mockRuntimeArticulation() {
    return {
      name: "SampleArticulation",
      _runtimeStages: [],
      _runtimeStagesByName: {},
      _dirty: false,
    };
  }

  it("throws for undefined stage", function () {
    expect(function () {
      return new ModelArticulationStage({
        stage: undefined,
        runtimeArticulation: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtime articulation", function () {
    expect(function () {
      return new ModelArticulationStage({
        stage: {},
        runtimeArticulation: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 0.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.stage).toBe(stage);
    expect(runtimeStage.runtimeArticulation).toBe(runtimeArticulation);

    expect(runtimeStage.name).toBe("SampleStage");
    expect(runtimeStage.type).toBe(ArticulationStageType.XTRANSLATE);
    expect(runtimeStage.minimumValue).toBe(-100.0);
    expect(runtimeStage.maximumValue).toBe(100.0);
    expect(runtimeStage.currentValue).toBe(0.0);
  });

  it("currentValue sets new value", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 0.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.0);

    runtimeStage.currentValue = 50.0;
    expect(runtimeStage.currentValue).toBe(50.0);
    expect(runtimeArticulation._dirty).toBe(true);
  });

  it("currentValue clamps new value", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 0.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.0);

    runtimeStage.currentValue = 150.0;
    expect(runtimeStage.currentValue).toBe(100.0);
    expect(runtimeArticulation._dirty).toBe(true);

    runtimeArticulation._dirty = false;
    runtimeStage.currentValue = -150.0;
    expect(runtimeStage.currentValue).toBe(-100.0);
    expect(runtimeArticulation._dirty).toBe(true);
  });

  it("currentValue has no effect if given value is the same", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 0.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.0);

    runtimeStage.currentValue = 0.0;
    expect(runtimeStage.currentValue).toBe(0.0);
    expect(runtimeArticulation._dirty).toBe(false);
  });

  it("applyStageToMatrix works for xTranslate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 50.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(50.0);

    const expectedTranslation = Cartesian3.fromElements(
      50.0,
      0.0,
      0.0,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromTranslation(
      expectedTranslation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for yTranslate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.YTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 50.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(50.0);

    const expectedTranslation = Cartesian3.fromElements(
      0.0,
      50.0,
      0.0,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromTranslation(
      expectedTranslation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for zTranslate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.ZTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: 50.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(50.0);

    const expectedTranslation = Cartesian3.fromElements(
      0.0,
      0.0,
      50.0,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromTranslation(
      expectedTranslation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for xRotate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XROTATE,
      minimumValue: -360.0,
      maximumValue: 360.0,
      initialValue: 180.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });
    expect(runtimeStage.currentValue).toBe(180.0);

    const value = CesiumMath.toRadians(180.0);
    const expectedRotation = Matrix3.fromRotationX(value, scratchMatrix3);
    const expectedMatrix = Matrix4.fromRotation(
      expectedRotation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for yRotate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.YROTATE,
      minimumValue: -360.0,
      maximumValue: 360.0,
      initialValue: 180.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(180.0);

    const value = CesiumMath.toRadians(180.0);
    const expectedRotation = Matrix3.fromRotationY(value, scratchMatrix3);
    const expectedMatrix = Matrix4.fromRotation(
      expectedRotation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for zRotate", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.ZROTATE,
      minimumValue: -360.0,
      maximumValue: 360.0,
      initialValue: 180.0,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(180.0);

    const value = CesiumMath.toRadians(180.0);
    const expectedRotation = Matrix3.fromRotationZ(value, scratchMatrix3);
    const expectedMatrix = Matrix4.fromRotation(
      expectedRotation,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for xScale", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.XSCALE,
      minimumValue: 0.0,
      maximumValue: 1.0,
      initialValue: 0.5,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.5);

    const expectedScale = Cartesian3.fromElements(
      0.5,
      1.0,
      1.0,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromScale(
      expectedScale,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for yScale", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.YSCALE,
      minimumValue: 0.0,
      maximumValue: 1.0,
      initialValue: 0.5,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.5);

    const expectedScale = Cartesian3.fromElements(
      1.0,
      0.5,
      1.0,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromScale(
      expectedScale,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for zScale", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.ZSCALE,
      minimumValue: 0.0,
      maximumValue: 1.0,
      initialValue: 0.5,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.5);

    const expectedScale = Cartesian3.fromElements(
      1.0,
      1.0,
      0.5,
      scratchCartesian3
    );
    const expectedMatrix = Matrix4.fromScale(
      expectedScale,
      scratchExpectedMatrix
    );

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });

  it("applyStageToMatrix works for uniformScale", function () {
    const stage = {
      name: "SampleStage",
      type: ArticulationStageType.UNIFORMSCALE,
      minimumValue: 0.0,
      maximumValue: 1.0,
      initialValue: 0.5,
    };

    const runtimeArticulation = mockRuntimeArticulation();
    const runtimeStage = new ModelArticulationStage({
      stage: stage,
      runtimeArticulation: runtimeArticulation,
    });

    expect(runtimeStage.currentValue).toBe(0.5);

    const expectedMatrix = Matrix4.fromUniformScale(0.5, scratchExpectedMatrix);

    let resultMatrix = Matrix4.clone(Matrix4.IDENTITY, scratchResultMatrix);
    resultMatrix = runtimeStage.applyStageToMatrix(resultMatrix);

    expect(resultMatrix).toEqual(expectedMatrix);
  });
});
