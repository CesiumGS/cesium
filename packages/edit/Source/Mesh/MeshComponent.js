import { DeveloperError } from "@cesium/engine";
/** @import TopologyComponents from "./TopologyComponents.js"; */
/** @import Face from "./Face"; */
/** @import Edge from "./Edge"; */
/** @import Vertex from "./Vertex"; */

/**
 * Base class for mesh elements owned by an EditableMesh.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshComponent {
  /**
   * Returns the components one level below this one that compose it: the
   * boundary edges of a face, the endpoint vertices of an edge, or
   * nothing for a vertex.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  lower(result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * The level of this component, as a {@link TopologyComponents} bit.
   * @returns {TopologyComponents}
   */
  level() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns the components one level above this one that this is
   * incident to: the incident edges of a vertex, the incident faces of
   * an edge, or nothing for a face.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  upper(result) {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
