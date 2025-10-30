import { Cartesian3, Model, Pass, Transforms } from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

describe("Scene/Model/EdgeVisibilityRendering", function () {
  let scene;
  const edgeVisibilityTestData =
    "./Data/Models/glTF-2.0/EdgeVisibility/glTF-Binary/EdgeVisibility2.glb";

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    scene.primitives.removeAll();
    scene._enableEdgeVisibility = true;
  });

  function waitForModelReady(model) {
    return pollToPromise(function () {
      scene.renderForSpecs();
      return model.ready;
    });
  }

  async function loadEdgeVisibilityModel() {
    const model = await Model.fromGltfAsync({
      url: edgeVisibilityTestData,
      modelMatrix: Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(0.0, 0.0, 100.0),
      ),
    });

    scene.primitives.add(model);
    await waitForModelReady(model);
    return model;
  }

  it("validates u_isEdgePass uniform and framebuffer attachments", async function () {
    // Skip this test in WebGL stub environment
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    await loadEdgeVisibilityModel();

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let edgeCommand = null;
    let regularCommand = null;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES) {
        edgeCommand = command;
      } else if (command.pass === Pass.CESIUM_3D_TILE) {
        regularCommand = command;
      }
    }

    expect(edgeCommand).toBeDefined();
    expect(regularCommand).toBeDefined();

    if (
      edgeCommand &&
      edgeCommand.uniformMap &&
      edgeCommand.uniformMap.u_isEdgePass
    ) {
      expect(edgeCommand.uniformMap.u_isEdgePass()).toBe(true);
    }

    if (
      regularCommand &&
      regularCommand.uniformMap &&
      regularCommand.uniformMap.u_isEdgePass
    ) {
      expect(regularCommand.uniformMap.u_isEdgePass()).toBe(false);
    }

    // Verify edge framebuffer attachments are not default textures
    expect(scene._view.edgeFramebuffer).toBeDefined();
    const edgeFramebuffer = scene._view.edgeFramebuffer;
    expect(edgeFramebuffer.colorTexture).not.toBe(scene.context.defaultTexture);

    if (edgeFramebuffer._supportsMRT && edgeFramebuffer.idTexture) {
      expect(edgeFramebuffer.idTexture).not.toBe(scene.context.defaultTexture);
    }
  });

  it("validates EdgeVisibility shader code and uniforms", async function () {
    // Skip this test in WebGL stub environment
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    await loadEdgeVisibilityModel();

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let edgeCommand = null;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES) {
        edgeCommand = command;
        break;
      }
    }

    expect(edgeCommand).toBeDefined();

    const vertexShader = edgeCommand.shaderProgram._vertexShaderText;
    const fragmentShader = edgeCommand.shaderProgram._fragmentShaderText;

    // Verify EdgeVisibility stage shader defines
    expect(vertexShader).toContain("HAS_EDGE_VISIBILITY");
    expect(fragmentShader).toContain("HAS_EDGE_VISIBILITY");
    expect(fragmentShader).toContain("HAS_EDGE_VISIBILITY_MRT");

    // Verify edge visibility uniforms and attributes
    expect(vertexShader).toContain("u_isEdgePass");
    expect(vertexShader).toContain("a_edgeType");
    expect(vertexShader).toContain("a_silhouetteNormal");
    expect(vertexShader).toContain("a_faceNormalA");
    expect(vertexShader).toContain("a_faceNormalB");

    // Verify varying variables for normal calculations
    expect(vertexShader).toContain("v_edgeType");
    expect(vertexShader).toContain("v_faceNormalAView");
    expect(vertexShader).toContain("v_faceNormalBView");

    // Verify fragment shader edge type color coding
    expect(fragmentShader).toContain("v_edgeType * 255.0");

    // Verify silhouette normal calculation
    expect(fragmentShader).toContain("normalize(v_faceNormalAView)");
    expect(fragmentShader).toContain("normalize(v_faceNormalBView)");
    expect(fragmentShader).toContain("dot(normalA, viewDir)");
    expect(fragmentShader).toContain("dot(normalB, viewDir)");

    // Verify MRT output (color attachment 1)
    expect(fragmentShader).toContain("out_id");
    expect(fragmentShader).toContain("featureIds.featureId_0");

    expect(edgeCommand.uniformMap.u_isEdgePass()).toBe(true);
  });

  it("validates EdgeDetection shader code and texture sampling", async function () {
    // Skip this test in WebGL stub environment
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    await loadEdgeVisibilityModel();

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let regularCommand = null;

    // Prefer the regular 3D Tiles pass command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE) {
        regularCommand = command;
        break;
      }
    }

    // Fallback to content search if not found by pass
    if (!regularCommand) {
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (
          cmd.shaderProgram &&
          typeof cmd.shaderProgram._fragmentShaderText === "string" &&
          cmd.shaderProgram._fragmentShaderText.indexOf(
            "edgeDetectionStage",
          ) !== -1
        ) {
          regularCommand = cmd;
          break;
        }
      }
    }

    expect(regularCommand).toBeDefined();

    const fragmentShader = regularCommand.shaderProgram._fragmentShaderText;

    // Verify EdgeDetection stage shader includes edge detection function
    expect(fragmentShader).toContain("edgeDetectionStage");
    expect(fragmentShader).toContain("u_isEdgePass");

    // Verify screen coordinate calculation
    expect(fragmentShader).toContain("gl_FragCoord.xy / czm_viewport.zw");

    // Verify texture sampling from EdgeVisibility pass output
    expect(fragmentShader).toContain("czm_edgeColorTexture");
    expect(fragmentShader).toContain("czm_edgeIdTexture");
    expect(fragmentShader).toContain("czm_globeDepthTexture");

    // Verify edge ID presence and feature IDs visibility logic exists
    expect(fragmentShader).toContain("edgeId.r > 0.0");
    expect(fragmentShader).toContain("edgeId.g");
    expect(fragmentShader).toContain("featureIds.featureId_0");

    // Verify depth usage for background/globe rendering
    expect(fragmentShader).toContain("czm_unpackDepth");
    expect(fragmentShader).toContain("geomDepthLinear > globeDepth");

    // Verify the color can inherit from edge pass
    expect(fragmentShader).toContain("color = edgeColor");

    // Verify the uniforms reference correct textures
    const uniformState = scene.context.uniformState;
    const edgeFramebuffer = scene._view.edgeFramebuffer;
    expect(uniformState.edgeColorTexture).toBe(edgeFramebuffer.colorTexture);
    if (edgeFramebuffer._supportsMRT) {
      expect(uniformState.edgeIdTexture).toBe(edgeFramebuffer.idTexture);
    }
  });
});
