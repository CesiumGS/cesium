import {
  Cartesian3,
  InterpolationType,
  JulianDate,
  Matrix4,
  ModelAnimationLoop,
  ModelComponents,
  ModelExperimentalAnimation,
  ModelRuntimeNode,
  Quaternion,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalAnimation", function () {
  const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

  const mockNode = {
    translation: Cartesian3.ZERO,
    rotation: Quaternion.IDENTITY,
    scale: new Cartesian3(1.0, 1.0, 1.0),
    index: 0,
  };

  let runtimeNode;
  let mockSceneGraph;
  let mockModel;

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
    mockSceneGraph = {
      _runtimeNodes: [],
    };

    runtimeNode = new ModelRuntimeNode({
      node: mockNode,
      transform: Matrix4.IDENTITY,
      transformToRoot: Matrix4.IDENTITY,
      sceneGraph: mockSceneGraph,
      children: [],
    });

    mockSceneGraph._runtimeNodes.push(runtimeNode);
    mockModel = {
      clampAnimations: true,
      sceneGraph: mockSceneGraph,
    };
  });

  const mockTranslationSampler = {
    input: [0, 0.5, 1.0],
    interpolation: InterpolationType.LINEAR,
    output: [
      Cartesian3.ZERO,
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(4.0, 5.0, 6.0),
    ],
  };

  const mockRotationSampler = {
    input: [0.25, 0.75, 1.25],
    interpolation: InterpolationType.STEP,
    output: [
      Quaternion.IDENTITY,
      new Quaternion(0.0, 0.0, 0.707, -0.707),
      Quaternion.IDENTITY,
    ],
  };

  const emptyOptions = {};

  it("initializes", function () {
    const mockAnimation = {
      channels: [
        createMockChannel(
          mockNode,
          mockTranslationSampler,
          AnimatedPropertyType.TRANSLATION
        ),
        createMockChannel(
          mockNode,
          mockRotationSampler,
          AnimatedPropertyType.ROTATION
        ),
      ],
      name: "Sample Animation",
    };

    const runtimeAnimation = new ModelExperimentalAnimation(
      mockModel,
      mockAnimation,
      emptyOptions
    );

    expect(runtimeAnimation.animation).toBe(mockAnimation);
    expect(runtimeAnimation.name).toEqual("Sample Animation");
    expect(runtimeAnimation.model).toBe(mockModel);

    const channels = runtimeAnimation.runtimeChannels;
    expect(channels.length).toEqual(2);
    expect(channels[0]._path).toEqual(AnimatedPropertyType.TRANSLATION);
    expect(channels[1]._path).toEqual(AnimatedPropertyType.ROTATION);

    expect(runtimeAnimation.localStartTime).toBe(0.0);
    expect(runtimeAnimation.localStopTime).toBe(1.25);

    expect(runtimeAnimation.startTime).toBeUndefined();
    expect(runtimeAnimation.delay).toBe(0.0);
    expect(runtimeAnimation.stopTime).toBeUndefined();
    expect(runtimeAnimation.removeOnStop).toBe(false);
    expect(runtimeAnimation.multiplier).toBe(1.0);
    expect(runtimeAnimation.reverse).toBe(false);
    expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.NONE);
  });

  it("initializes with options", function () {
    const mockAnimation = {
      channels: [
        createMockChannel(
          mockNode,
          mockTranslationSampler,
          AnimatedPropertyType.TRANSLATION
        ),
        createMockChannel(
          mockNode,
          mockRotationSampler,
          AnimatedPropertyType.ROTATION
        ),
      ],
      name: "Sample Animation",
    };

    const options = {
      startTime: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
      delay: 5.0,
      stopTime: JulianDate.fromDate(new Date("January 1, 2014 12:01:30 UTC")),
      multiplier: 0.5,
      reverse: true,
      loop: ModelAnimationLoop.REPEAT,
      removeOnStop: true,
    };

    const runtimeAnimation = new ModelExperimentalAnimation(
      mockModel,
      mockAnimation,
      options
    );

    expect(runtimeAnimation.animation).toBe(mockAnimation);
    expect(runtimeAnimation.name).toEqual("Sample Animation");
    expect(runtimeAnimation.model).toBe(mockModel);

    const channels = runtimeAnimation.runtimeChannels;
    expect(channels.length).toEqual(2);
    expect(channels[0]._path).toEqual(AnimatedPropertyType.TRANSLATION);
    expect(channels[1]._path).toEqual(AnimatedPropertyType.ROTATION);

    expect(runtimeAnimation.localStartTime).toBe(0.0);
    expect(runtimeAnimation.localStopTime).toBe(1.25);

    expect(runtimeAnimation.startTime).toEqual(options.startTime);
    expect(runtimeAnimation.delay).toBe(5.0);
    expect(runtimeAnimation.stopTime).toEqual(options.stopTime);
    expect(runtimeAnimation.removeOnStop).toBe(true);
    expect(runtimeAnimation.multiplier).toBe(0.5);
    expect(runtimeAnimation.reverse).toBe(true);
    expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.REPEAT);
  });

  it("initializes without invalid channels", function () {
    const mockAnimation = {
      channels: [
        createMockChannel(
          mockNode,
          mockTranslationSampler,
          AnimatedPropertyType.TRANSLATION
        ),
        {
          sampler: mockRotationSampler,
          target: undefined,
        },
      ],
      name: "Sample Animation",
    };

    const runtimeAnimation = new ModelExperimentalAnimation(
      mockModel,
      mockAnimation,
      emptyOptions
    );

    expect(runtimeAnimation.animation).toBe(mockAnimation);
    expect(runtimeAnimation.name).toEqual("Sample Animation");
    expect(runtimeAnimation.model).toBe(mockModel);

    const channels = runtimeAnimation.runtimeChannels;
    expect(channels.length).toEqual(1);
    expect(channels[0]._path).toEqual(AnimatedPropertyType.TRANSLATION);

    expect(runtimeAnimation.localStartTime).toBe(0.0);
    expect(runtimeAnimation.localStopTime).toBe(1.0);
  });

  it("animates", function () {
    const mockAnimation = {
      channels: [
        createMockChannel(
          mockNode,
          mockTranslationSampler,
          AnimatedPropertyType.TRANSLATION
        ),
        createMockChannel(
          mockNode,
          mockRotationSampler,
          AnimatedPropertyType.ROTATION
        ),
      ],
      name: "Sample Animation",
    };

    const runtimeAnimation = new ModelExperimentalAnimation(
      mockModel,
      mockAnimation,
      emptyOptions
    );

    expect(runtimeNode.translation).toEqual(Cartesian3.ZERO);
    expect(runtimeNode.rotation).toEqual(Quaternion.IDENTITY);

    runtimeAnimation.animate(0.5);

    expect(runtimeNode.translation).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    expect(runtimeNode.rotation).toEqual(Quaternion.IDENTITY);

    runtimeAnimation.animate(1.0);

    expect(runtimeNode.translation).toEqual(new Cartesian3(4.0, 5.0, 6.0));
    expect(runtimeNode.rotation).toEqual(
      new Quaternion(0.0, 0.0, 0.707, -0.707)
    );
  });
});
