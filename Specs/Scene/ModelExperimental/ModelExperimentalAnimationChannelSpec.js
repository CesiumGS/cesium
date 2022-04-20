import {
  Axis,
  Cartesian3,
  ConstantSpline,
  InterpolationType,
  LinearSpline,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  ModelComponents,
  ModelExperimentalAnimationChannel,
  ModelExperimentalNode,
  MorphWeightSpline,
  SteppedSpline,
  Quaternion,
  QuaternionSpline,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalAnimationChannel", function () {
  const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

  const mockNode = {
    translation: Cartesian3.ZERO,
    rotation: Quaternion.IDENTITY,
    scale: new Cartesian3(1.0, 1.0, 1.0),
  };

  const transform = Matrix4.clone(Matrix4.IDENTITY);
  const transformToRoot = Matrix4.clone(Matrix4.IDENTITY);
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    runtimeNodes: [mockNode],
    components: {
      upAxis: Axis.Y,
      forwardAxis: Axis.Z,
    },
  };

  const runtimeAnimation = {
    model: {
      clampAnimations: true,
    },
  };
  let runtimeNode;

  beforeEach(function () {
    runtimeNode = new ModelExperimentalNode({
      node: mockNode,
      transform: transform,
      transformToRoot: transformToRoot,
      sceneGraph: mockSceneGraph,
      children: [],
    });
  });

  it("throws for undefined channel", function () {
    expect(function () {
      return new ModelExperimentalAnimationChannel({
        channel: undefined,
        runtimeAnimation: runtimeAnimation,
        runtimeNode: runtimeNode,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeAnimation", function () {
    expect(function () {
      return new ModelExperimentalAnimationChannel({
        channel: {},
        runtimeAnimation: undefined,
        runtimeNode: runtimeNode,
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimeNode", function () {
    expect(function () {
      return new ModelExperimentalAnimationChannel({
        channel: {},
        runtimeAnimation: runtimeAnimation,
        runtimeNode: undefined,
      });
    }).toThrowDeveloperError();
  });

  function createMockChannel(node, mockSampler, path) {
    const mockTarget = {
      node: node,
      path: path,
    };
    const mockChannel = {
      sampler: mockSampler,
      target: mockTarget,
    };
    return mockChannel;
  }

  it("constructs constant spline", function () {
    const mockSampler = {
      input: [0.0],
      interpolation: InterpolationType.LINEAR,
      output: [Cartesian3.ZERO],
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.TRANSLATION
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeChannel.channel).toBe(mockChannel);
    expect(runtimeChannel.runtimeAnimation).toBe(runtimeAnimation);
    expect(runtimeChannel.runtimeNode).toBe(runtimeNode);
    expect(runtimeChannel.spline instanceof ConstantSpline).toBe(true);
  });

  const times = [0.0, 0.25, 0.5, 1.0];
  const translationPoints = [
    Cartesian3.ZERO,
    new Cartesian3(1.0, 0.0, 0.0),
    new Cartesian3(1.0, 1.0, 0.0),
    new Cartesian3(0.0, 1.0, 0.0),
  ];

  it("constructs linear spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.TRANSLATION
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeChannel.channel).toBe(mockChannel);
    expect(runtimeChannel.runtimeAnimation).toBe(runtimeAnimation);
    expect(runtimeChannel.runtimeNode).toBe(runtimeNode);
    expect(runtimeChannel.spline instanceof LinearSpline).toBe(true);
  });

  const rotationPoints = [
    Quaternion.IDENTITY,
    new Quaternion(0.707, 0.0, 0.707, 0.0),
    new Quaternion(0.0, 0.0, 1.0, 0.0),
    new Quaternion(0.707, 0.0, -0.707, 0.0),
  ];

  it("constructs quaternion spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: rotationPoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.ROTATION
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeChannel.channel).toBe(mockChannel);
    expect(runtimeChannel.runtimeAnimation).toBe(runtimeAnimation);
    expect(runtimeChannel.runtimeNode).toBe(runtimeNode);
    expect(runtimeChannel.spline instanceof QuaternionSpline).toBe(true);
  });

  const scalePoints = [
    new Cartesian3(1.0, 1.0, 1.0),
    new Cartesian3(1.0, 2.0, 1.0),
    new Cartesian3(1.0, 1.0, 2.0),
    new Cartesian3(2.0, 1.0, 1.0),
  ];

  it("constructs stepped spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.STEP,
      output: scalePoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.SCALE
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeChannel.channel).toBe(mockChannel);
    expect(runtimeChannel.runtimeAnimation).toBe(runtimeAnimation);
    expect(runtimeChannel.runtimeNode).toBe(runtimeNode);
    expect(runtimeChannel.spline instanceof SteppedSpline).toBe(true);
  });

  // This contains the keyframed data of two morph targets.
  const weightPoints = [0.0, 0.0, 0.5, 0.25, 1.0, 0.5, 0.5, 0.25];

  it("constructs weights spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.STEP,
      output: weightPoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.WEIGHTS
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeChannel.channel).toBe(mockChannel);
    expect(runtimeChannel.runtimeAnimation).toBe(runtimeAnimation);
    expect(runtimeChannel.runtimeNode).toBe(runtimeNode);
    expect(runtimeChannel.spline instanceof MorphWeightSpline).toBe(true);
  });

  const scratchTransform = new Matrix4();

  it("animates node translation", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.TRANSLATION
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeNode.translation).toEqual(Cartesian3.ZERO);
    expect(runtimeNode.transform).toEqual(Matrix4.IDENTITY);

    let time = times[1];
    let expected = Cartesian3.clone(translationPoints[1]);

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );

    time = (times[1] + times[2]) / 2.0;
    expected = Cartesian3.lerp(
      translationPoints[1],
      translationPoints[2],
      0.5,
      expected
    );

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );
  });

  it("animates node rotation", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: rotationPoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.ROTATION
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeNode.rotation).toEqual(Quaternion.IDENTITY);
    expect(runtimeNode.transform).toEqual(Matrix4.IDENTITY);

    let time = times[1];
    let expected = Quaternion.clone(rotationPoints[1]);
    let expectedMatrix = Matrix3.fromQuaternion(expected);

    runtimeChannel.animate(time);
    expect(runtimeNode.rotation).toEqual(expected);
    expect(
      runtimeNode.transform.equalsEpsilon(
        Matrix4.fromRotation(expectedMatrix, scratchTransform),
        CesiumMath.EPSILON6
      )
    ).toBe(true);

    time = (times[1] + times[2]) / 2.0;
    expected = Quaternion.slerp(
      rotationPoints[1],
      rotationPoints[2],
      0.5,
      expected
    );
    expectedMatrix = Matrix3.fromQuaternion(expected, expectedMatrix);

    runtimeChannel.animate(time);
    expect(
      runtimeNode.rotation.equalsEpsilon(expected, CesiumMath.EPSILON6)
    ).toEqual(true);
    expect(
      runtimeNode.transform.equalsEpsilon(
        Matrix4.fromRotation(expectedMatrix, scratchTransform),
        CesiumMath.EPSILON6
      )
    );
  });

  it("animates node scale", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: scalePoints,
    };

    const mockChannel = createMockChannel(
      runtimeNode,
      mockSampler,
      AnimatedPropertyType.SCALE
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    let expected = new Cartesian3(1.0, 1.0, 1.0);
    expect(runtimeNode.scale).toEqual(expected);
    expect(runtimeNode.transform).toEqual(Matrix4.IDENTITY);

    let time = times[1];
    expected = Cartesian3.clone(scalePoints[1], expected);

    runtimeChannel.animate(time);
    expect(runtimeNode.scale).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromScale(expected, scratchTransform)
    );

    time = (times[1] + times[2]) / 2.0;
    expected = Cartesian3.lerp(scalePoints[1], scalePoints[2], 0.5, expected);

    runtimeChannel.animate(time);
    expect(runtimeNode.scale).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromScale(expected, scratchTransform)
    );
  });

  //TODO: animates node weights
});
