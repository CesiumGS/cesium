import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PrimitiveType from "../Core/PrimitiveType.js";

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
 * Represents a command to the renderer for drawing.
 *
 * @private
 */
function DrawCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._boundingVolume = options.boundingVolume;
  this._orientedBoundingBox = options.orientedBoundingBox;
  this._modelMatrix = options.modelMatrix;
  this._primitiveType = defaultValue(
    options.primitiveType,
    PrimitiveType.TRIANGLES
  );
  this._vertexArray = options.vertexArray;
  this._count = options.count;
  this._offset = defaultValue(options.offset, 0);
  this._instanceCount = defaultValue(options.instanceCount, 0);
  this._shaderProgram = options.shaderProgram;
  this._uniformMap = options.uniformMap;
  this._renderState = options.renderState;
  this._framebuffer = options.framebuffer;
  this._pass = options.pass;
  this._owner = options.owner;
  this._debugOverlappingFrustums = 0;
  this._pickId = options.pickId;

  // Set initial flags.
  this._flags = 0;
  this.cull = defaultValue(options.cull, true);
  this.occlude = defaultValue(options.occlude, true);
  this.executeInClosestFrustum = defaultValue(
    options.executeInClosestFrustum,
    false
  );
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );
  this.castShadows = defaultValue(options.castShadows, false);
  this.receiveShadows = defaultValue(options.receiveShadows, false);
  this.pickOnly = defaultValue(options.pickOnly, false);
  this.depthForTranslucentClassification = defaultValue(
    options.depthForTranslucentClassification,
    false
  );

  this.dirty = true;
  this.lastDirtyTime = 0;

  /**
   * @private
   */
  this.derivedCommands = {};
}

function hasFlag(command, flag) {
  return (command._flags & flag) === flag;
}

function setFlag(command, flag, value) {
  if (value) {
    command._flags |= flag;
  } else {
    command._flags &= ~flag;
  }
}

Object.defineProperties(DrawCommand.prototype, {
  /**
   * The bounding volume of the geometry in world space.  This is used for culling and frustum selection.
   * <p>
   * For best rendering performance, use the tightest possible bounding volume.  Although
   * <code>undefined</code> is allowed, always try to provide a bounding volume to
   * allow the tightest possible near and far planes to be computed for the scene, and
   * minimize the number of frustums needed.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  boundingVolume: {
    get: function () {
      return this._boundingVolume;
    },
    set: function (value) {
      if (this._boundingVolume !== value) {
        this._boundingVolume = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The oriented bounding box of the geometry in world space. If this is defined, it is used instead of
   * {@link DrawCommand#boundingVolume} for plane intersection testing.
   *
   * @memberof DrawCommand.prototype
   * @type {OrientedBoundingBox}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  orientedBoundingBox: {
    get: function () {
      return this._orientedBoundingBox;
    },
    set: function (value) {
      if (this._orientedBoundingBox !== value) {
        this._orientedBoundingBox = value;
        this.dirty = true;
      }
    },
  },

  /**
   * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * If the command was already culled, set this to <code>false</code> for a performance improvement.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default true
   */
  cull: {
    get: function () {
      return hasFlag(this, Flags.CULL);
    },
    set: function (value) {
      if (hasFlag(this, Flags.CULL) !== value) {
        setFlag(this, Flags.CULL, value);
        this.dirty = true;
      }
    },
  },

  /**
   * When <code>true</code>, the horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * {@link DrawCommand#cull} must also be <code>true</code> in order for the command to be culled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default true
   */
  occlude: {
    get: function () {
      return hasFlag(this, Flags.OCCLUDE);
    },
    set: function (value) {
      if (hasFlag(this, Flags.OCCLUDE) !== value) {
        setFlag(this, Flags.OCCLUDE, value);
        this.dirty = true;
      }
    },
  },

  /**
   * The transformation from the geometry in model space to world space.
   * <p>
   * When <code>undefined</code>, the geometry is assumed to be defined in world space.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {Matrix4}
   * @default undefined
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      if (this._modelMatrix !== value) {
        this._modelMatrix = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The type of geometry in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {PrimitiveType}
   * @default PrimitiveType.TRIANGLES
   */
  primitiveType: {
    get: function () {
      return this._primitiveType;
    },
    set: function (value) {
      if (this._primitiveType !== value) {
        this._primitiveType = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {VertexArray}
   * @default undefined
   */
  vertexArray: {
    get: function () {
      return this._vertexArray;
    },
    set: function (value) {
      if (this._vertexArray !== value) {
        this._vertexArray = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The number of vertices to draw in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default undefined
   */
  count: {
    get: function () {
      return this._count;
    },
    set: function (value) {
      if (this._count !== value) {
        this._count = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The offset to start drawing in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default 0
   */
  offset: {
    get: function () {
      return this._offset;
    },
    set: function (value) {
      if (this._offset !== value) {
        this._offset = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The number of instances to draw.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default 0
   */
  instanceCount: {
    get: function () {
      return this._instanceCount;
    },
    set: function (value) {
      if (this._instanceCount !== value) {
        this._instanceCount = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The shader program to apply.
   *
   * @memberof DrawCommand.prototype
   * @type {ShaderProgram}
   * @default undefined
   */
  shaderProgram: {
    get: function () {
      return this._shaderProgram;
    },
    set: function (value) {
      if (this._shaderProgram !== value) {
        this._shaderProgram = value;
        this.dirty = true;
      }
    },
  },

  /**
   * Whether this command should cast shadows when shadowing is enabled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  castShadows: {
    get: function () {
      return hasFlag(this, Flags.CAST_SHADOWS);
    },
    set: function (value) {
      if (hasFlag(this, Flags.CAST_SHADOWS) !== value) {
        setFlag(this, Flags.CAST_SHADOWS, value);
        this.dirty = true;
      }
    },
  },

  /**
   * Whether this command should receive shadows when shadowing is enabled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  receiveShadows: {
    get: function () {
      return hasFlag(this, Flags.RECEIVE_SHADOWS);
    },
    set: function (value) {
      if (hasFlag(this, Flags.RECEIVE_SHADOWS) !== value) {
        setFlag(this, Flags.RECEIVE_SHADOWS, value);
        this.dirty = true;
      }
    },
  },

  /**
   * An object with functions whose names match the uniforms in the shader program
   * and return values to set those uniforms.
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   */
  uniformMap: {
    get: function () {
      return this._uniformMap;
    },
    set: function (value) {
      if (this._uniformMap !== value) {
        this._uniformMap = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The render state.
   *
   * @memberof DrawCommand.prototype
   * @type {RenderState}
   * @default undefined
   */
  renderState: {
    get: function () {
      return this._renderState;
    },
    set: function (value) {
      if (this._renderState !== value) {
        this._renderState = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The framebuffer to draw to.
   *
   * @memberof DrawCommand.prototype
   * @type {Framebuffer}
   * @default undefined
   */
  framebuffer: {
    get: function () {
      return this._framebuffer;
    },
    set: function (value) {
      if (this._framebuffer !== value) {
        this._framebuffer = value;
        this.dirty = true;
      }
    },
  },

  /**
   * The pass when to render.
   *
   * @memberof DrawCommand.prototype
   * @type {Pass}
   * @default undefined
   */
  pass: {
    get: function () {
      return this._pass;
    },
    set: function (value) {
      if (this._pass !== value) {
        this._pass = value;
        this.dirty = true;
      }
    },
  },

  /**
   * Specifies if this command is only to be executed in the frustum closest
   * to the eye containing the bounding volume. Defaults to <code>false</code>.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  executeInClosestFrustum: {
    get: function () {
      return hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM);
    },
    set: function (value) {
      if (hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM) !== value) {
        setFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM, value);
        this.dirty = true;
      }
    },
  },

  /**
   * The object who created this command.  This is useful for debugging command
   * execution; it allows us to see who created a command when we only have a
   * reference to the command, and can be used to selectively execute commands
   * with {@link Scene#debugCommandFilter}.
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   *
   * @see Scene#debugCommandFilter
   */
  owner: {
    get: function () {
      return this._owner;
    },
    set: function (value) {
      if (this._owner !== value) {
        this._owner = value;
        this.dirty = true;
      }
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the {@link DrawCommand#boundingVolume} for this command, assuming it is a sphere, when the command executes.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   *
   * @see DrawCommand#boundingVolume
   */
  debugShowBoundingVolume: {
    get: function () {
      return hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME);
    },
    set: function (value) {
      if (hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME) !== value) {
        setFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME, value);
        this.dirty = true;
      }
    },
  },

  /**
   * Used to implement Scene.debugShowFrustums.
   * @private
   */
  debugOverlappingFrustums: {
    get: function () {
      return this._debugOverlappingFrustums;
    },
    set: function (value) {
      if (this._debugOverlappingFrustums !== value) {
        this._debugOverlappingFrustums = value;
        this.dirty = true;
      }
    },
  },
  /**
   * A GLSL string that will evaluate to a pick id. When <code>undefined</code>, the command will only draw depth
   * during the pick pass.
   *
   * @memberof DrawCommand.prototype
   * @type {string}
   * @default undefined
   */
  pickId: {
    get: function () {
      return this._pickId;
    },
    set: function (value) {
      if (this._pickId !== value) {
        this._pickId = value;
        this.dirty = true;
      }
    },
  },
  /**
   * Whether this command should be executed in the pick pass only.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  pickOnly: {
    get: function () {
      return hasFlag(this, Flags.PICK_ONLY);
    },
    set: function (value) {
      if (hasFlag(this, Flags.PICK_ONLY) !== value) {
        setFlag(this, Flags.PICK_ONLY, value);
        this.dirty = true;
      }
    },
  },
  /**
   * Whether this command should be derived to draw depth for classification of translucent primitives.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  depthForTranslucentClassification: {
    get: function () {
      return hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION);
    },
    set: function (value) {
      if (hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION) !== value) {
        setFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION, value);
        this.dirty = true;
      }
    },
  },
});

/**
 * @private
 */
DrawCommand.shallowClone = function (command, result) {
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
  result._flags = command._flags;

  result.dirty = true;
  result.lastDirtyTime = 0;

  return result;
};

/**
 * Executes the draw command.
 *
 * @param {Context} context The renderer context in which to draw.
 * @param {PassState} [passState] The state for the current render pass.
 */
DrawCommand.prototype.execute = function (context, passState) {
  context.draw(this, passState);
};
export default DrawCommand;
