import CubeMapPanorama from "../../Source/Scene/CubeMapPanorama.js";
import SceneMode from "../../Source/Scene/SceneMode.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import Credit from "../../Source/Core/Credit.js";
import Panorama from "../../Source/Scene/Panorama.js";

describe("Scene/CubeMapPanorama", function () {
  let frameState;
  let context;

  const validSources = {
    positiveX: "px.png",
    negativeX: "nx.png",
    positiveY: "py.png",
    negativeY: "ny.png",
    positiveZ: "pz.png",
    negativeZ: "nz.png",
  };

  beforeEach(function () {
    context = {};

    frameState = {
      mode: SceneMode.SCENE3D,
      passes: {
        render: true,
      },
      context: context,
      panoramaCommandList: [],
      creditDisplay: {
        addCreditToNextFrame: jasmine.createSpy("addCreditToNextFrame"),
      },
    };
  });

  it("conforms to Panorama interface", function () {
    expect(CubeMapPanorama).toConformToInterface(Panorama);
  });

  it("constructs with default values", function () {
    const panorama = new CubeMapPanorama({
      sources: validSources,
    });

    expect(panorama.show).toBe(true);
    expect(panorama.source).toBeUndefined();
    expect(panorama.transform).toBeUndefined();
    expect(panorama.isDestroyed()).toBe(false);
  });

  it("stores transform if provided", function () {
    const transform = Matrix4.IDENTITY;

    const panorama = new CubeMapPanorama({
      sources: validSources,
      transform: transform,
    });

    expect(panorama.transform).toBe(transform);
  });

  it("creates Credit from string", function () {
    const panorama = new CubeMapPanorama({
      sources: validSources,
      credit: "Test Credit",
    });

    expect(panorama._credit).toEqual(jasmine.any(Credit));
  });

  it("does not update when show is false", function () {
    const panorama = new CubeMapPanorama({
      sources: validSources,
      show: false,
    });

    const result = panorama.update(frameState, false);
    expect(result).toBeUndefined();
  });

  it("does not update in non-3D modes", function () {
    const panorama = new CubeMapPanorama({
      sources: validSources,
    });

    frameState.mode = SceneMode.SCENE2D;

    const result = panorama.update(frameState, false);
    expect(result).toBeUndefined();
  });

  it("throws if sources are missing faces", function () {
    const panorama = new CubeMapPanorama({
      sources: {
        positiveX: "px.png",
      },
    });

    expect(function () {
      panorama.update(frameState, false);
    }).toThrowDeveloperError();
  });

  it("throws if sources have mixed types", function () {
    const panorama = new CubeMapPanorama({
      sources: {
        positiveX: "px.png",
        negativeX: "nx.png",
        positiveY: "py.png",
        negativeY: "ny.png",
        positiveZ: "pz.png",
        negativeZ: new Image(),
      },
    });

    expect(function () {
      panorama.update(frameState, false);
    }).toThrowDeveloperError();
  });

  it("destroys resources", function () {
    const panorama = new CubeMapPanorama({
      sources: validSources,
    });

    panorama.destroy();
    expect(panorama.isDestroyed()).toBe(true);
  });
});
