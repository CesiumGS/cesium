import SkyBox from "./SkyBox.js";

/**
 * A panorama defined by 6 images composing the faces of a cube map. The sky box is defined using the True Equator Mean Equinox (TEME) axes.
 * <p>
 * This is only supported in 3D.  The sky box is faded out when morphing to 2D or Columbus view.  The size of
 * the sky box must not exceed {@link Scene#maximumCubeMapSize}.
 * </p>
 *
 * @alias CubeMapPanorama
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {object} [options.sources] The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
 * @param {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 * @param {boolean} [options.show=true] Determines if this primitive will be shown.
 *
 *
 * @example
 * cubeMapPanorama = new Cesium.CubeMapPanorama({
 *   sources : {
 *     positiveX : 'skybox_px.png',
 *     negativeX : 'skybox_nx.png',
 *     positiveY : 'skybox_py.png',
 *     negativeY : 'skybox_ny.png',
 *     positiveZ : 'skybox_pz.png',
 *     negativeZ : 'skybox_nz.png'
 *   }
 * });
 * scene.skyBox = cubeMapPanorama;
 *
 * @see Scene#skyBox
 * @see Transforms.computeTemeToPseudoFixedMatrix
 */
function CubeMapPanorama(options) {
  /**
   * The sources used to create the cube map panorama faces: an object
   * with <code>positiveX</code>, <code>negativeX</code>, <code>positiveY</code>,
   * <code>negativeY</code>, <code>positiveZ</code>, and <code>negativeZ</code> properties.
   * These can be either URLs or <code>Image</code> objects.
   *
   * @type {object}
   * @default undefined
   */
  this.sources = options.sources;
  this._sources = undefined;

  const skyBox = new SkyBox({
    sources: this.sources,
  });
  return skyBox;
}

Object.defineProperties(CubeMapPanorama.prototype, {});

// /**
//  * Gets the sources for the panorama
//  *
//  * @returns {Image[]} The source images for the panorama.
//  */
// CubeMapPanorama.prototype.getSources = function () {
//   return this._sources;
// };

/**
 * Gets the transform for the panorama
 *
 * @returns {Matrix4} The transform for the panorama.
 */
CubeMapPanorama.prototype.getTransform = function () {
  return undefined;
};

/**
 * Gets the credits for the panorama
 *
 * @returns {Credit[]} The credits for the panorama.
 */
CubeMapPanorama.prototype.getCredits = function () {
  return this.credit;
};

export default CubeMapPanorama;
