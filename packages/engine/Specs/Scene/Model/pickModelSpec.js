import {
  pickModel,
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  HeadingPitchRange,
  Math as CesiumMath,
  Model,
  Ray,
  SceneMode,
} from "../../../index.js";

import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";
import createScene from "../../../../../Specs/createScene.js";

describe("Scene/Model/pickModel", function () {
  const boxTexturedGltfUrl =
    "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf";
  const boxInstanced =
    "./Data/Models/glTF-2.0/BoxInstancedNoNormals/glTF/BoxInstancedNoNormals.gltf";
  const boxWithOffsetUrl =
    "./Data/Models/glTF-2.0/BoxWithOffset/glTF/BoxWithOffset.gltf";
  const pointCloudUrl =
    "./Data/Models/glTF-2.0/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
  const boxWithMixedCompression =
    "./Data/Models/glTF-2.0/BoxMixedCompression/glTF/BoxMixedCompression.gltf";
  const boxWithQuantizedAttributes =
    "./Data/Models/glTF-2.0/BoxWeb3dQuantizedAttributes/glTF/BoxWeb3dQuantizedAttributes.gltf";
  const boxCesiumRtcUrl =
    "./Data/Models/glTF-2.0/BoxCesiumRtc/glTF/BoxCesiumRtc.gltf";
  const boxBackFaceCullingUrl =
    "./Data/Models/glTF-2.0/BoxBackFaceCulling/glTF/BoxBackFaceCulling.gltf";
  const boxInterleaved =
    "./Data/Models/glTF-2.0/BoxInterleaved/glTF/BoxInterleaved.gltf";

  let scene;
  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    scene.frameState.mode = SceneMode.SCENE3D;
    scene.primitives.removeAll();
  });

  it("throws without model", function () {
    expect(() => pickModel()).toThrowDeveloperError();
  });

  it("throws without ray", async function () {
    const model = await Model.fromGltfAsync({
      url: boxTexturedGltfUrl,
    });
    expect(() => pickModel(model)).toThrowDeveloperError();
  });

  it("throws without frameState", async function () {
    const model = await Model.fromGltfAsync({
      url: boxTexturedGltfUrl,
      enablePick: !scene.frameState.context.webgl2,
    });
    const ray = new Ray();
    expect(() => pickModel(model, ray)).toThrowDeveloperError();
  });

  it("returns undefined if model is not ready", async function () {
    const model = await Model.fromGltfAsync({
      url: boxTexturedGltfUrl,
      enablePick: !scene.frameState.context.webgl2,
    });
    const ray = new Ray();
    expect(pickModel(model, ray, scene.frameState)).toBeUndefined();
  });

  it("returns undefined if ray does not intersect model surface", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = new Ray();
    expect(pickModel(model, ray, scene.frameState)).toBeUndefined();
  });

  it("returns position of intersection between ray and model surface", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0.5, 0, 0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns position of intersection between ray and model surface with enablePick in WebGL 1", async function () {
    const sceneWithWebgl1 = createScene({
      contextOptions: {
        requestWebgl1: true,
      },
    });

    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: true,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0.5, 0, 0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );

    sceneWithWebgl1.destroyForSpecs();
  });

  it("returns position of intersection accounting for node transforms", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxWithOffsetUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0.0, 5.5, -0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns position of intersection with RTC model", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxCesiumRtcUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(6378137.5, 0.0, -0.499999996649);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON8
    );
  });

  it("returns position of intersection with quantzed model", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxWithQuantizedAttributes,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0.5, 0, 0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns position of intersection with mixed compression model", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxWithMixedCompression,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(1.0, 0, 1.0);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns position of intersection with interleaved model", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxInterleaved,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0.5, 0, 0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns position of intersection with instanced model", async function () {
    // None of the 4 instanced cubes are in the center of the model's bounding
    // sphere, so set up a camera view that focuses in on one of them.
    const offset = new HeadingPitchRange(
      CesiumMath.PI_OVER_TWO,
      -CesiumMath.PI_OVER_FOUR,
      1
    );

    const model = await loadAndZoomToModelAsync(
      {
        url: boxInstanced,
        enablePick: !scene.frameState.context.webgl2,
        offset,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(0, -0.5, 0.5);
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("returns undefined for point cloud", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: pointCloudUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    expect(pickModel(model, ray, scene.frameState)).toBeUndefined();
  });

  it("cullsBackFaces by default", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );
    ray.origin = model.boundingSphere.center;

    expect(pickModel(model, ray, scene.frameState)).toBeUndefined();
  });

  it("includes back faces results when model disables backface culling", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxBackFaceCullingUrl,
        enablePick: !scene.frameState.context.webgl2,
        backFaceCulling: false,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    ray.origin = model.boundingSphere.center;

    const expected = new Cartesian3(
      -0.9999998807907355,
      0,
      -0.9999998807907104
    );
    expect(pickModel(model, ray, scene.frameState)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON12
    );
  });

  it("uses result parameter if specified", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const result = new Cartesian3();
    const expected = new Cartesian3(0.5, 0, 0.5);
    const returned = pickModel(
      model,
      ray,
      scene.frameState,
      undefined,
      undefined,
      undefined,
      result
    );
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    expect(returned).toBe(result);
  });

  it("returns undefined when morphing", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    scene.frameState.mode = SceneMode.MORPHING;
    expect(pickModel(model, ray, scene.frameState)).toBeUndefined();
  });

  it("returns position with vertical exaggeration", async function () {
    const model = await loadAndZoomToModelAsync(
      {
        url: boxTexturedGltfUrl,
        enablePick: !scene.frameState.context.webgl2,
      },
      scene
    );
    const ray = scene.camera.getPickRay(
      new Cartesian2(
        scene.drawingBufferWidth / 2.0,
        scene.drawingBufferHeight / 2.0
      )
    );

    const expected = new Cartesian3(-65.51341504, 0, -65.51341504);
    expect(
      pickModel(
        model,
        ray,
        scene.frameState,
        2.0,
        -Ellipsoid.WGS84.minimumRadius
      )
    ).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });
});
