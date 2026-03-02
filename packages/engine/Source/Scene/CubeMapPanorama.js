import BoxGeometry from "../Core/BoxGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
import Matrix4 from "../Core/Matrix4.js";
import VertexFormat from "../Core/VertexFormat.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import CubeMap from "../Renderer/CubeMap.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import loadCubeMap from "../Renderer/loadCubeMap.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import VertexArray from "../Renderer/VertexArray.js";
import SkyBoxFS from "../Shaders/SkyBoxFS.js";
import SkyBoxVS from "../Shaders/SkyBoxVS.js";
import CubeMapPanoramaVS from "../Shaders/CubeMapPanoramaVS.js";
import BlendingState from "./BlendingState.js";
import SceneMode from "./SceneMode.js";
import Pass from "../Renderer/Pass.js";
import Credit from "../Core/Credit.js";

/**
 * @typedef {object} CubeMapPanorama.ConstructorOptions
 *
 * Initialization options for the CubeMapPanorama constructor
 *
 * @property {object} [options.sources] The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
 * @property {Matrix4} [options.transform] A 4x4 transformation matrix that defines the panorama’s position and orientation
 * @property {boolean} [options.show=true] Determines if this primitive will be shown.
 * @property {Credit|string} [options.credit] A credit for the panorama, which is displayed on the canvas.
 *
 */

/**
 * A {@link Panorama} that displays imagery in cube map format in a scene.
 * <p>
 * This is only supported in 3D.  The cube map panorama is faded out when morphing to 2D or Columbus view.  The size of
 * the cube map panorama must not exceed {@link Scene#maximumSkyBoxSize}.
 * </p>
 *
 * @alias CubeMapPanorama
 * @constructor
 *
 * @param {CubeMapPanorama.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * const modelMatrix = Cesium.Matrix4.getMatrix3(
 *   Cesium.Transforms.localFrameToFixedFrameGenerator("north", "down")(
 *     Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
 *     Cesium.Ellipsoid.default
 *   ),
 *   new Cesium.Matrix3()
 * );
 *
 *
 * scene.primitives.add(new Cesium.CubeMapPanorama({
 *   sources : {
 *     positiveX : 'cubemap_px.png',
 *     negativeX : 'cubemap_nx.png',
 *     positiveY : 'cubemap_py.png',
 *     negativeY : 'cubemap_ny.png',
 *     positiveZ : 'cubemap_pz.png',
 *     negativeZ : 'cubemap_nz.png'
 *   }
 *   transform: modelMatrix,
 * }));
 *
 * @see SkyBox
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=panorama|Cesium Sandcastle Panorama}
 */
function CubeMapPanorama(options) {
  /**
   * The sources used to create the cube map faces: an object
   * with <code>positiveX</code>, <code>negativeX</code>, <code>positiveY</code>,
   * <code>negativeY</code>, <code>positiveZ</code>, and <code>negativeZ</code> properties.
   * These can be either URLs or <code>Image</code> objects.
   *
   * @type {object}
   * @default undefined
   */
  this.sources = options.sources;
  this._sources = undefined;

  this._transform = options.transform ?? undefined;

  /**
   * Determines if the cube map panorama will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = options.show ?? true;

  this._returnCommand = options.returnCommand ?? false;
  this._addToPanoramaCommandList = !this._returnCommand;

  this._command = new DrawCommand({
    modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    owner: this,
    // render before everything else
    pass: Pass.ENVIRONMENT,
  });
  this._cubeMap = undefined;

  this._attributeLocations = undefined;
  this._useHdr = undefined;
  this._hasError = false;
  this._error = undefined;

  // Credit specified by the user.
  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;
}

Object.defineProperties(CubeMapPanorama.prototype, {
  /**
   * Gets the transform of the panorama.
   * @memberof CubeMapPanorama.prototype
   * @type {Matrix4}
   * @readonly
   */
  transform: {
    get: function () {
      return this._transform;
    },
  },

  /**
   * Gets the credits of the panorama.
   * @memberof CubeMapPanorama.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return defined(this._credit) ? this._credit : undefined;
    },
  },
});

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} this.sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
 * @exception {DeveloperError} this.sources properties must all be the same type.
 */
CubeMapPanorama.prototype.update = function (frameState, useHdr) {
  const that = this;
  const { mode, passes, context, panoramaCommandList } = frameState;

  if (!this.show) {
    return undefined;
  }

  if (mode !== SceneMode.SCENE3D && mode !== SceneMode.MORPHING) {
    return undefined;
  }

  // The cube map panorama is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
  if (!passes.render) {
    return undefined;
  }

  // Throw any errors that had previously occurred asynchronously so they aren't
  // ignored when running.  See https://github.com/CesiumGS/cesium/pull/12307
  if (this._hasError) {
    const error = this._error;
    this._hasError = false;
    this._error = undefined;
    throw error;
  }

  if (this._sources !== this.sources) {
    this._sources = this.sources;
    const sources = this.sources;

    //>>includeStart('debug', pragmas.debug);
    Check.defined("this.sources", sources);
    if (
      Object.values(CubeMap.FaceName).some(
        (faceName) => !defined(sources[faceName]),
      )
    ) {
      throw new DeveloperError(
        "this.sources must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.",
      );
    }

    const sourceType = typeof sources.positiveX;
    if (
      Object.values(CubeMap.FaceName).some(
        (faceName) => typeof sources[faceName] !== sourceType,
      )
    ) {
      throw new DeveloperError(
        "this.sources properties must all be the same type.",
      );
    }
    //>>includeEnd('debug');

    if (typeof sources.positiveX === "string") {
      // Given urls for cube-map images.  Load them.
      loadCubeMap(context, this._sources)
        .then(function (cubeMap) {
          that._cubeMap = that._cubeMap && that._cubeMap.destroy();
          that._cubeMap = cubeMap;
        })
        .catch((error) => {
          // Defer throwing the error until the next call to update to prevent
          // test from failing in `afterAll` if this is rejected after the test
          // using the Skybox ends.  See https://github.com/CesiumGS/cesium/pull/12307
          this._hasError = true;
          this._error = error;
        });
    } else {
      this._cubeMap = this._cubeMap && this._cubeMap.destroy();
      this._cubeMap = new CubeMap({
        context: context,
        source: sources,
      });
    }
    this._addToPanoramaCommandList = true;
  }

  const command = this._command;

  if (!defined(command.vertexArray)) {
    command.uniformMap = {
      u_cubeMap: function () {
        return that._cubeMap;
      },
      u_cubeMapPanoramaTransform: function () {
        return that._transform;
      },
    };

    const geometry = BoxGeometry.createGeometry(
      BoxGeometry.fromDimensions({
        dimensions: new Cartesian3(2.0, 2.0, 2.0),
        vertexFormat: VertexFormat.POSITION_ONLY,
      }),
    );
    const attributeLocations = (this._attributeLocations =
      GeometryPipeline.createAttributeLocations(geometry));

    command.vertexArray = VertexArray.fromGeometry({
      context: context,
      geometry: geometry,
      attributeLocations: attributeLocations,
      bufferUsage: BufferUsage.STATIC_DRAW,
    });

    // no depth test/write
    command.renderState = RenderState.fromCache({
      depthTest: { enabled: false },
      depthMask: false,
      blending: BlendingState.ALPHA_BLEND,
    });
    this._addToPanoramaCommandList = true;
  }

  if (!defined(command.shaderProgram) || this._useHdr !== useHdr) {
    const fs = new ShaderSource({
      defines: [useHdr ? "HDR" : ""],
      sources: [SkyBoxFS],
    });
    command.shaderProgram = ShaderProgram.fromCache({
      context: context,
      //vertexShaderSource: SkyBoxVS,
      vertexShaderSource: defined(this._transform)
        ? CubeMapPanoramaVS
        : SkyBoxVS,
      fragmentShaderSource: fs,
      attributeLocations: this._attributeLocations,
    });
    this._useHdr = useHdr;
    this._addToPanoramaCommandList = true;
  }

  if (!defined(this._cubeMap)) {
    return undefined;
  }

  if (this.show && defined(this._credit) && !this._returnCommand) {
    const creditDisplay = frameState.creditDisplay;
    creditDisplay.addCreditToNextFrame(this._credit);
  }

  if (this._returnCommand) {
    return command;
  }

  if (this._addToPanoramaCommandList) {
    panoramaCommandList.push(command);
    this._addToPanoramaCommandList = false;
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see CubeMapPanorama#destroy
 */
CubeMapPanorama.prototype.isDestroyed = function () {
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
 * cubeMapPanorama = cubeMapPanorama && cubeMapPanorama.destroy();
 *
 * @see CubeMapPanorama#isDestroyed
 */
CubeMapPanorama.prototype.destroy = function () {
  const command = this._command;
  command.vertexArray = command.vertexArray && command.vertexArray.destroy();
  command.shaderProgram =
    command.shaderProgram && command.shaderProgram.destroy();
  this._cubeMap = this._cubeMap && this._cubeMap.destroy();
  return destroyObject(this);
};

export default CubeMapPanorama;
