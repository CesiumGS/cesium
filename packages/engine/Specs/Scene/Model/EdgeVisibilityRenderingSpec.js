import {
  Cartesian3,
  Color,
  FixedFrameTransforms as Transforms,
  Matrix4,
  defined,
} from "@cesium/core";
import { EdgeDisplayMode, Model, Pass } from "../../../index.js";
import concatTypedArrays from "../../../../../Specs/concatTypedArrays.js";
import createCanvas from "../../../../../Specs/createCanvas.js";
import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe("Scene/Model/EdgeVisibilityRendering", function () {
  let scene;
  const edgeVisibilityTestData =
    "./Data/Models/glTF-2.0/EdgeVisibility/glTF-Binary/EdgeVisibility.glb";

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

  async function loadEdgeVisibilityModel(edgeDisplayMode) {
    const model = await Model.fromGltfAsync({
      url: edgeVisibilityTestData,
      modelMatrix: Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(0.0, 0.0, 100.0),
      ),
    });
    if (defined(edgeDisplayMode)) {
      model.edgeDisplayMode = edgeDisplayMode;
    }

    scene.primitives.add(model);
    await waitForModelReady(model);
    return model;
  }

  function getEdgeCommands(model) {
    return model._sceneGraph._runtimeNodes
      .flatMap((node) => node.runtimePrimitives)
      .map((runtimePrimitive) => runtimePrimitive.drawCommand._edgeCommand)
      .filter((edgeCommand) => defined(edgeCommand));
  }

  it("SURFACES_ONLY builds no edge geometry and does not enable scene edge visibility", async function () {
    scene._enableEdgeVisibility = false;
    const model = await loadEdgeVisibilityModel();
    scene.renderForSpecs();

    expect(model._edgeGeometryNeeded).toBe(false);
    expect(getEdgeCommands(model).length).toBe(0);
    expect(scene.frameState.edgeVisibilityRequested).toBe(false);
    expect(scene._enableEdgeVisibility).toBe(false);
  });

  it("builds edge geometry when edges become displayed and destroys it when hidden again", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    scene._enableEdgeVisibility = false;
    const model = await loadEdgeVisibilityModel();
    scene.renderForSpecs();
    expect(getEdgeCommands(model).length).toBe(0);

    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;
    scene.renderForSpecs();
    const edgeCommands = getEdgeCommands(model);
    expect(edgeCommands.length).toBeGreaterThan(0);
    expect(scene.frameState.edgeVisibilityRequested).toBe(true);
    expect(scene._enableEdgeVisibility).toBe(true);

    // EDGES_ONLY <-> SURFACES_AND_EDGES needs no rebuild.
    model.edgeDisplayMode = EdgeDisplayMode.EDGES_ONLY;
    scene.renderForSpecs();
    expect(getEdgeCommands(model)).toEqual(edgeCommands);
    expect(scene.frameState.edgeVisibilityRequested).toBe(false);

    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_ONLY;
    scene.renderForSpecs();
    expect(getEdgeCommands(model).length).toBe(0);
    for (const edgeCommand of edgeCommands) {
      expect(edgeCommand.command.vertexArray.isDestroyed()).toBe(true);
    }
  });

  it("builds edge geometry for snapping in SURFACES_ONLY without enabling scene edge visibility", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    scene._enableEdgeVisibility = false;
    const model = await loadEdgeVisibilityModel();
    scene.renderForSpecs();
    expect(getEdgeCommands(model).length).toBe(0);

    // Simulate the model being updated during a snap pass.
    const frameState = scene.frameState;
    frameState.passes.snap = true;
    model.update(frameState);
    frameState.passes.snap = false;

    expect(model._edgeGeometryNeededForSnapping).toBe(true);
    const edgeCommands = getEdgeCommands(model);
    expect(edgeCommands.length).toBeGreaterThan(0);

    // Edges stay hidden and the snap latch survives a color render.
    scene.renderForSpecs();
    expect(getEdgeCommands(model)).toEqual(edgeCommands);
    expect(scene.frameState.edgeVisibilityRequested).toBe(false);
    expect(scene._enableEdgeVisibility).toBe(false);
    const edgePasses = scene.frameState.commandList.filter(
      (command) =>
        command.pass === Pass.CESIUM_3D_TILE_EDGES ||
        command.pass === Pass.CESIUM_3D_TILE_EDGES_DIRECT,
    );
    expect(edgePasses.length).toBe(0);

    // Hiding edges after they were displayed keeps them for snapping.
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;
    scene.renderForSpecs();
    expect(getEdgeCommands(model)).toEqual(edgeCommands);
    expect(scene.frameState.edgeVisibilityRequested).toBe(true);
    expect(scene._enableEdgeVisibility).toBe(true);
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_ONLY;
    scene.renderForSpecs();
    expect(getEdgeCommands(model)).toEqual(edgeCommands);
    expect(scene.frameState.edgeVisibilityRequested).toBe(false);
  });

  it("validates u_isEdgePass uniform and framebuffer attachments", async function () {
    // Skip this test in WebGL stub environment
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let edgeCommand;
    let regularCommand;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES) {
        edgeCommand = command;
      } else if (
        command.pass === Pass.OPAQUE ||
        command.pass === Pass.CESIUM_3D_TILE
      ) {
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

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let edgeCommand;

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

    // Verify MRT output (color attachment 1 and 2)
    expect(fragmentShader).toContain("out_id");
    expect(fragmentShader).toContain("out_edgeDepth");

    expect(edgeCommand.uniformMap.u_isEdgePass()).toBe(true);
  });

  it("validates EdgeDetection shader code and texture sampling", async function () {
    // Skip this test in WebGL stub environment
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

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
    expect(fragmentShader).toContain("czm_edgeDepthTexture");

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

  it("SURFACES_ONLY produces no edge commands", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_ONLY;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let hasEdgeCommand = false;
    let hasSurfaceCommand = false;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (
        command.pass === Pass.CESIUM_3D_TILE_EDGES ||
        command.pass === Pass.CESIUM_3D_TILE_EDGES_DIRECT
      ) {
        hasEdgeCommand = true;
      }
      if (
        command.pass === Pass.OPAQUE ||
        command.pass === Pass.CESIUM_3D_TILE
      ) {
        hasSurfaceCommand = true;
      }
    }

    expect(hasEdgeCommand).toBe(false);
    expect(hasSurfaceCommand).toBe(true);
  });

  it("SURFACES_AND_EDGES produces both surface and MRT edge commands", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let hasMRTEdgeCommand = false;
    let hasDirectEdgeCommand = false;
    let hasSurfaceCommand = false;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES) {
        hasMRTEdgeCommand = true;
      }
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES_DIRECT) {
        hasDirectEdgeCommand = true;
      }
      if (
        command.pass === Pass.OPAQUE ||
        command.pass === Pass.CESIUM_3D_TILE
      ) {
        hasSurfaceCommand = true;
      }
    }

    expect(hasMRTEdgeCommand).toBe(true);
    expect(hasDirectEdgeCommand).toBe(false);
    expect(hasSurfaceCommand).toBe(true);
  });

  it("EDGES_ONLY produces only direct edge commands with no surface commands", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.EDGES_ONLY;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const commands = scene.frameState.commandList;
    let hasMRTEdgeCommand = false;
    let hasDirectEdgeCommand = false;
    let hasSurfaceCommand = false;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES) {
        hasMRTEdgeCommand = true;
      }
      if (command.pass === Pass.CESIUM_3D_TILE_EDGES_DIRECT) {
        hasDirectEdgeCommand = true;
      }
      if (
        command.pass === Pass.OPAQUE ||
        command.pass === Pass.CESIUM_3D_TILE
      ) {
        hasSurfaceCommand = true;
      }
    }

    expect(hasMRTEdgeCommand).toBe(false);
    expect(hasDirectEdgeCommand).toBe(true);
    expect(hasSurfaceCommand).toBe(false);
  });

  it("SURFACES_AND_EDGES enables scene edge visibility for a standalone model", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    scene._enableEdgeVisibility = false;
    await loadEdgeVisibilityModel(EdgeDisplayMode.SURFACES_AND_EDGES);
    scene.renderForSpecs();

    expect(scene._enableEdgeVisibility).toBe(true);
  });

  it("SURFACES_AND_EDGES enables scene edge visibility when draw commands are built in prePassesUpdate", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await Model.fromGltfAsync({
      url: edgeVisibilityTestData,
      modelMatrix: Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(0.0, 0.0, 100.0),
      ),
    });
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    // Mimic Cesium3DTileset: tile content updates (and builds draw commands)
    // in prePassesUpdate, before Scene resets frameState.edgeVisibilityRequested.
    scene.primitives.add({
      prePassesUpdate: (frameState) => model.update(frameState),
      update: (frameState) => model.update(frameState),
      isDestroyed: () => false,
      destroy: () => model.destroy(),
    });
    await waitForModelReady(model);
    // Let one-time post-ready rebuilds (e.g. texturesLoaded) settle.
    scene.renderForSpecs();
    scene.renderForSpecs();

    // Force the next draw-command build to happen in prePassesUpdate.
    scene._enableEdgeVisibility = false;
    model.resetDrawCommands();
    scene.renderForSpecs();

    expect(scene._enableEdgeVisibility).toBe(true);
  });

  it("EDGES_ONLY does not enable scene edge visibility", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    scene._enableEdgeVisibility = false;
    await loadEdgeVisibilityModel(EdgeDisplayMode.EDGES_ONLY);
    scene.renderForSpecs();

    expect(scene._enableEdgeVisibility).toBe(false);
  });

  [EdgeDisplayMode.SURFACES_ONLY, EdgeDisplayMode.EDGES_ONLY].forEach(
    function (initialMode) {
      it(`initializes the edge framebuffer on the first requested frame after switching from mode ${initialMode} to SURFACES_AND_EDGES`, async function () {
        if (!!window.webglStub) {
          pending("Skipping test in WebGL stub environment");
        }

        // Use a fresh scene so earlier specs cannot leave an allocated MRT.
        const requestRenderScene = createScene();
        try {
          const model = await Model.fromGltfAsync({
            url: edgeVisibilityTestData,
            edgeDisplayMode: initialMode,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0.0, 0.0, 100.0),
            ),
          });
          requestRenderScene.primitives.add(model);
          await pollToPromise(function () {
            requestRenderScene.renderForSpecs();
            return model.ready;
          });
          requestRenderScene.renderForSpecs();
          requestRenderScene.renderForSpecs();

          const edgeFramebuffer = requestRenderScene._view.edgeFramebuffer;
          expect(edgeFramebuffer.framebuffer).toBeUndefined();

          requestRenderScene.requestRenderMode = true;
          requestRenderScene.maximumRenderTimeChange = Infinity;
          model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;
          requestRenderScene.requestRender();
          requestRenderScene.renderForSpecs();

          expect(edgeFramebuffer.framebuffer).toBeDefined();
          expect(edgeFramebuffer.colorTexture).toBeDefined();
          expect(edgeFramebuffer.idTexture).toBeDefined();
          expect(edgeFramebuffer.depthTexture).toBeDefined();
        } finally {
          requestRenderScene.destroyForSpecs();
        }
      });
    },
  );

  it("registers edge vertex array as a pipeline resource and destroys it on draw command rebuild", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    const runtimePrimitives = model._sceneGraph._runtimeNodes.flatMap(
      (node) => node.runtimePrimitives,
    );
    const edgeVertexArrays = runtimePrimitives
      .map((runtimePrimitive) => runtimePrimitive.drawCommand._edgeCommand)
      .filter((edgeCommand) => defined(edgeCommand))
      .map((edgeCommand) => edgeCommand.command.vertexArray);

    expect(edgeVertexArrays.length).toBeGreaterThan(0);
    for (const vertexArray of edgeVertexArrays) {
      expect(model._pipelineResources).toContain(vertexArray);
    }

    // Rebuild must destroy the previous edge vertex arrays.
    model.resetDrawCommands();
    scene.renderForSpecs();

    for (const vertexArray of edgeVertexArrays) {
      expect(vertexArray.isDestroyed()).toBe(true);
    }
  });

  it("does not leak GPU buffers on draw command rebuilds or model destroy", async function () {
    if (!!window.webglStub) {
      pending("Skipping test in WebGL stub environment");
    }

    const model = await loadEdgeVisibilityModel();
    model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;

    scene._enableEdgeVisibility = true;
    scene.renderForSpecs();

    // Warm up so lazy scene-lifetime resources exist before instrumenting.
    model.resetDrawCommands();
    scene.renderForSpecs();
    scene.renderForSpecs();
    scene.renderForSpecs();

    // Track live WebGL buffers created from this point on.
    const gl = scene.context._gl;
    const originalCreateBuffer = gl.createBuffer;
    const originalDeleteBuffer = gl.deleteBuffer;
    const liveBuffers = new Set();
    gl.createBuffer = function () {
      const buffer = originalCreateBuffer.call(this);
      liveBuffers.add(buffer);
      return buffer;
    };
    gl.deleteBuffer = function (buffer) {
      liveBuffers.delete(buffer);
      return originalDeleteBuffer.call(this, buffer);
    };

    try {
      // This rebuild recreates all of the model's buffers, so all are tracked.
      model.resetDrawCommands();
      scene.renderForSpecs();
      const steadyStateCount = liveBuffers.size;
      expect(steadyStateCount).toBeGreaterThan(0);

      // Rebuilds must free as many buffers as they create.
      for (let i = 0; i < 3; i++) {
        model.resetDrawCommands();
        scene.renderForSpecs();
        expect(liveBuffers.size).toEqual(steadyStateCount);
      }

      // Destroy must free every buffer the model created.
      scene.primitives.remove(model);
      expect(liveBuffers.size).toEqual(0);
    } finally {
      gl.createBuffer = originalCreateBuffer;
      gl.deleteBuffer = originalDeleteBuffer;
    }
  });

  describe("draws its edges", function () {
    const size = 64;
    let edgeScene;

    beforeAll(function () {
      edgeScene = createScene({ canvas: createCanvas(size, size) });
      edgeScene.backgroundColor = Color.WHITE;
    });

    afterAll(function () {
      edgeScene.destroyForSpecs();
    });

    afterEach(function () {
      edgeScene.primitives.removeAll();
      edgeScene.camera.lookAtTransform(Matrix4.IDENTITY);
      edgeScene.camera.switchToPerspectiveFrustum();
    });

    // A unit cube, unlit white, its twelve edges hard in an unlit black edge
    // material: the edges are the only black pixels.
    function cubeGltf() {
      const corners = [];
      for (let k = 0; k < 8; k++) {
        corners.push(k & 1, (k >> 1) & 1, (k >> 2) & 1);
      }
      // prettier-ignore
      const indices = [
        0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4,
        2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
      ];
      // two bits per triangle edge, 2 for a hard edge: a cube's edge joins
      // corners that differ along one axis (one bit), a diagonal along two
      const visibility = new Uint8Array(Math.ceil((indices.length * 2) / 8));
      for (let e = 0; e < indices.length; e++) {
        const axes = indices[e] ^ indices[e - (e % 3) + ((e + 1) % 3)];
        if ((axes & (axes - 1)) === 0) {
          visibility[e >> 2] |= 2 << ((e & 3) * 2);
        }
      }
      const positions = new Float32Array(corners);
      const triangles = new Uint16Array(indices);
      const bytes = concatTypedArrays([positions, triangles, visibility]);
      const triangleOffset = positions.byteLength;
      const visibilityOffset = triangleOffset + triangles.byteLength;
      return {
        asset: { version: "2.0" },
        extensionsUsed: [
          "EXT_mesh_primitive_edge_visibility",
          "KHR_materials_unlit",
        ],
        scenes: [{ nodes: [0] }],
        scene: 0,
        nodes: [{ mesh: 0 }],
        meshes: [
          {
            primitives: [
              {
                attributes: { POSITION: 0 },
                indices: 1,
                material: 0,
                extensions: {
                  EXT_mesh_primitive_edge_visibility: {
                    visibility: 2,
                    material: 1,
                  },
                },
              },
            ],
          },
        ],
        materials: [
          {
            pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] },
            extensions: { KHR_materials_unlit: {} },
          },
          {
            pbrMetallicRoughness: { baseColorFactor: [0, 0, 0, 1] },
            extensions: { KHR_materials_unlit: {} },
          },
        ],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 8,
            type: "VEC3",
            min: [0, 0, 0],
            max: [1, 1, 1],
          },
          { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
          {
            bufferView: 2,
            componentType: 5121,
            count: visibility.length,
            type: "SCALAR",
          },
        ],
        bufferViews: [
          { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
          {
            buffer: 0,
            byteOffset: triangleOffset,
            byteLength: triangles.byteLength,
          },
          {
            buffer: 0,
            byteOffset: visibilityOffset,
            byteLength: visibility.byteLength,
          },
        ],
        buffers: [
          {
            byteLength: bytes.byteLength,
            uri: `data:application/octet-stream;base64,${btoa(String.fromCharCode(...bytes))}`,
          },
        ],
      };
    }

    // The black pixels of a frame on a white background: the edges.
    function edgePixels() {
      edgeScene.renderForSpecs();
      const rgba = edgeScene.context.readPixels({ width: size, height: size });
      let count = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] < 64 && rgba[i + 1] < 64 && rgba[i + 2] < 64) {
          count++;
        }
      }
      return count;
    }

    // The views: the camera's offset from the cube in its east-north-up
    // frame, the factor a perspective field of view is narrowed by, an
    // orthographic frustum's width, the log depth buffer (on by default).
    const near = new Cartesian3(1.2, -1.6, 1.2);
    const views = [
      { name: "perspective", offset: near, narrow: 1.0, logDepth: true },
      {
        name: "perspective without log depth",
        offset: near,
        narrow: 1.0,
        logDepth: false,
      },
      // 500 m away, a building seen whole: the cube as large through a narrow
      // field of view
      {
        name: "distant perspective",
        offset: Cartesian3.multiplyByScalar(near, 200.0, new Cartesian3()),
        narrow: 200.0,
        logDepth: true,
      },
      // Cesium turns the log depth buffer off for an orthographic frustum
      { name: "orthographic", offset: near, width: 3.0 },
    ];

    async function edgesDrawn(view, hdr) {
      edgeScene.highDynamicRange = hdr;
      edgeScene.logarithmicDepthBuffer = view.logDepth ?? true;
      const model = await loadAndZoomToModelAsync(
        {
          gltf: cubeGltf(),
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0),
          ),
        },
        edgeScene,
      );
      const camera = edgeScene.camera;
      camera.lookAt(model.boundingSphere.center, view.offset);
      if (defined(view.width)) {
        camera.switchToOrthographicFrustum();
        camera.frustum.width = view.width;
      } else {
        camera.frustum.fov = Math.PI / 3.0 / view.narrow;
      }
      model.edgeDisplayMode = EdgeDisplayMode.SURFACES_ONLY;
      const without = edgePixels();
      model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;
      return edgePixels() - without;
    }

    views.forEach(function (view) {
      [false, true].forEach(function (hdr) {
        it(`in the ${view.name} view${hdr ? " with HDR" : ""}`, async function () {
          if (!!window.webglStub) {
            pending("Skipping test in WebGL stub environment");
          }
          if (hdr && !edgeScene.highDynamicRangeSupported) {
            pending("HDR is not supported");
          }
          expect(await edgesDrawn(view, hdr)).toBeGreaterThan(size / 4);
        });
      });
    });
  });
});
