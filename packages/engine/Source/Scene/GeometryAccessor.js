// @ts-check

import DeveloperError from "../Core/DeveloperError.js";

/** @import Cartesian3 from "../Core/Cartesian3.js"; */

/**
 * Interface for reading and updating mesh geometry, agnostic of the underlying rendering representation.
 * Must be implemented by render-side geometry classes to be compatible with EditableMesh.
 *
 * @interface
 * @private
 */
class GeometryAccessor {
  /**
   * Begins a geometry read session.
   * Implementations may use this to set up temporary state, lock resources, etc.
   */
  beginRead() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Ends a geometry read session.
   * Implementations may use this to tear down temporary state, unlock resources, etc., set up by {@link GeometryAccessor#beginRead}.
   */
  endRead() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Begins a geometry write session.
   * Implementations may use this to set up temporary state, lock resources, etc., in preparation for geometry updates.
   */
  beginWrite() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Ends a geometry write session.
   * Implementations may use this to tear down temporary state, unlock resources, etc., set up by {@link GeometryAccessor#beginWrite}.
   */
  endWrite() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of faces in the geometry.
   *
   * @returns {number}
   */
  getFaceCount() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of render vertices in a given face.
   *
   * @param {number} faceIndex The face index.
   * @returns {number}
   */
  getFaceVertexCount(faceIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the render vertex index for a face corner.
   * Vertices must be returned in winding order around the face.
   *
   * @param {number} faceIndex The face index.
   * @param {number} vertexIndex The vertex index within the face.
   * @returns {number}
   */
  getFaceVertexIndex(faceIndex, vertexIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the model-space position of a render vertex.
   * Accessors may assume this is only called between beginRead and endRead.
   *
   * @param {number} vertexIndex The render vertex index.
   * @returns {Cartesian3}
   */
  getVertexPosition(vertexIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Updates the model-space position of a render vertex.
   * Accessors may assume this is only called between beginWrite and endWrite.
   *
   * @param {number} vertexIndex The render vertex index.
   * @param {Cartesian3} position The new position for the vertex.
   */
  setVertexPosition(vertexIndex, position) {
    DeveloperError.throwInstantiationError();
  }
}

export default GeometryAccessor;
