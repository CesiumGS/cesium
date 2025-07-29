import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import Texture from "../Renderer/Texture.js";
import VertexArray from "../Renderer/VertexArray.js";
import SunFS from "../Shaders/SunFS.js";
import SunTextureFS from "../Shaders/SunTextureFS.js";
import SunVS from "../Shaders/SunVS.js";
import BlendingState from "./BlendingState.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";

/**
 * Draws a sun billboard.
 * <p>This is only supported in 3D and Columbus view.</p>
 *
 * @alias Sun
 * @constructor
 *
 *
 * @example
 * scene.sun = new Cesium.Sun();
 *
 * @see Scene#sun
 */
function Sun() {
  /**
   * Determines if the sun will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = true;

  this._drawCommand = new DrawCommand({
    primitiveType: PrimitiveType.TRIANGLES,
    boundingVolume: new BoundingSphere(),
    owner: this,
  });
  this._commands = {
    drawCommand: this._drawCommand,
    computeCommand: undefined,
  };
  this._boundingVolume = new BoundingSphere();
  this._boundingVolume2D = new BoundingSphere();

  this._texture = undefined;
  this._drawingBufferWidth = undefined;
  this._drawingBufferHeight = undefined;
  this._radiusTS = undefined;
  this._size = undefined;

  this.glowFactor = 1.0;
  this._glowFactorDirty = false;

  this._useHdr = undefined;

  const that = this;
  this._uniformMap = {
    u_texture: function () {
      return that._texture;
    },
    u_size: function () {
      return that._size;
    },
  };
}

Object.defineProperties(Sun.prototype, {
  /**
   * Gets or sets a number that controls how "bright" the Sun's lens flare appears
   * to be.  Zero shows just the Sun's disc without any flare.
   * Use larger values for a more pronounced flare around the Sun.
   *
   * @memberof Sun.prototype
   * @type {number}
   * @default 1.0
   */
  glowFactor: {
    get: function () {
      return this._glowFactor;
    },
    set: function (glowFactor) {
      glowFactor = Math.max(glowFactor, 0.0);
      this._glowFactor = glowFactor;
      this._glowFactorDirty = true;
    },
  },
});

const scratchPositionWC = new Cartesian2();
const scratchLimbWC = new Cartesian2();
const scratchPositionEC = new Cartesian4();
const scratchCartesian4 = new Cartesian4();

/**
 * @private
 */
Sun.prototype.update = function (frameState, passState, useHdr) {
  if (!this.show) {
    return undefined;
  }

  const mode = frameState.mode;
  if (mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
    return undefined;
  }

  if (!frameState.passes.render) {
    return undefined;
  }

  const context = frameState.context;
  const drawingBufferWidth = passState.viewport.width;
  const drawingBufferHeight = passState.viewport.height;

  if (
    !defined(this._texture) ||
    drawingBufferWidth !== this._drawingBufferWidth ||
    drawingBufferHeight !== this._drawingBufferHeight ||
    this._glowFactorDirty ||
    useHdr !== this._useHdr
  ) {
    this._texture = this._texture && this._texture.destroy();
    this._drawingBufferWidth = drawingBufferWidth;
    this._drawingBufferHeight = drawingBufferHeight;
    this._glowFactorDirty = false;
    this._useHdr = useHdr;

    let size = Math.max(drawingBufferWidth, drawingBufferHeight);
    size = Math.pow(2.0, Math.ceil(Math.log(size) / Math.log(2.0)) - 2.0);

    // The size computed above can be less than 1.0 if size < 4.0. This will probably
    // never happen in practice, but does in the tests. Clamp to 1.0 to prevent WebGL
    // errors in the tests.
    size = Math.max(1.0, size);

    const pixelDatatype = useHdr
      ? context.halfFloatingPointTexture
        ? PixelDatatype.HALF_FLOAT
        : PixelDatatype.FLOAT
      : PixelDatatype.UNSIGNED_BYTE;
    this._texture = new Texture({
      context: context,
      width: size,
      height: size,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: pixelDatatype,
    });

    this._glowLengthTS = this._glowFactor * 5.0;
    this._radiusTS = (1.0 / (1.0 + 2.0 * this._glowLengthTS)) * 0.5;

    const that = this;
    const uniformMap = {
      u_radiusTS: function () {
        return that._radiusTS;
      },
    };

    this._commands.computeCommand = new ComputeCommand({
      fragmentShaderSource: SunTextureFS,
      outputTexture: this._texture,
      uniformMap: uniformMap,
      persists: false,
      owner: this,
      postExecute: function () {
        that._commands.computeCommand = undefined;
      },
    });
  }

  const drawCommand = this._drawCommand;

  if (!defined(drawCommand.vertexArray)) {
    const attributeLocations = {
      direction: 0,
    };

    const directions = new Uint8Array(4 * 2);
    directions[0] = 0;
    directions[1] = 0;

    directions[2] = 255;
    directions[3] = 0.0;

    directions[4] = 255;
    directions[5] = 255;

    directions[6] = 0.0;
    directions[7] = 255;

    const vertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: directions,
      usage: BufferUsage.STATIC_DRAW,
    });
    const attributes = [
      {
        index: attributeLocations.direction,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 2,
        normalize: true,
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      },
    ];
    // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
    const indexBuffer = Buffer.createIndexBuffer({
      context: context,
      typedArray: new Uint16Array([0, 1, 2, 0, 2, 3]),
      usage: BufferUsage.STATIC_DRAW,
      indexDatatype: IndexDatatype.UNSIGNED_SHORT,
    });
    drawCommand.vertexArray = new VertexArray({
      context: context,
      attributes: attributes,
      indexBuffer: indexBuffer,
    });

    drawCommand.shaderProgram = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: SunVS,
      fragmentShaderSource: SunFS,
      attributeLocations: attributeLocations,
    });

    drawCommand.renderState = RenderState.fromCache({
      blending: BlendingState.ALPHA_BLEND,
    });
    drawCommand.uniformMap = this._uniformMap;
  }

  const sunPosition = context.uniformState.sunPositionWC;
  const sunPositionCV = context.uniformState.sunPositionColumbusView;

  const boundingVolume = this._boundingVolume;
  const boundingVolume2D = this._boundingVolume2D;

  Cartesian3.clone(sunPosition, boundingVolume.center);
  boundingVolume2D.center.x = sunPositionCV.z;
  boundingVolume2D.center.y = sunPositionCV.x;
  boundingVolume2D.center.z = sunPositionCV.y;

  boundingVolume.radius =
    CesiumMath.SOLAR_RADIUS + CesiumMath.SOLAR_RADIUS * this._glowLengthTS;
  boundingVolume2D.radius = boundingVolume.radius;

  if (mode === SceneMode.SCENE3D) {
    BoundingSphere.clone(boundingVolume, drawCommand.boundingVolume);
  } else if (mode === SceneMode.COLUMBUS_VIEW) {
    BoundingSphere.clone(boundingVolume2D, drawCommand.boundingVolume);
  }

  const position = SceneTransforms.computeActualEllipsoidPosition(
    frameState,
    sunPosition,
    scratchCartesian4,
  );

  const dist = Cartesian3.magnitude(
    Cartesian3.subtract(
      position,
      frameState.camera.position,
      scratchCartesian4,
    ),
  );
  const projMatrix = context.uniformState.projection;

  const positionEC = scratchPositionEC;
  positionEC.x = 0;
  positionEC.y = 0;
  positionEC.z = -dist;
  positionEC.w = 1;

  const positionCC = Matrix4.multiplyByVector(
    projMatrix,
    positionEC,
    scratchCartesian4,
  );
  const positionWC = SceneTransforms.clipToGLWindowCoordinates(
    passState.viewport,
    positionCC,
    scratchPositionWC,
  );

  positionEC.x = CesiumMath.SOLAR_RADIUS;
  const limbCC = Matrix4.multiplyByVector(
    projMatrix,
    positionEC,
    scratchCartesian4,
  );
  const limbWC = SceneTransforms.clipToGLWindowCoordinates(
    passState.viewport,
    limbCC,
    scratchLimbWC,
  );

  this._size = Cartesian2.magnitude(
    Cartesian2.subtract(limbWC, positionWC, scratchCartesian4),
  );
  this._size = 2.0 * this._size * (1.0 + 2.0 * this._glowLengthTS);
  this._size = Math.ceil(this._size);

  return this._commands;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Sun#destroy
 */
Sun.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * sun = sun && sun.destroy();
 *
 *  @see Sun#isDestroyed
 */
Sun.prototype.destroy = function () {
  const command = this._drawCommand;
  command.vertexArray = command.vertexArray && command.vertexArray.destroy();
  command.shaderProgram =
    command.shaderProgram && command.shaderProgram.destroy();

  this._texture = this._texture && this._texture.destroy();

  return destroyObject(this);
};
export default Sun;
