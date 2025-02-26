import defaultValue from "../Core/defaultValue.js";
import PointCloudEyeDomeLighting from "./PointCloudEyeDomeLighting.js";

/**
 * Options for performing point attenuation based on geometric error when rendering
 * point clouds using 3D Tiles.
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.attenuation=false] Perform point attenuation based on geometric error.
 * @param {number} [options.geometricErrorScale=1.0] Scale to be applied to each tile's geometric error.
 * @param {number} [options.maximumAttenuation] Maximum attenuation in pixels. Defaults to the Cesium3DTileset's maximumScreenSpaceError.
 * @param {number} [options.baseResolution] Average base resolution for the dataset in meters. Substitute for Geometric Error when not available.
 * @param {boolean} [options.eyeDomeLighting=true] When true, use eye dome lighting when drawing with point attenuation.
 * @param {number} [options.eyeDomeLightingStrength=1.0] Increasing this value increases contrast on slopes and edges.
 * @param {number} [options.eyeDomeLightingRadius=1.0] Increase the thickness of contours from eye dome lighting.
 * @param {boolean} [options.backFaceCulling=false] Determines whether back-facing points are hidden. This option works only if data has normals included.
 * @param {boolean} [options.normalShading=true] Determines whether a point cloud that contains normals is shaded by the scene's light source.
 *
 * @alias PointCloudShading
 * @constructor
 */
function PointCloudShading(options) {
  const pointCloudShading = defaultValue(options, {});

  /**
   * Perform point attenuation based on geometric error.
   * @type {boolean}
   * @default false
   */
  this.attenuation = defaultValue(pointCloudShading.attenuation, false);

  /**
   * Scale to be applied to the geometric error before computing attenuation.
   * @type {number}
   * @default 1.0
   */
  this.geometricErrorScale = defaultValue(
    pointCloudShading.geometricErrorScale,
    1.0,
  );

  /**
   * Maximum point attenuation in pixels. If undefined, the Cesium3DTileset's maximumScreenSpaceError will be used.
   * @type {number}
   */
  this.maximumAttenuation = pointCloudShading.maximumAttenuation;

  /**
   * Average base resolution for the dataset in meters.
   * Used in place of geometric error when geometric error is 0.
   * If undefined, an approximation will be computed for each tile that has geometric error of 0.
   * @type {number}
   */
  this.baseResolution = pointCloudShading.baseResolution;

  /**
   * Use eye dome lighting when drawing with point attenuation
   * Requires support for EXT_frag_depth, OES_texture_float, and WEBGL_draw_buffers extensions in WebGL 1.0,
   * otherwise eye dome lighting is ignored.
   *
   * @type {boolean}
   * @default true
   */
  this.eyeDomeLighting = defaultValue(pointCloudShading.eyeDomeLighting, true);

  /**
   * Eye dome lighting strength (apparent contrast)
   * @type {number}
   * @default 1.0
   */
  this.eyeDomeLightingStrength = defaultValue(
    pointCloudShading.eyeDomeLightingStrength,
    1.0,
  );

  /**
   * Thickness of contours from eye dome lighting
   * @type {number}
   * @default 1.0
   */
  this.eyeDomeLightingRadius = defaultValue(
    pointCloudShading.eyeDomeLightingRadius,
    1.0,
  );

  /**
   * Determines whether back-facing points are hidden.
   * This option works only if data has normals included.
   *
   * @type {boolean}
   * @default false
   */
  this.backFaceCulling = defaultValue(pointCloudShading.backFaceCulling, false);

  /**
   * Determines whether a point cloud that contains normals is shaded by the scene's light source.
   *
   * @type {boolean}
   * @default true
   */
  this.normalShading = defaultValue(pointCloudShading.normalShading, true);
}

/**
 * Determines if point cloud shading is supported.
 *
 * @param {Scene} scene The scene.
 * @returns {boolean} <code>true</code> if point cloud shading is supported; otherwise, returns <code>false</code>
 */
PointCloudShading.isSupported = function (scene) {
  return PointCloudEyeDomeLighting.isSupported(scene.context);
};
export default PointCloudShading;
