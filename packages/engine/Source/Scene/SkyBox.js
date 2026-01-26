import buildModuleUrl from "../Core/buildModuleUrl.js";
import CubeMapPanorama from "./CubeMapPanorama.js";
import SceneMode from "./SceneMode.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * A sky box around the scene to draw stars.  The sky box is defined using the True Equator Mean Equinox (TEME) axes.
 * <p>
 * This is only supported in 3D.  The sky box is faded out when morphing to 2D or Columbus view.  The size of
 * the sky box must not exceed {@link Scene#maximumCubeMapSize}.
 * </p>
 *
 * @alias SkyBox
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {object} [options.sources] The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
 * @param {boolean} [options.show=true] Determines if this primitive will be shown.
 *
 *
 * @example
 * scene.skyBox = new Cesium.SkyBox({
 *   sources : {
 *     positiveX : 'skybox_px.png',
 *     negativeX : 'skybox_nx.png',
 *     positiveY : 'skybox_py.png',
 *     negativeY : 'skybox_ny.png',
 *     positiveZ : 'skybox_pz.png',
 *     negativeZ : 'skybox_nz.png'
 *   }
 * });
 *
 * @see Scene#skyBox
 * @see Transforms.computeTemeToPseudoFixedMatrix
 */
function SkyBox(options) {
  /**
   * The sources used to create the cube map faces: an object
   * with <code>positiveX</code>, <code>negativeX</code>, <code>positiveY</code>,
   * <code>negativeY</code>, <code>positiveZ</code>, and <code>negativeZ</code> properties.
   * These can be either URLs or <code>Image</code> objects.
   *
   * @type {object}
   * @default undefined
   */
  this._sources = options.sources;

  /**
   * Determines if the sky box will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = options.show ?? true;
  this._panorama = new CubeMapPanorama({
    sources: this._sources,
    show: this._show,
    returnCommand: true,
  });
}

Object.defineProperties(SkyBox.prototype, {
  /**
   * Gets or sets the the primitive object.
   * @memberof Panorama.prototype
   * @type {object}
   */
  sources: {
    get: function () {
      return this._panorama.sources;
    },
    set: function (value) {
      this._panorama.sources = value;
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
SkyBox.prototype.update = function (frameState, useHdr) {
  const { mode, passes } = frameState;

  if (mode !== SceneMode.SCENE3D && mode !== SceneMode.MORPHING) {
    return;
  }

  if (!passes.render) {
    return;
  }

  // Delegate completely
  return this._panorama.update(frameState, useHdr);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see SkyBox#destroy
 */
SkyBox.prototype.isDestroyed = function () {
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
 * skyBox = skyBox && skyBox.destroy();
 *
 * @see SkyBox#isDestroyed
 */
SkyBox.prototype.destroy = function () {
  this._panorama = this._panorama && this._panorama.destroy();
  return destroyObject(this);
};

function getDefaultSkyBoxUrl(suffix) {
  return buildModuleUrl(`Assets/Textures/SkyBox/tycho2t3_80_${suffix}.jpg`);
}

/**
 * Creates a skybox instance with the default starmap for the Earth.
 * @return {SkyBox} The default skybox for the Earth
 *
 * @example
 * viewer.scene.skyBox = Cesium.SkyBox.createEarthSkyBox();
 */
SkyBox.createEarthSkyBox = function () {
  return new SkyBox({
    sources: {
      positiveX: getDefaultSkyBoxUrl("px"),
      negativeX: getDefaultSkyBoxUrl("mx"),
      positiveY: getDefaultSkyBoxUrl("py"),
      negativeY: getDefaultSkyBoxUrl("my"),
      positiveZ: getDefaultSkyBoxUrl("pz"),
      negativeZ: getDefaultSkyBoxUrl("mz"),
    },
  });
};

export default SkyBox;
