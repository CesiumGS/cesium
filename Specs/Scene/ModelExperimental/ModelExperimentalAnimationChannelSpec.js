import {
  Axis,
  Cartesian3,
  HermiteSpline,
  ConstantSpline,
  InterpolationType,
  LinearSpline,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  ModelComponents,
  ModelExperimentalAnimationChannel,
  ModelExperimentalRuntimeNode,
  SteppedSpline,
  Quaternion,
  QuaternionSpline,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalAnimationChannel", function () {
  const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

  const times = [0.0, 0.25, 0.5, 1.0];
  const translationPoints = [
    Cartesian3.ZERO,
    new Cartesian3(1.0, 0.0, 0.0),
    new Cartesian3(1.0, 1.0, 0.0),
    new Cartesian3(0.0, 1.0, 0.0),
  ];
  const rotationPoints = [
    Quaternion.IDENTITY,
    new Quaternion(0.707, 0.0, 0.707, 0.0),
    new Quaternion(0.0, 0.0, 1.0, 0.0),
    new Quaternion(0.707, 0.0, -0.707, 0.0),
  ];
  const scalePoints = [
    new Cartesian3(1.0, 1.0, 1.0),
    new Cartesian3(1.0, 2.0, 1.0),
    new Cartesian3(1.0, 1.0, 2.0),
    new Cartesian3(2.0, 1.0, 1.0),
  ];

  // This contains the keyframed data of two morph targets.
  const weightPoints = [0.0, 0.0, 0.5, 0.25, 1.0, 0.5, 0.5, 0.25];

  const mockNode = {
    translation: Cartesian3.ZERO,
    rotation: Quaternion.IDENTITY,
    scale: new Cartesian3(1.0, 1.0, 1.0),
  };

  const scratchTransform = new Matrix4();
  const transform = Matrix4.clone(Matrix4.IDENTITY);
  const transformToRoot = Matrix4.clone(Matrix4.IDENTITY);
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.clone(Matrix4.IDENTITY),
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

  function createMockChannel(mockNode, mockSampler, path) {
    const mockTarget = {
      node: mockNode,
      path: path,
    };
    const mockChannel = {
      sampler: mockSampler,
      target: mockTarget,
    };
    return mockChannel;
  }

  beforeEach(function () {
    runtimeNode = new ModelExperimentalRuntimeNode({
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

  it("constructs constant spline", function () {
    const mockSampler = {
      input: [0.0],
      interpolation: InterpolationType.LINEAR,
      output: [Cartesian3.ZERO],
    };

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(1);
    expect(runtimeChannel.splines[0] instanceof ConstantSpline).toBe(true);
  });

  it("constructs linear spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(1);
    expect(runtimeChannel.splines[0] instanceof LinearSpline).toBe(true);
  });

  it("constructs quaternion spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: rotationPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(1);
    expect(runtimeChannel.splines[0] instanceof QuaternionSpline).toBe(true);
  });

  it("constructs stepped spline", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.STEP,
      output: scalePoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(1);
    expect(runtimeChannel.splines[0] instanceof SteppedSpline).toBe(true);
  });

  it("constructs cubic spline", function () {
    const cubicTimes = [0.0, 0.5, 1.0];
    // These points don't represent meaningful tangents.
    // They are dummy values to test the construction of the spline.
    const cubicPoints = [
      Cartesian3.ZERO,
      new Cartesian3(1, 1, 1),
      new Cartesian3(2, 2, 2),
      new Cartesian3(3, 3, 3),
      new Cartesian3(4, 4, 4),
      new Cartesian3(5, 5, 5),
      new Cartesian3(6, 6, 6),
      new Cartesian3(7, 7, 7),
      new Cartesian3(8, 8, 8),
    ];

    const mockSampler = {
      input: cubicTimes,
      interpolation: InterpolationType.CUBICSPLINE,
      output: cubicPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(1);
    expect(runtimeChannel.splines[0] instanceof HermiteSpline).toBe(true);

    const spline = runtimeChannel.splines[0];

    const expectedInTangents = [cubicPoints[3], cubicPoints[6]];
    const expectedOutTangents = [cubicPoints[2], cubicPoints[5]];
    const expectedPoints = [cubicPoints[1], cubicPoints[4], cubicPoints[7]];

    expect(spline.inTangents).toEqual(expectedInTangents);
    expect(spline.outTangents).toEqual(expectedOutTangents);
    expect(spline.points).toEqual(expectedPoints);
  });

  it("constructs weight splines", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: weightPoints,
    };

    runtimeNode._morphWeights = [0.0, 0.0];

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(2);
    expect(runtimeChannel.splines[0] instanceof LinearSpline).toBe(true);
    expect(runtimeChannel.splines[1] instanceof LinearSpline).toBe(true);
  });

  it("constructs cubic weight splines", function () {
    const cubicWeightTimes = [0.0, 0.5];
    // prettier-ignore
    const cubicWeightPoints = [
        0.0, 0.0,  // in-tangents of both morph targets, first keyframe
        0.0, 0.0,  // values of both morph targets, first keyframe
        0.2, -0.5, // out-tangents of both morph targets, first keyframe
        0.3, 0.0,  // in-tangents, second keyframe
        1.0, 0.5,  // values, second keyframe
        0.0, 0.0]; // out-tangents, second keyframe

    const mockSampler = {
      input: cubicWeightTimes,
      interpolation: InterpolationType.CUBICSPLINE,
      output: cubicWeightPoints,
    };

    runtimeNode._morphWeights = [0.0, 0.0];

    const mockChannel = createMockChannel(
      mockNode,
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
    expect(runtimeChannel.splines.length).toBe(2);

    const firstSpline = runtimeChannel.splines[0];
    expect(firstSpline instanceof HermiteSpline).toBe(true);
    expect(firstSpline.inTangents).toEqual([0.3]);
    expect(firstSpline.points).toEqual([0.0, 1.0]);
    expect(firstSpline.outTangents).toEqual([0.2]);

    const secondSpline = runtimeChannel.splines[1];
    expect(secondSpline instanceof HermiteSpline).toBe(true);
    expect(secondSpline.inTangents).toEqual([0.0]);
    expect(secondSpline.points).toEqual([0.0, 0.5]);
    expect(secondSpline.outTangents).toEqual([-0.5]);
  });

  it("animates node translation", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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
      mockNode,
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
      mockNode,
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

  it("animates node weights", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: weightPoints,
    };

    runtimeNode._morphWeights = [0.0, 0.0];

    const mockChannel = createMockChannel(
      mockNode,
      mockSampler,
      AnimatedPropertyType.WEIGHTS
    );

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    let expected = [0.0, 0.0];
    expect(runtimeNode.morphWeights).toEqual(expected);

    let time = times[1];
    expected = weightPoints.slice(2, 4);

    runtimeChannel.animate(time);
    expect(runtimeNode.morphWeights).toEqual(expected);

    time = (times[1] + times[2]) / 2.0;
    expected[0] = (weightPoints[2] + weightPoints[4]) / 2.0;
    expected[1] = (weightPoints[3] + weightPoints[5]) / 2.0;

    runtimeChannel.animate(time);
    expect(runtimeNode.morphWeights).toEqual(expected);
  });

  it("clamps animations", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
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

    let time = 10.0;
    let expected = Cartesian3.clone(translationPoints[3]);

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );

    time = -10.0;
    expected = Cartesian3.clone(translationPoints[0]);

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );
  });

  it("wraps animations", function () {
    const mockSampler = {
      input: times,
      interpolation: InterpolationType.LINEAR,
      output: translationPoints,
    };

    const mockChannel = createMockChannel(
      mockNode,
      mockSampler,
      AnimatedPropertyType.TRANSLATION
    );

    const wrappedRuntimeAnimation = {
      model: {
        clampedAnimations: false,
      },
    };

    const runtimeChannel = new ModelExperimentalAnimationChannel({
      channel: mockChannel,
      runtimeAnimation: wrappedRuntimeAnimation,
      runtimeNode: runtimeNode,
    });

    expect(runtimeNode.translation).toEqual(Cartesian3.ZERO);
    expect(runtimeNode.transform).toEqual(Matrix4.IDENTITY);

    let time = 1.25;
    let expected = Cartesian3.clone(translationPoints[1]);

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );

    time = -0.5;
    expected = Cartesian3.clone(translationPoints[2]);

    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );
  });
});
