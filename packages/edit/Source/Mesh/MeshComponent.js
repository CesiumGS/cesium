import { DeveloperError } from "@cesium/engine";
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
   * Returns the vertices that compose this component (for edges and faces),
   * or the vertex itself (for vertices).
   * @param {Vertex[]} result Destination array.
   * @returns {Vertex[]}
   */
  vertices(result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns the edges that compose this component (for faces) or are
   * incident to it (for vertices), or the edge itself (for edges).
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  edges(result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns the faces incident to this component (for vertices and edges),
   * or the face itself (for faces).
   * @param {Face[]} result Destination array.
   * @returns {Face[]}
   */
  faces(result) {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
