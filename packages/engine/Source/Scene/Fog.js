import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import SceneMode from "./SceneMode.js";

/**
 * Blends the atmosphere to geometry far from the camera for horizon views. Allows for additional
 * performance improvements by rendering less geometry and dispatching less terrain requests.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Fog.html|Cesium Sandcastle Fog Demo}
 *
 * @alias Fog
 * @constructor
 */
function Fog() {
  /**
   * <code>true</code> if fog is enabled, <code>false</code> otherwise.
   * @type {boolean}
   * @default true
   * @example
   * // Disable fog in the scene
   * viewer.scene.fog.enabled = false;
   */
  this.enabled = true;
  /**
   * <code>true</code> if fog is renderable in shaders, <code>false</code> otherwise.
   * This allows to benefits from optimized tile loading strategy based on fog density without the actual visual rendering.
   * @type {boolean}
   * @default true
   * @example
   * // Use fog culling but don't render it
   * viewer.scene.fog.enabled = true;
   * viewer.scene.fog.renderable = false;
   */
  this.renderable = true;
  /**
   * A scalar that determines the density of the fog. Terrain that is in full fog are culled.
   * The density of the fog increases as this number approaches 1.0 and becomes less dense as it approaches zero.
   * The more dense the fog is, the more aggressively the terrain is culled. For example, if the camera is a height of
   * 1000.0m above the ellipsoid, increasing the value to 3.0e-3 will cause many tiles close to the viewer be culled.
   * Decreasing the value will push the fog further from the viewer, but decrease performance as more of the terrain is rendered.
   * @type {number}
   * @default 0.0006
   * @example
   * // Double the default fog density
   * viewer.scene.fog.density = 0.0012;
   */
  this.density = 0.0006;
  /**
   * A scalar used in the function to adjust density based on the height of the camera above the terrain.
   * @type {number}
   * @default 0.001
   */
  this.heightScalar = 0.001;
  this._heightFalloff = 0.59;
  /**
   * The maximum height fog is applied. If the camera is above this height fog will be disabled.
   * @type {number}
   * @default 800000.0
   */
  this.maxHeight = 800000.0;
  /**
   * A scalar that impacts the visual density of fog. This value does not impact the culling of terrain.
   * Use in combination with the {@link Fog.density} to make fog appear more or less dense.
   * @type {number}
   * @default 0.15
   * @experimental The value of this scalar may not be final and is subject to change.
   * @example
   * // Increase fog appearance effect
   * viewer.scene.fog.visualDensityScalar = 0.6;
   */
  this.visualDensityScalar = 0.15;
  /**
   * A factor used to increase the screen space error of terrain tiles when they are partially in fog. The effect is to reduce
   * the number of terrain tiles requested for rendering. If set to zero, the feature will be disabled. If the value is increased
   * for mountainous regions, less tiles will need to be requested, but the terrain meshes near the horizon may be a noticeably
   * lower resolution. If the value is increased in a relatively flat area, there will be little noticeable change on the horizon.
   * @type {number}
   * @default 2.0
   */
  this.screenSpaceErrorFactor = 2.0;
  /**
   * The minimum brightness of the fog color from lighting. A value of 0.0 can cause the fog to be completely black. A value of 1.0 will not affect
   * the brightness at all.
   * @type {number}
   * @default 0.03
   */
  this.minimumBrightness = 0.03;
}

Object.defineProperties(Fog.prototype, {
  /**
   * Exponent factor used in the function to adjust how density changes based on the height of the camera above the ellipsoid. Smaller values produce a more gradual transition as camera height increases.
   * Value must be greater than 0.
   * @memberof Fog.prototype
   * @type {number}
   * @default 0.59
   */
  heightFalloff: {
    get: function () {
      return this._heightFalloff;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value < 0) {
        throw new DeveloperError("value must be positive.");
      }
      //>>includeEnd('debug');

      this._heightFalloff = value;
    },
  },
});

const scratchPositionNormal = new Cartesian3();

/**
 * @param {FrameState} frameState
 * @private
 */
Fog.prototype.update = function (frameState) {
  const enabled = (frameState.fog.enabled = this.enabled);
  if (!enabled) {
    return;
  }

  frameState.fog.renderable = this.renderable;

  const camera = frameState.camera;
  const positionCartographic = camera.positionCartographic;

  // Turn off fog in space.
  if (
    !defined(positionCartographic) ||
    positionCartographic.height > this.maxHeight ||
    frameState.mode !== SceneMode.SCENE3D
  ) {
    frameState.fog.enabled = false;
    frameState.fog.density = 0;
    return;
  }

  const height = positionCartographic.height;
  let density =
    this.density *
    this.heightScalar *
    Math.pow(
      Math.max(height / this.maxHeight, CesiumMath.EPSILON4),
      -Math.max(this._heightFalloff, 0.0),
    );

  // Fade fog in as the camera tilts toward the horizon.
  const positionNormal = Cartesian3.normalize(
    camera.positionWC,
    scratchPositionNormal,
  );
  const dot = Math.abs(Cartesian3.dot(camera.directionWC, positionNormal));
  density *= 1.0 - dot;

  frameState.fog.density = density;
  frameState.fog.visualDensityScalar = this.visualDensityScalar;
  frameState.fog.sse = this.screenSpaceErrorFactor;
  frameState.fog.minimumBrightness = this.minimumBrightness;
};
export default Fog;
