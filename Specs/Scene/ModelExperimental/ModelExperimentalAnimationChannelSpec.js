import {
  Axis,
  Cartesian3,
  ConstantSpline,
  InterpolationType,
  LinearSpline,
  Matrix4,
  ModelComponents,
  ModelExperimentalAnimationChannel,
  ModelExperimentalNode,
  MorphWeightSpline,
  SteppedSpline,
  Quaternion,
  QuaternionSpline,
} from "../../../Source/Cesium.js";

fdescribe("Scene/ModelExperimental/ModelExperimentalAnimationChannel", function () {
  const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

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

  const runtimeAnimation = {};
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

  it("constructs linear spline", function () {
    const mockSampler = {
      input: [0.0, 0.25, 0.5, 1.0],
      interpolation: InterpolationType.LINEAR,
      output: [
        Cartesian3.ZERO,
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
        new Cartesian3(0.0, 1.0, 0.0),
      ],
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

  it("constructs quaternion spline", function () {
    const mockSampler = {
      input: [0.0, 0.25, 0.5, 1.0],
      interpolation: InterpolationType.LINEAR,
      output: [
        Quaternion.IDENTITY,
        new Quaternion(0.707, 0.0, 0.707, 0.0),
        new Quaternion(0.0, 0.0, 1.0, 0.0),
        new Quaternion(0.707, 0.0, -0.707, 0.0),
      ],
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

  it("constructs stepped spline", function () {
    const mockSampler = {
      input: [0.0, 0.25, 0.5, 1.0],
      interpolation: InterpolationType.STEP,
      output: [
        Cartesian3.ZERO,
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
        new Cartesian3(0.0, 1.0, 0.0),
      ],
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

  it("constructs weights spline", function () {
    // This sampler describes the keyframed data of two morph targets.
    const mockSampler = {
      input: [0.0, 0.25, 0.5, 1.0],
      interpolation: InterpolationType.STEP,
      output: [0.0, 0.0, 0.5, 0.25, 1.0, 0.5, 0.5, 0.25],
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
      input: [0.0, 0.25, 0.5, 1.0],
      interpolation: InterpolationType.LINEAR,
      output: [
        Cartesian3.ZERO,
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
        new Cartesian3(0.0, 1.0, 0.0),
      ],
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

    const time = mockSampler.input[1];
    const expected = mockSampler.output[1];
    runtimeChannel.animate(time);
    expect(runtimeNode.translation).toEqual(expected);
    /*expect(runtimeNode.transform).toEqual(
      Matrix4.fromTranslation(expected, scratchTransform)
    );*/
  });
});
