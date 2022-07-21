import {
  ArticulationStageType,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  ModelArticulation,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelArticulation", function () {
  const mockSceneGraph = {};

  const articulation = {
    name: "SampleArticulation",
    stages: [],
  };

  function createTranslateStage(name, value) {
    return {
      name: name,
      type: ArticulationStageType.XTRANSLATE,
      minimumValue: -100.0,
      maximumValue: 100.0,
      initialValue: value,
    };
  }

  function createRotateStage(name, value) {
    return {
      name: name,
      type: ArticulationStageType.ZROTATE,
      minimumValue: -360.0,
      maximumValue: 360.0,
      initialValue: value,
    };
  }

  function createScaleStage(name, value) {
    return {
      name: name,
      type: ArticulationStageType.UNIFORMSCALE,
      minimumValue: 0.0,
      maximumValue: 1.0,
      initialValue: value,
    };
  }

  function mockRuntimeNode(transform) {
    return {
      originalTransform: Matrix4.clone(transform),
      transform: Matrix4.clone(transform),
    };
  }

  beforeEach(function () {
    const stages = articulation.stages;
    stages.length = 0;

    stages.push(createTranslateStage("MoveX", 50.0));
    stages.push(createRotateStage("RotateZ", 180.0));
    stages.push(createScaleStage("Size", 0.5));
  });

  it("throws for undefined articulation", function () {
    expect(function () {
      return new ModelArticulation({
        articulation: undefined,
        sceneGraph: mockSceneGraph,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined scene graph", function () {
    expect(function () {
      return new ModelArticulation({
        articulation: {},
        sceneGraph: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: mockSceneGraph,
    });

    expect(runtimeArticulation.articulation).toBe(articulation);
    expect(runtimeArticulation.sceneGraph).toBe(mockSceneGraph);

    expect(runtimeArticulation.name).toEqual("SampleArticulation");

    const runtimeStages = runtimeArticulation.runtimeStages;
    expect(runtimeStages.length).toEqual(3);

    const runtimeStagesByName = runtimeArticulation._runtimeStagesByName;

    const xTranslateStage = runtimeStages[0];
    expect(xTranslateStage.name).toBe("MoveX");
    expect(xTranslateStage.runtimeArticulation).toBe(runtimeArticulation);
    expect(runtimeStagesByName[xTranslateStage.name]).toBe(xTranslateStage);

    const zRotateStage = runtimeStages[1];
    expect(zRotateStage.name).toBe("RotateZ");
    expect(zRotateStage.runtimeArticulation).toBe(runtimeArticulation);
    expect(runtimeStagesByName[zRotateStage.name]).toBe(zRotateStage);

    const uniformScaleStage = runtimeStages[2];
    expect(uniformScaleStage.name).toBe("Size");
    expect(uniformScaleStage.runtimeArticulation).toBe(runtimeArticulation);
    expect(runtimeStagesByName[uniformScaleStage.name]).toBe(uniformScaleStage);

    expect(runtimeArticulation.runtimeNodes.length).toBe(0);
    expect(runtimeArticulation._dirty).toBe(true);
  });

  it("setArticulationStage does not throw if stage name doesn't exist", function () {
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: mockSceneGraph,
    });

    const runtimeStages = runtimeArticulation.runtimeStages;
    expect(runtimeStages.length).toEqual(3);

    const xTranslateStage = runtimeStages[0];
    const zRotateStage = runtimeStages[1];
    const uniformScaleStage = runtimeStages[2];

    expect(xTranslateStage.currentValue).toBe(50.0);
    expect(zRotateStage.currentValue).toBe(180.0);
    expect(uniformScaleStage.currentValue).toBe(0.5);
    runtimeArticulation._dirty = false;

    expect(function () {
      runtimeArticulation.setArticulationStage("NonexistentStage", 100.0);
    }).not.toThrowDeveloperError();

    expect(xTranslateStage.currentValue).toBe(50.0);
    expect(zRotateStage.currentValue).toBe(180.0);
    expect(uniformScaleStage.currentValue).toBe(0.5);
    expect(runtimeArticulation._dirty).toBe(false);
  });

  it("setArticulationStage works", function () {
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: mockSceneGraph,
    });

    runtimeArticulation._dirty = false;
    const runtimeStages = runtimeArticulation.runtimeStages;
    expect(runtimeStages.length).toEqual(3);

    const xTranslateStage = runtimeStages[0];
    const zRotateStage = runtimeStages[1];
    const uniformScaleStage = runtimeStages[2];

    expect(xTranslateStage.currentValue).toBe(50.0);
    expect(zRotateStage.currentValue).toBe(180.0);
    expect(uniformScaleStage.currentValue).toBe(0.5);

    runtimeArticulation.setArticulationStage("MoveX", 0.0);

    expect(xTranslateStage.currentValue).toBe(0.0);
    expect(zRotateStage.currentValue).toBe(180.0);
    expect(uniformScaleStage.currentValue).toBe(0.5);
    expect(runtimeArticulation._dirty).toBe(true);

    runtimeArticulation._dirty = false;

    // This value should be clamped by the stage's minimum value
    runtimeArticulation.setArticulationStage("RotateZ", -480.0);
    expect(xTranslateStage.currentValue).toBe(0.0);
    expect(zRotateStage.currentValue).toBe(-360.0);
    expect(uniformScaleStage.currentValue).toBe(0.5);
    expect(runtimeArticulation._dirty).toBe(true);

    runtimeArticulation._dirty = false;

    // This value should be clamped by the stage's maximum value
    runtimeArticulation.setArticulationStage("Size", 2.0);
    expect(xTranslateStage.currentValue).toBe(0.0);
    expect(zRotateStage.currentValue).toBe(-360.0);
    expect(uniformScaleStage.currentValue).toBe(1.0);
    expect(runtimeArticulation._dirty).toBe(true);
  });

  it("apply does nothing if articulation is not dirty", function () {
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: mockSceneGraph,
    });
    runtimeArticulation._dirty = false;

    const transform = Matrix4.fromTranslation(
      new Cartesian3(1.0, 2.0, 3.0),
      new Matrix4()
    );

    const node = mockRuntimeNode(transform);
    runtimeArticulation.runtimeNodes.push(node);

    expect(node.transform).toEqual(transform);
    expect(runtimeArticulation._dirty).toBe(false);

    runtimeArticulation.apply();
    expect(node.transform).toEqual(transform);
  });

  it("apply works", function () {
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: mockSceneGraph,
    });

    const transform = Matrix4.fromTranslation(
      new Cartesian3(1.0, 2.0, 3.0),
      new Matrix4()
    );

    const node = mockRuntimeNode(transform);
    runtimeArticulation.runtimeNodes.push(node);

    expect(runtimeArticulation._dirty).toBe(true);

    let expectedMatrix = Matrix4.fromTranslation(
      new Cartesian3(50.0, 0.0, 0.0),
      new Matrix4()
    );

    const rotation = CesiumMath.toRadians(180.0);
    const expectedRotation = Matrix3.fromRotationZ(rotation, new Matrix3());

    expectedMatrix = Matrix4.multiplyByMatrix3(
      expectedMatrix,
      expectedRotation,
      expectedMatrix
    );

    expectedMatrix = Matrix4.multiplyByUniformScale(
      expectedMatrix,
      0.5,
      expectedMatrix
    );

    expectedMatrix = Matrix4.multiplyTransformation(
      transform,
      expectedMatrix,
      expectedMatrix
    );

    runtimeArticulation.apply();
    expect(runtimeArticulation._dirty).toBe(false);
    expect(node.transform).toEqual(expectedMatrix);
    expect(node.originalTransform).toEqual(transform);
  });
});
