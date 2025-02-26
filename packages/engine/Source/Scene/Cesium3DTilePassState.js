import Check from "../Core/Check.js";

/**
 * The state for a 3D Tiles update pass.
 *
 * @private
 * @constructor
 */
function Cesium3DTilePassState(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.number("options.pass", options.pass);
  //>>includeEnd('debug');

  /**
   * The pass.
   *
   * @type {Cesium3DTilePass}
   */
  this.pass = options.pass;

  /**
   * An array of rendering commands to use instead of {@link FrameState.commandList} for the current pass.
   *
   * @type {DrawCommand[]}
   */
  this.commandList = options.commandList;

  /**
   * A camera to use instead of {@link FrameState.camera} for the current pass.
   *
   * @type {Camera}
   */
  this.camera = options.camera;

  /**
   * A culling volume to use instead of {@link FrameState.cullingVolume} for the current pass.
   *
   * @type {CullingVolume}
   */
  this.cullingVolume = options.cullingVolume;

  /**
   * A read-only property that indicates whether the pass is ready, i.e. all tiles needed by the pass are loaded.
   *
   * @type {boolean}
   * @readonly
   * @default false
   */
  this.ready = false;
}
export default Cesium3DTilePassState;
