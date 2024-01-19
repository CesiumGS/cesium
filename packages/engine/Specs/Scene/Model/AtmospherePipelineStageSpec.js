import {
  _shadersAtmosphereStageFS,
  _shadersAtmosphereStageVS,
  Atmosphere,
  Cartesian3,
  AtmospherePipelineStage,
  ModelRenderResources,
  Transforms,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/AtmospherePipelineStage",
  function () {
    const boxTexturedGlbUrl =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";

    let scene;
    let model;
    beforeAll(async function () {
      scene = createScene();

      const center = Cartesian3.fromDegrees(0, 0, 0);
      model = await loadAndZoomToModelAsync(
        {
          url: boxTexturedGlbUrl,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(center),
        },
        scene
      );
    });

    let renderResources;
    beforeEach(async function () {
      renderResources = new ModelRenderResources(model);

      // position the camera a little bit east of the model
      // and slightly above it.
      scene.frameState.camera.position = Cartesian3.fromDegrees(0.01, 0, 1000);
      scene.frameState.camera.direction = new Cartesian3(0, -1, 0);

      // Reset the fog density
      scene.fog.density = 2e-4;

      scene.atmosphere = new Atmosphere();
    });

    afterAll(async function () {
      scene.destroyForSpecs();
    });

    it("configures shader", function () {
      AtmospherePipelineStage.process(renderResources, model, scene.frameState);

      const shaderBuilder = renderResources.shaderBuilder;

      ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
        "HAS_ATMOSPHERE",
        "COMPUTE_POSITION_WC_ATMOSPHERE",
      ]);
      ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
        "HAS_ATMOSPHERE",
        "COMPUTE_POSITION_WC_ATMOSPHERE",
      ]);

      ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
        "vec3 v_atmosphereRayleighColor;",
        "vec3 v_atmosphereMieColor;",
        "float v_atmosphereOpacity;",
      ]);

      ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
        _shadersAtmosphereStageVS,
      ]);
      ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
        _shadersAtmosphereStageFS,
      ]);

      ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
        "uniform bool u_perFragmentGroundAtmosphere;",
      ]);
      ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
        "uniform bool u_isInFog;",
        "uniform bool u_perFragmentGroundAtmosphere;",
        "uniform bool u_shouldColorCorrect;",
      ]);
    });

    it("u_isInFog() is false if the camera is at the model center", function () {
      const frameState = scene.frameState;
      frameState.camera.position = Cartesian3.clone(
        model.boundingSphere.center,
        frameState.camera.position
      );
      scene.renderForSpecs();

      AtmospherePipelineStage.process(renderResources, model, frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(false);
    });

    it("u_isInFog() is false if the camera is in space", function () {
      const frameState = scene.frameState;

      frameState.camera.position = Cartesian3.fromDegrees(0.01, 0, 900000);
      scene.renderForSpecs();

      AtmospherePipelineStage.process(renderResources, model, frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(false);
    });

    it("u_isInFog() is true when the tile is in fog", function () {
      scene.renderForSpecs();

      AtmospherePipelineStage.process(renderResources, model, scene.frameState);

      const uniformMap = renderResources.uniformMap;
      expect(uniformMap.u_isInFog()).toBe(true);
    });

    it("u_perFragmentGroundAtmosphere() depends on camera height", function () {
      scene.renderForSpecs();
      AtmospherePipelineStage.process(renderResources, model, scene.frameState);

      const frameState = scene.frameState;
      const nightFadeStart = frameState.atmosphere.nightFadeRange.x;
      const uniformMap = renderResources.uniformMap;

      // Below the night fade range, the vertex shader is used for performance
      frameState.camera.position = new Cartesian3(nightFadeStart - 1000, 0, 0);
      scene.renderForSpecs();
      expect(uniformMap.u_perFragmentGroundAtmosphere()).toBe(false);

      // Above the night fade range, the fragment shader is used for accuracy
      frameState.camera.position = new Cartesian3(nightFadeStart + 1000, 0, 0);
      scene.renderForSpecs();
      expect(uniformMap.u_perFragmentGroundAtmosphere()).toBe(true);
    });

    it("u_shouldColorCorrect is true if any of the atmosphere HSB shift settings are set", function () {
      scene.renderForSpecs();
      AtmospherePipelineStage.process(renderResources, model, scene.frameState);

      // The default shift is 0, so the color correction code should not be
      // called.
      const shouldColorCorrect =
        renderResources.uniformMap.u_shouldColorCorrect;
      expect(shouldColorCorrect()).toBe(false);

      // If any individual parameter is nonzero, the uniform will return true
      const frameState = scene.frameState;
      const atmosphere = frameState.atmosphere;
      atmosphere.hueShift = 1.0;
      expect(shouldColorCorrect()).toBe(true);

      atmosphere.hueShift = 0.0;
      atmosphere.saturationShift = -1.0;
      expect(shouldColorCorrect()).toBe(true);

      atmosphere.saturationShift = 0.0;
      atmosphere.brightnessShift = 0.5;
      expect(shouldColorCorrect()).toBe(true);

      // Setting all of the parameters should work too.
      atmosphere.hueShift = 0.1;
      atmosphere.saturationShift = 0.2;
      atmosphere.brightnessShift = 0.3;
      expect(shouldColorCorrect()).toBe(true);
    });
  },
  "WebGL"
);
