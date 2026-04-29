// @ts-check

import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import PrimitiveType from "../Core/PrimitiveType.js";

/** @import Context from "./Context.js"; */
/** @import Framebuffer from "./Framebuffer.js"; */
/** @import Matrix4 from "../Core/Matrix4.js"; */
/** @import OrientedBoundingBox from "../Core/OrientedBoundingBox.js"; */
/** @import Pass from "./Pass.js"; */
/** @import PassState from "./PassState.js"; */
/** @import PickedMetadataInfo from "../Scene/PickedMetadataInfo.js"; */
/** @import RenderState from "./RenderState.js"; */
/** @import ShaderProgram from "./ShaderProgram.js"; */
/** @import VertexArray from "./VertexArray.js"; */

/**
 * @enum {number}
 * @ignore
 */
const Flags = {
  CULL: 1,
  OCCLUDE: 2,
  EXECUTE_IN_CLOSEST_FRUSTUM: 4,
  DEBUG_SHOW_BOUNDING_VOLUME: 8,
  CAST_SHADOWS: 16,
  RECEIVE_SHADOWS: 32,
  PICK_ONLY: 64,
  DEPTH_FOR_TRANSLUCENT_CLASSIFICATION: 128,
};

/**
 * @typedef {object} DrawCommandOptions
 * @property {object} [boundingVolume]
 * @property {OrientedBoundingBox} [orientedBoundingBox]
 * @property {Matrix4} [modelMatrix]
 * @property {PrimitiveType} [primitiveType=PrimitiveType.TRIANGLES]
 * @property {VertexArray} [vertexArray]
 * @property {number} [count]
 * @property {number} [offset]
 * @property {number} [instanceCount]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @property {RenderState} [renderState]
 * @property {Framebuffer} [framebuffer]
 * @property {Pass} [pass]
 * @property {object} [owner]
 * @property {string} [pickId]
 * @property {boolean} [pickMetadataAllowed=false]
 * @property {boolean} [cull=true]
 * @property {boolean} [occlude=true]
 * @property {boolean} [executeInClosestFrustum=false]
 * @property {boolean} [debugShowBoundingVolume=false]
 * @property {boolean} [castShadows=false]
 * @property {boolean} [receiveShadows=false]
 * @property {boolean} [pickOnly=false]
 * @property {boolean} [depthForTranslucentClassification=false]
 *
 * @ignore
 */

/**
 * Represents a command to the renderer for drawing.
 *
 * @private
 */
class DrawCommand {
  /**
   * @param {DrawCommandOptions} [options]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    /** @private */
    this._boundingVolume = options.boundingVolume;
    /** @private */
    this._orientedBoundingBox = options.orientedBoundingBox;
    /** @private */
    this._modelMatrix = options.modelMatrix;
    /** @private */
    this._primitiveType = options.primitiveType ?? PrimitiveType.TRIANGLES;
    /** @private */
    this._vertexArray = options.vertexArray;
    /** @private */
    this._count = options.count;
    /** @private */
    this._offset = options.offset ?? 0;
    /** @private */
    this._instanceCount = options.instanceCount ?? 0;
    /** @private */
    this._shaderProgram = options.shaderProgram;
    /** @private */
    this._uniformMap = options.uniformMap;
    /** @private */
    this._renderState = options.renderState;
    /** @private */
    this._framebuffer = options.framebuffer;
    /** @private */
    this._pass = options.pass;
    /** @private */
    this._owner = options.owner;
    /** @private */
    this._debugOverlappingFrustums = 0;
    /** @private */
    this._pickId = options.pickId;
    /** @private */
    this._pickMetadataAllowed = options.pickMetadataAllowed === true;
    /**
     * @type {PickedMetadataInfo|undefined}
     * @private
     */
    this._pickedMetadataInfo = undefined;

    // Set initial flags.
    this._flags = 0;
    this.cull = options.cull ?? true;
    this.occlude = options.occlude ?? true;
    this.executeInClosestFrustum = options.executeInClosestFrustum ?? false;
    this.debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;
    this.castShadows = options.castShadows ?? false;
    this.receiveShadows = options.receiveShadows ?? false;
    this.pickOnly = options.pickOnly ?? false;
    this.depthForTranslucentClassification =
      options.depthForTranslucentClassification ?? false;

    this.dirty = true;
    this.lastDirtyTime = 0;

    /**
     * @private
     */
    this.derivedCommands = {};
  }

  /**
   * The bounding volume of the geometry in world space.  This is used for culling and frustum selection.
   * <p>
   * For best rendering performance, use the tightest possible bounding volume.  Although
   * <code>undefined</code> is allowed, always try to provide a bounding volume to
   * allow the tightest possible near and far planes to be computed for the scene, and
   * minimize the number of frustums needed.
   * </p>
   *
   * @type {object}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  get boundingVolume() {
    return this._boundingVolume;
  }

  set boundingVolume(value) {
    if (this._boundingVolume !== value) {
      this._boundingVolume = value;
      this.dirty = true;
    }
  }

  /**
   * The oriented bounding box of the geometry in world space. If this is defined, it is used instead of
   * {@link DrawCommand#boundingVolume} for plane intersection testing.
   *
   * @type {OrientedBoundingBox}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  get orientedBoundingBox() {
    return this._orientedBoundingBox;
  }

  set orientedBoundingBox(value) {
    if (this._orientedBoundingBox !== value) {
      this._orientedBoundingBox = value;
      this.dirty = true;
    }
  }

  /**
   * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * If the command was already culled, set this to <code>false</code> for a performance improvement.
   *
   * @type {boolean}
   * @default true
   */
  get cull() {
    return hasFlag(this, Flags.CULL);
  }

  set cull(value) {
    if (hasFlag(this, Flags.CULL) !== value) {
      setFlag(this, Flags.CULL, value);
      this.dirty = true;
    }
  }

  /**
   * When <code>true</code>, the horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * {@link DrawCommand#cull} must also be <code>true</code> in order for the command to be culled.
   *
   * @type {boolean}
   * @default true
   */
  get occlude() {
    return hasFlag(this, Flags.OCCLUDE);
  }

  set occlude(value) {
    if (hasFlag(this, Flags.OCCLUDE) !== value) {
      setFlag(this, Flags.OCCLUDE, value);
      this.dirty = true;
    }
  }

  /**
   * The transformation from the geometry in model space to world space.
   * <p>
   * When <code>undefined</code>, the geometry is assumed to be defined in world space.
   * </p>
   *
   * @type {Matrix4}
   * @default undefined
   */
  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(value) {
    if (this._modelMatrix !== value) {
      this._modelMatrix = value;
      this.dirty = true;
    }
  }

  /**
   * The type of geometry in the vertex array.
   *
   * @type {PrimitiveType}
   * @default PrimitiveType.TRIANGLES
   */
  get primitiveType() {
    return this._primitiveType;
  }

  set primitiveType(value) {
    if (this._primitiveType !== value) {
      this._primitiveType = value;
      this.dirty = true;
    }
  }

  /**
   * The vertex array.
   *
   * @type {VertexArray}
   * @default undefined
   */
  get vertexArray() {
    return this._vertexArray;
  }

  set vertexArray(value) {
    if (this._vertexArray !== value) {
      this._vertexArray = value;
      this.dirty = true;
    }
  }

  /**
   * The number of vertices to draw in the vertex array.
   *
   * @type {number}
   * @default undefined
   */
  get count() {
    return this._count;
  }

  set count(value) {
    if (this._count !== value) {
      this._count = value;
      this.dirty = true;
    }
  }

  /**
   * The offset to start drawing in the vertex array.
   *
   * @type {number}
   * @default 0
   */
  get offset() {
    return this._offset;
  }

  set offset(value) {
    if (this._offset !== value) {
      this._offset = value;
      this.dirty = true;
    }
  }

  /**
   * The number of instances to draw.
   *
   * @type {number}
   * @default 0
   */
  get instanceCount() {
    return this._instanceCount;
  }

  set instanceCount(value) {
    if (this._instanceCount !== value) {
      this._instanceCount = value;
      this.dirty = true;
    }
  }

  /**
   * The shader program to apply.
   *
   * @type {ShaderProgram}
   * @default undefined
   */
  get shaderProgram() {
    return this._shaderProgram;
  }

  set shaderProgram(value) {
    if (this._shaderProgram !== value) {
      this._shaderProgram = value;
      this.dirty = true;
    }
  }

  /**
   * Whether this command should cast shadows when shadowing is enabled.
   *
   * @type {boolean}
   * @default false
   */
  get castShadows() {
    return hasFlag(this, Flags.CAST_SHADOWS);
  }

  set castShadows(value) {
    if (hasFlag(this, Flags.CAST_SHADOWS) !== value) {
      setFlag(this, Flags.CAST_SHADOWS, value);
      this.dirty = true;
    }
  }

  /**
   * Whether this command should receive shadows when shadowing is enabled.
   *
   * @type {boolean}
   * @default false
   */
  get receiveShadows() {
    return hasFlag(this, Flags.RECEIVE_SHADOWS);
  }

  set receiveShadows(value) {
    if (hasFlag(this, Flags.RECEIVE_SHADOWS) !== value) {
      setFlag(this, Flags.RECEIVE_SHADOWS, value);
      this.dirty = true;
    }
  }

  /**
   * An object with functions whose names match the uniforms in the shader program
   * and return values to set those uniforms.
   *
   * @type {object}
   * @default undefined
   */
  get uniformMap() {
    return this._uniformMap;
  }

  set uniformMap(value) {
    if (this._uniformMap !== value) {
      this._uniformMap = value;
      this.dirty = true;
    }
  }

  /**
   * The render state.
   *
   * @type {RenderState}
   * @default undefined
   */
  get renderState() {
    return this._renderState;
  }

  set renderState(value) {
    if (this._renderState !== value) {
      this._renderState = value;
      this.dirty = true;
    }
  }

  /**
   * The framebuffer to draw to.
   *
   * @type {Framebuffer}
   * @default undefined
   */
  get framebuffer() {
    return this._framebuffer;
  }

  set framebuffer(value) {
    if (this._framebuffer !== value) {
      this._framebuffer = value;
      this.dirty = true;
    }
  }

  /**
   * The pass when to render.
   *
   * @type {Pass}
   * @default undefined
   */
  get pass() {
    return this._pass;
  }

  set pass(value) {
    if (this._pass !== value) {
      this._pass = value;
      this.dirty = true;
    }
  }

  /**
   * Specifies if this command is only to be executed in the frustum closest
   * to the eye containing the bounding volume. Defaults to <code>false</code>.
   *
   * @type {boolean}
   * @default false
   */
  get executeInClosestFrustum() {
    return hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM);
  }

  set executeInClosestFrustum(value) {
    if (hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM) !== value) {
      setFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM, value);
      this.dirty = true;
    }
  }

  /**
   * The object who created this command.  This is useful for debugging command
   * execution; it allows us to see who created a command when we only have a
   * reference to the command, and can be used to selectively execute commands
   * with {@link Scene#debugCommandFilter}.
   *
   * @type {object}
   * @default undefined
   *
   * @see Scene#debugCommandFilter
   */
  get owner() {
    return this._owner;
  }

  set owner(value) {
    if (this._owner !== value) {
      this._owner = value;
      this.dirty = true;
    }
  }

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the {@link DrawCommand#boundingVolume} for this command, assuming it is a sphere, when the command executes.
   * </p>
   *
   * @type {boolean}
   * @default false
   *
   * @see DrawCommand#boundingVolume
   */
  get debugShowBoundingVolume() {
    return hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME);
  }

  set debugShowBoundingVolume(value) {
    if (hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME) !== value) {
      setFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME, value);
      this.dirty = true;
    }
  }

  /**
   * Used to implement Scene.debugShowFrustums.
   * @ignore
   */
  get debugOverlappingFrustums() {
    return this._debugOverlappingFrustums;
  }

  set debugOverlappingFrustums(value) {
    if (this._debugOverlappingFrustums !== value) {
      this._debugOverlappingFrustums = value;
      this.dirty = true;
    }
  }

  /**
   * A GLSL string that will evaluate to a pick id. When <code>undefined</code>, the command will only draw depth
   * during the pick pass.
   *
   * @type {string|undefined}
   * @default undefined
   */
  get pickId() {
    return this._pickId;
  }

  set pickId(value) {
    if (this._pickId !== value) {
      this._pickId = value;
      this.dirty = true;
    }
  }

  /**
   * Whether metadata picking is allowed.
   *
   * This is essentially only set to `true` for draw commands that are
   * part of a `ModelDrawCommand`, to check whether a derived command
   * for metadata picking has to be created.
   *
   * @type {boolean}
   * @default undefined
   * @private
   */
  get pickMetadataAllowed() {
    return this._pickMetadataAllowed;
  }

  /**
   * Information about picked metadata.
   *
   * @type {PickedMetadataInfo|undefined}
   * @default undefined
   */
  get pickedMetadataInfo() {
    return this._pickedMetadataInfo;
  }

  set pickedMetadataInfo(value) {
    if (this._pickedMetadataInfo !== value) {
      this._pickedMetadataInfo = value;
      this.dirty = true;
    }
  }

  /**
   * Whether this command should be executed in the pick pass only.
   *
   * @type {boolean}
   * @default false
   */
  get pickOnly() {
    return hasFlag(this, Flags.PICK_ONLY);
  }

  set pickOnly(value) {
    if (hasFlag(this, Flags.PICK_ONLY) !== value) {
      setFlag(this, Flags.PICK_ONLY, value);
      this.dirty = true;
    }
  }

  /**
   * Whether this command should be derived to draw depth for classification of translucent primitives.
   *
   * @type {boolean}
   * @default false
   */
  get depthForTranslucentClassification() {
    return hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION);
  }

  set depthForTranslucentClassification(value) {
    if (hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION) !== value) {
      setFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION, value);
      this.dirty = true;
    }
  }

  /**
   * @param {DrawCommand} command
   * @param {DrawCommand} result
   * @returns {DrawCommand}
   * @private
   */
  static shallowClone(command, result) {
    if (!defined(command)) {
      return undefined;
    }
    if (!defined(result)) {
      result = new DrawCommand();
    }

    result._boundingVolume = command._boundingVolume;
    result._orientedBoundingBox = command._orientedBoundingBox;
    result._modelMatrix = command._modelMatrix;
    result._primitiveType = command._primitiveType;
    result._vertexArray = command._vertexArray;
    result._count = command._count;
    result._offset = command._offset;
    result._instanceCount = command._instanceCount;
    result._shaderProgram = command._shaderProgram;
    result._uniformMap = command._uniformMap;
    result._renderState = command._renderState;
    result._framebuffer = command._framebuffer;
    result._pass = command._pass;
    result._owner = command._owner;
    result._debugOverlappingFrustums = command._debugOverlappingFrustums;
    result._pickId = command._pickId;
    result._pickMetadataAllowed = command._pickMetadataAllowed;
    result._pickedMetadataInfo = command._pickedMetadataInfo;
    result._flags = command._flags;

    result.dirty = true;
    result.lastDirtyTime = 0;

    return result;
  }

  /**
   * Executes the draw command.
   *
   * @param {Context} context The renderer context in which to draw.
   * @param {PassState} [passState] The state for the current render pass.
   */
  execute(context, passState) {
    context.draw(this, passState);
  }
}

/**
 * @param {DrawCommand} command
 * @param {Flags} flag
 * @returns {boolean}
 */
function hasFlag(command, flag) {
  return (command._flags & flag) === flag;
}

/**
 * @param {DrawCommand} command
 * @param {Flags} flag
 * @param {boolean} value
 */
function setFlag(command, flag, value) {
  if (value) {
    command._flags |= flag;
  } else {
    command._flags &= ~flag;
  }
}

export default DrawCommand;
