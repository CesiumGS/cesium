// @ts-check

import DeveloperError from "../Core/DeveloperError.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * @typedef {object} GeometryAttributeDescriptor
 * @property {VertexAttributeSemantic} semantic The attribute semantic.
 * @property {number} [setIndex] The attribute set index.
 */

/**
 * @typedef {object} GeometryAccessScope
 * @property {Set<GeometryAttributeDescriptor>} [attributes] The attributes allowed in this access scope.
 * @property {boolean} [topology=false] Whether topology operations are allowed in this access scope.
 */

/**
 * @typedef {object} GeometryAccessScopes
 * @property {GeometryAccessScope} [read] The requested read access.
 * @property {GeometryAccessScope} [write] The requested write access.
 */

/**
 * @callback GeometryAccessSessionCallback
 * @param {GeometryAccessSession} accessSession The active access session.
 */

/**
 * @callback GeometryAttributeReader
 * @param {number} vertexIndex The vertex index to read.
 * @returns {*} The vertex attribute value.
 */

/**
 * @callback GeometryAttributeWriter
 * @param {number} vertexIndex The vertex index to write.
 * @param {*} value The vertex attribute value.
 */

/**
 * @typedef {object} GeometryAttributeAccessors
 * @property {GeometryAttributeReader} [get] Reads a vertex attribute value.
 * @property {GeometryAttributeWriter} [set] Writes a vertex attribute value.
 */

/**
 * @typedef {*} GeometryAccessSessionConstructor
 */

/**
 * @typedef {"getTriangleCount" | "getTriangleVertexIndex" | "setTriangleVertexIndex"} GeometryAccessorFunctionName
 */

/**
 * Factory class that creates sessions for reading and writing mesh vertex attributes and topology.
 * Geometry-owning classes must implement a GeometryAccessSession, and provide it to this class's constructor.
 *
 * The method {@link GeometryAccessor#withSession} creates an instance of the provided access session with methods wired up based on the requested access.
 *
 * Notes:
 *   - Generally speaking, assume creating and closing a session is slow (e.g. copies data from a GPU buffer to the CPU or vice versa)
 *     and should only be used for bulk operations when possible.
 *   - Callbacks are expected to be completed synchronously.
 *   - Nothing prevents a consumer from creating multiple sessions at once. Be careful as doing this may result in overwrites or reading stale data.
 *
 * @example
 * ```
 * const sessionScopes = {
 *  read: {
 *    attributes: new Set([
 *      { semantic: VertexAttributeSemantic.POSITION }
 *    ]),
 *    topology: true,
 *  },
 * };
 *
 * myPrimitive.geometryAccessor.withSession(sessionScopes, (session) => {
 *   const triangleCount = session.getTriangleCount();
 *   const positionAccessors = session.vertexAttributeAccessors({ semantic: VertexAttributeSemantic.POSITION });
 *
 *   for (let i = 0; i < 3 * triangleCount; ++i) {
 *     const position = positionAccessors.get(i);
 *     // Do something with vertex position...
 *   }
 * });
 * ```
 */
class GeometryAccessor {
  /**
   * @param {GeometryAccessSessionConstructor} accessSessionClass The class that implements GeometryAccessSession for this accessor.
   * @param {object} [accessSessionOptions] Options to pass to created GeometryAccessSessions.
   */
  constructor(accessSessionClass, accessSessionOptions) {
    if (!(accessSessionClass.prototype instanceof GeometryAccessSession)) {
      DeveloperError.throwInstantiationError();
    }

    this._geometrySessionClass = accessSessionClass;
    this._accessSessionOptions = accessSessionOptions;
  }

  /**
   * Executes a callback in a context that provides the requested resources.
   * This function gives the implementation the chance to acquire resources and ensure they are released after the callback completes.
   *
   * Note: the scope just helps the implementation figure out the minimum resources it needs to fetch, for performance.
   *
   * @param {GeometryAccessScopes} scopes The requested access scopes for this session.
   * @param {GeometryAccessSessionCallback} callback The callback to run.
   */
  withSession(scopes, callback) {
    const accessSession = new this._geometrySessionClass(
      this,
      scopes,
      this._accessSessionOptions,
    );

    try {
      callback(accessSession);
    } finally {
      accessSession.destroy();
    }
  }
}

/**
 * Session in a GeometryAccessor that (lightly) enforces access to only the operations allowed for the requested scopes.
 * An implementation should define a constructor with any options necessary for resource acquisition.
 * @abstract
 */
class GeometryAccessSession {
  /**
   * Acquires any resources needed for the requested resource scope.
   * Subclasses that override this should call the base implementation to enforce access scope restrictions.
   * @param {GeometryAccessor} accessor The parent accessor for this session.
   * @param {GeometryAccessScopes} scopes The requested resources.
   */
  constructor(accessor, scopes) {
    this._accessor = accessor;
    this._scopes = scopes;
    this._readAttributeKeys = new Set();
    this._writeAttributeKeys = new Set();

    if (scopes.read && scopes.read.attributes) {
      for (const descriptor of scopes.read.attributes) {
        this._readAttributeKeys.add(
          /** @type {any} */ (VertexAttributeSemantic).getVariableName(
            descriptor.semantic,
            descriptor.setIndex,
          ),
        );
      }
    }

    if (scopes.write && scopes.write.attributes) {
      for (const descriptor of scopes.write.attributes) {
        this._writeAttributeKeys.add(
          /** @type {any} */ (VertexAttributeSemantic).getVariableName(
            descriptor.semantic,
            descriptor.setIndex,
          ),
        );
      }
    }

    const canReadTopology = !!(scopes.read && scopes.read.topology);
    const canWriteTopology = !!(scopes.write && scopes.write.topology);

    /** @type {GeometryAccessorFunctionName[]} */
    const readTopologyFunctions = [
      "getTriangleCount",
      "getTriangleVertexIndex",
    ];
    /** @type {GeometryAccessorFunctionName[]} */
    const writeTopologyFunctions = ["setTriangleVertexIndex"];

    if (!canReadTopology) {
      this.#bindErrorFunctions(readTopologyFunctions);
    }

    if (!canWriteTopology) {
      this.#bindErrorFunctions(writeTopologyFunctions);
    }
  }

  /**
   * Releases any resources acquired for the current resource scope.
   */
  destroy() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Commit changes to underlying geometry without ending the session.
   */
  commit() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Creates a function for reading from a vertex attribute defined by a vertex attribute descriptor (semantic and set index).
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeReader}
   * @protected
   */
  _createVertexAttributeReader(descriptor) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Creates a function for writing to a vertex attribute defined by a vertex attribute descriptor (semantic and set index).
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeWriter}
   * @protected
   */
  _createVertexAttributeWriter(descriptor) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Get accessors for a vertex attribute defined by a vertex attribute descriptor (semantic and set index).
   * If the requested attribute is not included in the session scopes, the accessors log a warning when called.
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeAccessors}
   *
   * @example
   * const positionAccess = session.vertexAttributeAccessors({ semantic: VertexAttributeSemantic.POSITION });
   * const position = positionAccess.get(0); // Get position of first vertex
   * position[0] += 1.0; // Move vertex 1 unit in x direction
   * positionAccess.set(0, position); // Write updated position back to geometry
   */
  vertexAttributeAccessors(descriptor) {
    const descriptorVariableName = /** @type {any} */ (
      VertexAttributeSemantic
    ).getVariableName(descriptor.semantic, descriptor.setIndex);

    /** @type {GeometryAttributeAccessors} */
    const accessors = {
      get: (vertexIndex) =>
        oneTimeWarning(
          descriptorVariableName,
          `Attempting to read vertex attribute ${descriptor.semantic} (set ${descriptor.setIndex}) without proper access scope.`,
        ),
      set: (vertexIndex, value) =>
        oneTimeWarning(
          descriptorVariableName,
          `Attempting to write vertex attribute ${descriptor.semantic} (set ${descriptor.setIndex}) without proper access scope.`,
        ),
    };

    if (this._readAttributeKeys.has(descriptorVariableName)) {
      accessors.get = this._createVertexAttributeReader(descriptor);
    }

    if (this._writeAttributeKeys.has(descriptorVariableName)) {
      accessors.set = this._createVertexAttributeWriter(descriptor);
    }

    return accessors;
  }

  /**
   * Gets the number of vertices in the geometry.
   *
   * @returns {number} Vertex count of geometry.
   */
  vertexCount() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Adds a new vertex to the geometry and returns its index.
   *
   * @returns {number} The index of the new vertex.
   */
  addVertex() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Removes a vertex from the geometry.
   *
   * @param {number} vertexIndex The index of the vertex to remove.
   */
  removeVertex(vertexIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of vertices per primitive (e.g. 3 for triangles).
   *
   * @returns {number} The number of vertices per primitive.
   */
  primitiveVertexCount() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the number of primitives in the geometry.
   *
   * @returns {number} Primitive count of geometry.
   */
  primitiveCount() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the vertex indices of the vertices that compose a given primitive.
   * Note: for non-indexed primitives, the primitive index and vertex index are the same and this function should return the primitiveIndex.
   *
   * @param {number} primitiveIndex
   * @param {number[]} results Array of the primitive's vertex indices
   *
   * @returns {number[]} The vertex indices for the primitive at the provided index.
   */
  getPrimitive(primitiveIndex, results) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Sets the vertex indices of the vertices that compose a given primitive.
   * Note: for non-indexed primitives, this function should be a no-op.
   *
   * @param {number} primitiveIndex
   * @param {number[]} vertexIndices
   */
  setPrimitive(primitiveIndex, vertexIndices) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Adds a new primitive to the geometry with the provided vertex indices.
   *
   * @param {number[]} vertexIndices The vertex indices that compose the new primitive.
   */
  addPrimitive(vertexIndices) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Removes a primitive from the geometry.
   * @param {number} primitiveIndex The index of the primitive to remove.
   */
  removePrimitive(primitiveIndex) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @param {GeometryAccessorFunctionName[]} functionNames
   */
  #bindErrorFunctions(functionNames) {
    const session = /** @type {any} */ (this);
    for (let i = 0; i < functionNames.length; ++i) {
      const functionName = functionNames[i];
      session[functionName] = createAccessErrorFunction(functionName);
    }
  }
}

/**
 * @param {string} methodName The method name.
 * @returns {Function}
 */
function createAccessErrorFunction(methodName) {
  return function () {
    throw new DeveloperError(
      `${methodName} is not available for the provided access scopes.`,
    );
  };
}

export default GeometryAccessor;
export { GeometryAccessSession };
