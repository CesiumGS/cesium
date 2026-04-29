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
   * Get the vertices that compose this component. For a Vertex, this is just the vertex itself. For an Edge, this is the two vertices at its endpoints. For a Face, this is all vertices that make up the face.
   * @returns {Vertex[]}
   */
  vertices() {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
