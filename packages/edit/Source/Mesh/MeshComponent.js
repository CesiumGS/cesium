import { DeveloperError } from "@cesium/engine";
/** @import { Cartesian3 } from "@cesium/engine"; */

/**
 * Base class for mesh elements owned by an EditableMesh.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshComponent {
  /**
   * Move a mesh component by a given translation in model space.
   *
   * @param {Cartesian3} translation
   */
  move(translation) {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
