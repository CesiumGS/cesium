// @ts-check

import DeveloperError from "../Core/DeveloperError.js";

/** @import Cartesian3 from "../Core/Cartesian3.js"; */

/**
 * Abstract class for reading and writing mesh geometry, agnostic of the underlying rendering representation.
 * Must be implemented by render-side geometry classes to be compatible with EditableMesh.
 *
 * Callers must access geometry through {@link GeometryAccessor#withReadAccess}
 * or {@link GeometryAccessor#withWriteAccess}. These methods allow the
 * implementation to create short-lived reader and writer objects that own any
 * staged resources required for the duration of the callback.
 *
 * Generally speaking, assume acquiring read or write access is slow and should only be called sparingly (i.e. not for each element read / written).
 * Callbacks are expected to complete synchronously.
 *
 * Enforcing whether nested contexts are allowed is up to the implementation.
 *
 * @abstract
 * @private
 */
class GeometryAccessor {
  /**
   * Executes a function in a context that provides geometry read access.
   *
   * @template T
   * @param {(reader: GeometryReader) => T} callback The callback to run.
   * @returns {T} The callback result.
   */
  withReadAccess(callback) {
    const reader = this._createReader();
    try {
      return callback(reader);
    } finally {
      reader.destroy();
    }
  }

  /**
   * Executes a function in a context that provides geometry write access.
   *
   * @template T
   * @param {(writer: GeometryWriter) => T} callback The callback to run.
   * @returns {T} The callback result.
   */
  withWriteAccess(callback) {
    const writer = this._createWriter();
    try {
      return callback(writer);
    } finally {
      writer.destroy();
    }
  }

  /**
   * Creates a reader for a geometry read session.
   * Implementations may use this to stage data, allocate temporary state, and
   * acquire any resources needed by the returned reader.
   *
   * @protected
   * @returns {GeometryReader}
   */
  _createReader() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Creates a writer for a geometry write session.
   * Implementations may use this to stage mutable data, allocate temporary
   * state, and acquire any resources needed by the returned writer.
   *
   * @protected
   * @returns {GeometryWriter}
   */
  _createWriter() {
    DeveloperError.throwInstantiationError();
  }
}

/**
 * Abstract base class for a scoped geometry read session.
 * Implementations own any resources required to read geometry and must release
 * them when {@link GeometryReader#destroy} is called.
 *
 * @abstract
 * @private
 */
class GeometryReader {
  /**
   * Releases resources acquired for this read session.
   */
  destroy() {
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
   *
   * @param {number} vertexIndex The render vertex index.
   * @returns {Cartesian3}
   */
  getVertexPosition(vertexIndex) {
    DeveloperError.throwInstantiationError();
  }
}

/**
 * Abstract base class for a scoped geometry write session.
 * A writer also supports all read operations exposed by
 * {@link GeometryReader}.
 *
 * @abstract
 * @private
 */
class GeometryWriter extends GeometryReader {
  /**
   * Updates the model-space position of a render vertex.
   *
   * @param {number} vertexIndex The render vertex index.
   * @param {Cartesian3} position The new position for the vertex.
   */
  setVertexPosition(vertexIndex, position) {
    DeveloperError.throwInstantiationError();
  }
}

export { GeometryReader, GeometryWriter };
export default GeometryAccessor;
