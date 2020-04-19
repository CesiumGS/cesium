import defaultValue from "../Core/defaultValue.js";
import PointCloudEyeDomeLighting from "./PointCloudEyeDomeLighting.js";

/**
 * Options for performing point attenuation based on geometric error when rendering
 * point clouds using 3D Tiles.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.attenuation=false] Perform point attenuation based on geometric error.
 * @param {Number} [options.geometricErrorScale=1.0] Scale to be applied to each tile's geometric error.
 * @param {Number} [options.maximumAttenuation] Maximum attenuation in pixels. Defaults to the Cesium3DTileset's maximumScreenSpaceError.
 * @param {Number} [options.baseResolution] Average base resolution for the dataset in meters. Substitute for Geometric Error when not available.
 * @param {Boolean} [options.eyeDomeLighting=true] When true, use eye dome lighting when drawing with point attenuation.
 * @param {Number} [options.eyeDomeLightingStrength=1.0] Increasing this value increases contrast on slopes and edges.
 * @param {Number} [options.eyeDomeLightingRadius=1.0] Increase the thickness of contours from eye dome lighting.
 * @param {Boolean} [options.backFaceCulling=false] Determines whether back-facing points are hidden. This option works only if data has normals included.
 * @param {Boolean} [options.normalShading=true] Determines whether a point cloud that contains normals is shaded by the scene's light source.
 *
 * @alias PointCloudShading
 * @constructor
 */
function PointCloudShading(options) {
  var pointCloudShading = defaultValue(options, {});

  /**
   * Perform point attenuation based on geometric error.
   * @type {Boolean}
   * @default false
   */
  this.attenuation = defaultValue(pointCloudShading.attenuation, false);

  /**
   * Scale to be applied to the geometric error before computing attenuation.
   * @type {Number}
   * @default 1.0
   */
  this.geometricErrorScale = defaultValue(
    pointCloudShading.geometricErrorScale,
    1.0
  );

  /**
   * Maximum point attenuation in pixels. If undefined, the Cesium3DTileset's maximumScreenSpaceError will be used.
   * @type {Number}
   */
  this.maximumAttenuation = pointCloudShading.maximumAttenuation;

  /**
   * Average base resolution for the dataset in meters.
   * Used in place of geometric error when geometric error is 0.
   * If undefined, an approximation will be computed for each tile that has geometric error of 0.
   * @type {Number}
   */
  this.baseResolution = pointCloudShading.baseResolution;

  /**
   * Use eye dome lighting when drawing with point attenuation
   * Requires support for EXT_frag_depth, OES_texture_float, and WEBGL_draw_buffers extensions in WebGL 1.0,
   * otherwise eye dome lighting is ignored.
   *
   * @type {Boolean}
   * @default true
   */
  this.eyeDomeLighting = defaultValue(pointCloudShading.eyeDomeLighting, true);

  /**
   * Eye dome lighting strength (apparent contrast)
   * @type {Number}
   * @default 1.0
   */
  this.eyeDomeLightingStrength = defaultValue(
    pointCloudShading.eyeDomeLightingStrength,
    1.0
  );

  /**
   * Thickness of contours from eye dome lighting
   * @type {Number}
   * @default 1.0
   */
  this.eyeDomeLightingRadius = defaultValue(
    pointCloudShading.eyeDomeLightingRadius,
    1.0
  );

  /**
   * Determines whether back-facing points are hidden.
   * This option works only if data has normals included.
   *
   * @type {Boolean}
   * @default false
   */
  this.backFaceCulling = defaultValue(pointCloudShading.backFaceCulling, false);

  /**
   * Determines whether a point cloud that contains normals is shaded by the scene's light source.
   *
   * @type {Boolean}
   * @default true
   */
  this.normalShading = defaultValue(pointCloudShading.normalShading, true);
}

/**
 * Determines if point cloud shading is supported.
 *
 * @param {Scene} scene The scene.
 * @returns {Boolean} <code>true</code> if point cloud shading is supported; otherwise, returns <code>false</code>
 */
PointCloudShading.isSupported = function (scene) {
  return PointCloudEyeDomeLighting.isSupported(scene.context);
};
export default PointCloudShading;
