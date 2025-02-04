import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import defined from "../Core/defined";
import VertexArray from "../Renderer/VertexArray";
import BufferUsage from "../Renderer/BufferUsage";
import CullFace from "../Scene/CullFace";
import ShaderProgram from "../Renderer/ShaderProgram";
import BasicMaterialAppearanceFS from "../Shaders/Appearances/BasicMaterialAppearanceFS";
import BasicMaterialAppearanceVS from "../Shaders/Appearances/BasicMaterialAppearanceVS";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Primitive from "../Scene/Primitive.js";
import destroyObject from "../Core/destroyObject.js";

// Maps to a batch of geometry

class FeatureLayerPrimitive {
  constructor({ geometry, attributeLocations, material }) {
    this._geometry = geometry;
    this._attributeLocations = attributeLocations;
    this._material = material;

    // These are needed after the geometry is released
    this._boundingSphere = geometry.boundingSphere;
    this._primitiveType = geometry.primitiveType;

    this._vertexArray = undefined;
    this._shaderProgram = undefined;
    this._uniformMap = {};

    // TODO: Caching? Styling? Appearance?
    this._renderState = RenderState.fromCache({
      depthTest: {
        enabled: true,
      },
      depthMask: true,
      cull: {
        enabled: true,
        face: CullFace.BACK,
      },
    });

    this._trianglesLength = 0;
    this._geometryByteLength = 0;

    this._commands = [];
  }

  get boundingSphere() {
    return this.boundingSphere;
  }

  /**
   * Gets the number of triangles.
   *
   * @type {number}
   * @readonly
   */
  get trianglesLength() {
    return this._trianglesLength;
  }

  /**
   * Gets the geometry memory in bytes.
   *
   * @type {number}
   * @readonly
   */
  get geometryByteLength() {
    return this._geometryByteLength;
  }

  createVertexArray(frameState) {
    if (defined(this._vertexArray) || !defined(this._geometry)) {
      return;
    }

    const { context } = frameState;
    const geometry = this._geometry;
    const attributeLocations = this._attributeLocations;
    const bufferUsage = BufferUsage.STATIC_DRAW; // TODO: Update instead?
    const interleave = false; // TODO: Performance?

    try {
      this._vertexArray = VertexArray.fromGeometry({
        context,
        geometry,
        attributeLocations,
        bufferUsage,
        interleave,
      });
    } catch {
      console.log(geometry);
    }

    // TODO: Release geometry option?
    this._geometry = undefined;
  }

  createShaders(frameState) {
    if (defined(this._shaderProgram)) {
      return;
    }

    const { context } = frameState;
    const attributeLocations = this._attributeLocations;
    const vs = Primitive._modifyShaderPosition(
      this,
      BasicMaterialAppearanceVS,
      true,
    );
    const vertexShaderSource = new ShaderSource({
      sources: [vs],
    });
    const fragmentShaderSource = new ShaderSource({
      sources: [this._material.shaderSource, BasicMaterialAppearanceFS],
    });

    this._shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations,
    });
  }

  queueCommands(frameState) {
    const commands = this._commands;

    const commandList = frameState.commandList;
    const commandLength = commands.length;
    for (let i = 0; i < commandLength; ++i) {
      commandList.push(commands[i]);
    }
  }

  createColorCommands() {
    // TODO: This shouldn't be needed every frame

    // TODO: Translucency, classification, depth fail?
    const pass = Pass.OPAQUE;
    const primitiveType = this._primitiveType;

    const colorCommand = new DrawCommand({
      owner: this,
      primitiveType,
    });

    colorCommand.vertexArray = this._vertexArray;
    colorCommand.renderState = this._renderState;
    colorCommand.shaderProgram = this._shaderProgram;
    colorCommand.uniformMap = this._material._uniforms;
    // colorCommand.cull = false; // TODO: Should this be optimized up the chain?
    colorCommand.pass = pass;

    this._commands.push(colorCommand);
  }

  /**
   * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
   * get the draw commands needed to render this primitive.
   * <p>
   * Do not call this function directly.  This is documented just to
   * list the exceptions that may be propagated when the scene is rendered:
   * </p>
   *
   * @param {FrameState} frameState
   *
   * @exception {DeveloperError} All instance geometries must have the same primitiveType.
   * @exception {DeveloperError} Appearance and material have a uniform with the same name.
   * @exception {DeveloperError} Primitive.modelMatrix is only supported in 3D mode.
   * @exception {RuntimeError} Vertex texture fetch support is required to render primitives with per-instance attributes. The maximum number of vertex texture image units must be greater than zero.
   */
  update(frameState) {
    const { passes } = frameState;

    this.createVertexArray(frameState);
    this.createShaders(frameState);

    if (passes.render) {
      this.createColorCommands();
      this.queueCommands(frameState);
    }

    if (passes.pick) {
      // TODO: Picking
    }
  }

  // TODO
  isDestroyed() {
    return false;
  }

  // TODO
  destroy() {
    this._geometry = undefined;
    this._vertexArray = this._vertexArray && this._vertexArray.destroy();
    this._shaderProgram = this._shaderProgram && this._shaderProgram.destroy();
    this._attributeLocations = undefined;
    return destroyObject(this);
  }
}

export default FeatureLayerPrimitive;
