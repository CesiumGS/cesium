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
   * Returns the components that this one is composed of.
   * For a vertex, this is empty. For an edge, this is its two endpoint vertices. For a face, this is the edge loop that composes its boundary.
   * @returns {MeshComponent[]}
   */
  lower() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns the components that this one participates in.
   * For a vertex, this is the edges that are incident to it. For an edge, this is the faces that are incident to it. For a face, this is empty.
   * @returns {MeshComponent[]}
   */
  upper() {
    DeveloperError.throwInstantiationError();
  }
}

export default MeshComponent;
