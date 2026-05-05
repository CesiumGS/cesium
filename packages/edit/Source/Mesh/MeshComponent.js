import { DeveloperError } from "@cesium/engine";
/** @import Vertex from "./Vertex"; */

/**
 * Base class for mesh elements owned by an EditableMesh.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshComponent {
  /**
   * Implemented by subclasses to return the vertices that compose this component (for edges and faces, or the vertex itself for vertices).
   */
  vertices() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Implemented by subclasses to return the edges that compose or are incident to this component (for faces and vertices, or the edge itself for edges).
   */
  edges() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Implemented by subclasses to return the faces that are incident to this component (for vertices and edges, or the face itself for faces).
   */
  faces() {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
