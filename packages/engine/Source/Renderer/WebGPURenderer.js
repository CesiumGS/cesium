import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * WebGPU renderer class for implementing WebGPU rendering pipeline in Cesium
 * @private
 * @constructor
 */
function WebGPURenderer(canvas) {
  this._canvas = canvas;
  this._adapter = undefined;
  this._device = undefined;
  this._context = undefined;
  this._format = undefined;
  this._pipeline = undefined;
  this._renderPassDescriptor = undefined;
  this._initialized = false;
  this._renderCallback = undefined;
}

/**
 * Initialize WebGPU device and context
 * @returns {Promise<boolean>} Returns true if initialization is successful
 */
WebGPURenderer.prototype.initialize = async function () {
  if (this._initialized) {
    return true;
  }

  // Check if browser supports WebGPU
  if (!navigator.gpu) {
    console.warn("WebGPU is not supported in this browser.");
    return false;
  }

  try {
    // Request WebGPU adapter
    this._adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });

    if (!this._adapter) {
      console.warn("Failed to get WebGPU adapter.");
      return false;
    }

    // Request WebGPU device
    this._device = await this._adapter.requestDevice();

    // Configure canvas context
    this._context = this._canvas.getContext("webgpu");
    this._format = navigator.gpu.getPreferredCanvasFormat();

    this._context.configure({
      device: this._device,
      format: this._format,
      alphaMode: "premultiplied",
    });

    // Create render pipeline
    this._createRedScenePipeline();

    this._initialized = true;
    console.log("WebGPU initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize WebGPU:", error);
    return false;
  }
};

/**
 * Create render pipeline for red scene
 * @private
 */
WebGPURenderer.prototype._createRedScenePipeline = function () {
  // Vertex shader - create a fullscreen quad
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
      output.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);
      
      return output;
    }
  `;

  // Fragment shader - output red color
  const fragmentShaderCode = `
    @fragment
    fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
      // Return red color with slight gradient effect
      let red = vec4f(1.0, 0.0, 0.0, 1.0);
      let gradient = 0.5 + 0.5 * uv.y;
      return vec4f(red.rgb * gradient, red.a);
    }
  `;

  // Create shader modules
  const vertexShaderModule = this._device.createShaderModule({
    label: "Red Scene Vertex Shader",
    code: vertexShaderCode,
  });

  const fragmentShaderModule = this._device.createShaderModule({
    label: "Red Scene Fragment Shader",
    code: fragmentShaderCode,
  });

  // Create render pipeline
  this._pipeline = this._device.createRenderPipeline({
    label: "Red Scene Render Pipeline",
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
          format: this._format,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  // Create render pass descriptor
  this._renderPassDescriptor = {
    label: "Red Scene Render Pass",
    colorAttachments: [
      {
        view: undefined, // Updated per frame
        clearValue: { r: 0.2, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };
};

/**
 * Render one frame of red scene
 */
WebGPURenderer.prototype.render = function () {
  if (!this._initialized || !this._device || !this._pipeline) {
    return;
  }

  try {
    // Get current texture view
    const textureView = this._context.getCurrentTexture().createView();

    // Update render pass descriptor
    this._renderPassDescriptor.colorAttachments[0].view = textureView;

    // Create command encoder
    const commandEncoder = this._device.createCommandEncoder({
      label: "Red Scene Command Encoder",
    });

    // Begin render pass
    const passEncoder = commandEncoder.beginRenderPass(
      this._renderPassDescriptor,
    );
    passEncoder.setPipeline(this._pipeline);
    passEncoder.draw(3); // Draw 3 vertices (fullscreen triangle)
    passEncoder.end();

    // Submit commands
    this._device.queue.submit([commandEncoder.finish()]);

    // Execute callback (if exists)
    if (defined(this._renderCallback)) {
      this._renderCallback();
    }
  } catch (error) {
    console.error("WebGPU render error:", error);
  }
};

/**
 * Set render callback
 * @param {Function} callback Callback function called after each frame render
 */
WebGPURenderer.prototype.setRenderCallback = function (callback) {
  this._renderCallback = callback;
};

/**
 * Check if WebGPU is initialized
 * @returns {boolean}
 */
WebGPURenderer.prototype.isInitialized = function () {
  return this._initialized;
};

/**
 * Get WebGPU device
 * @returns {GPUDevice|undefined}
 */
WebGPURenderer.prototype.getDevice = function () {
  return this._device;
};

/**
 * Adjust render size
 * @param {number} width Width
 * @param {number} height Height
 */
WebGPURenderer.prototype.resize = function (width, height) {
  if (!this._initialized) {
    return;
  }

  this._canvas.width = width;
  this._canvas.height = height;
};

/**
 * Destroy WebGPU renderer
 */
WebGPURenderer.prototype.destroy = function () {
  if (this._device) {
    this._device.destroy();
  }

  this._adapter = undefined;
  this._device = undefined;
  this._context = undefined;
  this._pipeline = undefined;
  this._renderPassDescriptor = undefined;
  this._initialized = false;

  return destroyObject(this);
};

/**
 * Check if browser supports WebGPU
 * @returns {boolean}
 */
WebGPURenderer.isSupported = function () {
  return defined(navigator.gpu);
};

export default WebGPURenderer;
