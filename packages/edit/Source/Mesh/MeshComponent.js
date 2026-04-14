import { DeveloperError } from "@cesium/engine";

/**
 * Base class for mesh elements owned by an EditableMesh.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshComponent {
  /**
   * Move a mesh component to a new position in model space.
   *
   * @param {Cartesian3} newPosition
   */
  move(newPosition) {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
