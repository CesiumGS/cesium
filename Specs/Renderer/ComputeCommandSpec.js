import {
  BoundingRectangle,
  PixelFormat,
  Buffer,
  BufferUsage,
  ComputeCommand,
  ShaderProgram,
  Texture,
  VertexArray,
  Material,
  ViewportQuad,
} from "../../../Source/Cesium.js";

import createScene from "../createScene.js";

describe(
  "Renderer/ComputeCommand",
  function () {
    let scene;
    let context;

    beforeAll(function () {
      scene = createScene();
      context = scene.context;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    function CommandMockPrimitive(command) {
      this.update = function (frameState) {
        frameState.commandList.push(command);
      };
      this.destroy = function () {};
    }

    it("throws if no shader is provided", function () {
      const outputTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
      });
      const computeCommand = new ComputeCommand({
        outputTexture: outputTexture,
      });
      scene.primitives.add(new CommandMockPrimitive(computeCommand));

      expect(function () {
        scene.renderForSpecs();
      }).toThrowDeveloperError();
    });

    it("throws if no output texture is provided", function () {
      const computeCommand = new ComputeCommand({
        fragmentShaderSource: "void main() { gl_FragColor = vec4(1.0); }",
      });
      scene.primitives.add(new CommandMockPrimitive(computeCommand));

      expect(function () {
        scene.renderForSpecs();
      }).toThrowDeveloperError();
    });

    it("renderer resources are preserved or destroyed based on the persists flag", function () {
      const vertexShader =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
      const fragmentShader = "void main() { gl_FragColor = vec4(1.0); }";
      const shaderProgram = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vertexShader,
        fragmentShaderSource: fragmentShader,
        attributeLocations: {
          position: 0,
        },
      });

      const vertexArray = new VertexArray({
        context: context,
        attributes: [
          {
            index: 0,
            vertexBuffer: Buffer.createVertexBuffer({
              context: context,
              typedArray: new Float32Array([0, 0, 0, 1]),
              usage: BufferUsage.STATIC_DRAW,
            }),
            componentsPerAttribute: 4,
          },
        ],
      });

      const outputTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
      });

      const computeCommand = new ComputeCommand({
        vertexArray: vertexArray,
        shaderProgram: shaderProgram,
        outputTexture: outputTexture,
      });

      // check that resources are preserved when persists is true
      computeCommand.persists = true;
      scene.primitives.add(new CommandMockPrimitive(computeCommand));
      scene.renderForSpecs();
      context.shaderCache.destroyReleasedShaderPrograms();
      scene.primitives.removeAll();

      expect(shaderProgram.isDestroyed()).toEqual(false);
      expect(vertexArray.isDestroyed()).toEqual(false);
      expect(outputTexture.isDestroyed()).toEqual(false);

      // check that resources are destroyed when persists is false, except
      // outputTexture which is always preserved
      computeCommand.persists = false;
      scene.primitives.add(new CommandMockPrimitive(computeCommand));
      scene.renderForSpecs();
      context.shaderCache.destroyReleasedShaderPrograms();
      scene.primitives.removeAll();

      expect(shaderProgram.isDestroyed()).toEqual(true);
      expect(vertexArray.isDestroyed()).toEqual(true);
      expect(outputTexture.isDestroyed()).toEqual(false);
    });

    it("renders to a texture and draws that texture to the screen", function () {
      const outputTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
      });
      const computeCommand = new ComputeCommand({
        fragmentShaderSource: "void main() { gl_FragColor = vec4(1.0); }",
        outputTexture: outputTexture,
      });

      const viewportQuad = new ViewportQuad();
      viewportQuad.rectangle = new BoundingRectangle(0, 0, 1, 1);
      viewportQuad.material = Material.fromType(Material.ImageType);
      viewportQuad.material.uniforms.image = outputTexture;

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(new CommandMockPrimitive(computeCommand));
      scene.primitives.add(viewportQuad);
      expect(scene).notToRender([0, 0, 0, 255]);
    });
  },
  "WebGL"
);
