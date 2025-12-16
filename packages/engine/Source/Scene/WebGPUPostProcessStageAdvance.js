import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * A WebGPU-based post-processing effect that renders directly to the canvas.
 * This reads Cesium's WebGL output and applies WebGPU shaders (WGSL) for post-processing.
 *
 * @alias WebGPUPostProcessStage
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Viewer} options.viewer The Cesium Viewer instance.
 * @param {string} options.fragmentShader The WGSL fragment shader source code.
 * @param {object} [options.uniforms] An object whose properties are used to set the uniforms in the shader.
 * @param {string} [options.name] The name of this stage for debugging.
 *
 * @example
 * // Create a red channel only effect using WebGPU
 * const stage = new Cesium.WebGPUPostProcessStage({
 *   viewer: viewer,
 *   name: 'RedChannel',
 *   fragmentShader: `
 *     @group(0) @binding(0) var cesiumScene: texture_2d<f32>;
 *     @group(0) @binding(1) var sceneSampler: sampler;
 *
 *     @fragment
 *     fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
 *       let sceneColor = textureSample(cesiumScene, sceneSampler, uv);
 *       return vec4f(sceneColor.r, 0.0, 0.0, 1.0);
 *     }
 *   `
 * });
 */
function WebGPUPostProcessStage(options) {
  options = defined(options) ? options : {};

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.viewer", options.viewer);
  Check.defined("options.fragmentShader", options.fragmentShader);
  //>>includeEnd('debug');

  this._viewer = options.viewer;
  this._fragmentShader = options.fragmentShader;
  this._uniforms = options.uniforms;
  this._name = defined(options.name)
    ? options.name
    : "WebGPU Post-Process Stage";

  // WebGPU resources
  this._canvas = undefined;
  this._device = undefined;
  this._context = undefined;
  this._pipeline = undefined;
  this._bindGroup = undefined;
  this._inputTexture = undefined;
  this._sampler = undefined;
  this._glContext = undefined;
  this._initialized = false;
  this._enabled = true;
  this._postRenderListener = undefined;
  this._resizeObserver = undefined;

  // Start initialization
  this._initializeAsync();
}

Object.defineProperties(WebGPUPostProcessStage.prototype, {
  /**
   * The unique name of this post-process stage for reference.
   * @memberof WebGPUPostProcessStage.prototype
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * Whether this post-process stage is enabled.
   * @memberof WebGPUPostProcessStage.prototype
   * @type {boolean}
   */
  enabled: {
    get: function () {
      return this._enabled;
    },
    set: function (value) {
      this._enabled = value;
    },
  },

  /**
   * The WGSL fragment shader.
   * @memberof WebGPUPostProcessStage.prototype
   * @type {string}
   * @readonly
   */
  fragmentShader: {
    get: function () {
      return this._fragmentShader;
    },
  },

  /**
   * The uniforms for the shader.
   * @memberof WebGPUPostProcessStage.prototype
   * @type {object}
   */
  uniforms: {
    get: function () {
      return this._uniforms;
    },
    set: function (value) {
      this._uniforms = value;
    },
  },
});

/**
 * Initialize WebGPU asynchronously.
 * @private
 */
WebGPUPostProcessStage.prototype._initializeAsync = async function () {
  if (this._initialized) {
    return;
  }

  // Check if WebGPU is supported
  if (!navigator.gpu) {
    console.warn(`WebGPU not supported for "${this._name}"`);
    return;
  }

  try {
    // Create a separate canvas overlay for WebGPU
    const cesiumCanvas = this._viewer.canvas;
    this._canvas = document.createElement("canvas");
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._canvas.style.pointerEvents = "none";
    this._canvas.width = cesiumCanvas.width;
    this._canvas.height = cesiumCanvas.height;
    cesiumCanvas.parentElement.appendChild(this._canvas);

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error("No WebGPU adapter available");
      return;
    }

    this._device = await adapter.requestDevice();
    this._context = this._canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();
    this._context.configure({
      device: this._device,
      format: format,
      alphaMode: "premultiplied",
    });

    // Handle canvas resize
    const that = this;
    this._resizeObserver = new ResizeObserver(() => {
      if (that._canvas) {
        that._canvas.width = cesiumCanvas.width;
        that._canvas.height = cesiumCanvas.height;

        // Recreate texture with new size
        if (that._inputTexture) {
          that._inputTexture.destroy();
        }
        that._inputTexture = that._device.createTexture({
          label: `${that._name} Input Texture`,
          size: [cesiumCanvas.width, cesiumCanvas.height],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // Recreate bind group
        that._bindGroup = that._device.createBindGroup({
          label: `${that._name} Bind Group`,
          layout: that._pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: that._inputTexture.createView(),
            },
            {
              binding: 1,
              resource: that._sampler,
            },
          ],
        });
      }
    });
    this._resizeObserver.observe(cesiumCanvas);

    // Create texture for storing Cesium's rendered output
    this._inputTexture = this._device.createTexture({
      label: `${this._name} Input Texture`,
      size: [cesiumCanvas.width, cesiumCanvas.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Create sampler
    this._sampler = this._device.createSampler({
      label: `${this._name} Sampler`,
      magFilter: "linear",
      minFilter: "linear",
    });

    // Create fullscreen vertex shader
    const vertexShaderCode = `
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @vertex
      fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
        var output: VertexOutput;
        
        // Create fullscreen triangle
        let x = f32((vertexIndex & 1u) << 2u) - 1.0;
        let y = f32((vertexIndex & 2u) << 1u) - 1.0;
        
        output.position = vec4f(x, y, 0.0, 1.0);
        // Fix vertical coordinate - don't flip Y
        output.uv = vec2f((x + 1.0) * 0.5, (y + 1.0) * 0.5);
        
        return output;
      }
    `;

    // Create shader modules
    const vertexShaderModule = this._device.createShaderModule({
      label: `${this._name} Vertex Shader`,
      code: vertexShaderCode,
    });

    const fragmentShaderModule = this._device.createShaderModule({
      label: `${this._name} Fragment Shader`,
      code: this._fragmentShader,
    });

    // Create render pipeline
    this._pipeline = this._device.createRenderPipeline({
      label: `${this._name} Pipeline`,
      layout: "auto",
      vertex: {
        module: vertexShaderModule,
        entryPoint: "main",
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: "main",
        targets: [
          {
            format: format,
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    // Create bind group for texture and sampler
    this._bindGroup = this._device.createBindGroup({
      label: `${this._name} Bind Group`,
      layout: this._pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this._inputTexture.createView(),
        },
        {
          binding: 1,
          resource: this._sampler,
        },
      ],
    });

    // Get WebGL context for reading pixels
    this._glContext =
      cesiumCanvas.getContext("webgl2") || cesiumCanvas.getContext("webgl");

    // Set up the render loop
    this._postRenderListener = this._viewer.scene.postRender.addEventListener(
      function () {
        if (that._enabled && that._initialized) {
          that._render();
        }
      },
    );

    this._initialized = true;
    console.log(`WebGPU post-process stage "${this._name}" initialized`);
  } catch (error) {
    console.error(
      `Failed to initialize WebGPU post-process stage "${this._name}":`,
      error,
    );
  }
};

/**
 * Render the WebGPU effect.
 * @private
 */
WebGPUPostProcessStage.prototype._render = function () {
  if (
    !this._initialized ||
    !this._device ||
    !this._context ||
    !this._glContext
  ) {
    return;
  }

  try {
    const width = this._canvas.width;
    const height = this._canvas.height;

    // 1. Read pixels from WebGL framebuffer
    const pixels = new Uint8Array(width * height * 4);
    this._glContext.readPixels(
      0,
      0,
      width,
      height,
      this._glContext.RGBA,
      this._glContext.UNSIGNED_BYTE,
      pixels,
    );

    // 2. Upload to WebGPU texture
    this._device.queue.writeTexture(
      { texture: this._inputTexture },
      pixels,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height },
    );

    // 3. Render with the texture
    const commandEncoder = this._device.createCommandEncoder();
    const textureView = this._context.getCurrentTexture().createView();

    const renderPassDescriptor = {
      label: `${this._name} Render Pass`,
      colorAttachments: [
        {
          view: textureView,
          loadOp: "clear",
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this._pipeline);
    passEncoder.setBindGroup(0, this._bindGroup);
    passEncoder.draw(3);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  } catch (error) {
    console.error(
      `Failed to render WebGPU post-process stage "${this._name}":`,
      error,
    );
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * @returns {boolean}
 */
WebGPUPostProcessStage.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGPU resources held by this object.
 */
WebGPUPostProcessStage.prototype.destroy = function () {
  if (defined(this._postRenderListener)) {
    this._postRenderListener();
    this._postRenderListener = undefined;
  }

  if (defined(this._resizeObserver)) {
    this._resizeObserver.disconnect();
    this._resizeObserver = undefined;
  }

  if (defined(this._canvas) && this._canvas.parentElement) {
    this._canvas.parentElement.removeChild(this._canvas);
    this._canvas = undefined;
  }

  this._pipeline = undefined;
  this._bindGroup = undefined;
  this._inputTexture = undefined;
  this._sampler = undefined;
  this._glContext = undefined;
  this._device = undefined;
  this._context = undefined;
  this._initialized = false;

  return destroyObject(this);
};

export default WebGPUPostProcessStage;
