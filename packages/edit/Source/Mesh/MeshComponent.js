import { defined, DeveloperError } from "@cesium/engine";

/**
 * Base class for mesh elements owned by an EditableMesh.
 *
 * @abstract
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
    return [];
  }

  /**
   * Returns the components one level above this one that this is
   * incident to: the incident edges of a vertex, the incident faces of
   * an edge, or nothing for a face.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  upper(result) {
    return [];
  }

  /**
   * Associates blind data with this component under the given key.
   * @param {string} key
   * @param {*} value
   */
  setUserData(key, value) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof key !== "string") {
      throw new DeveloperError("key must be a string.");
    }
    //>>includeEnd('debug');

    // Lazily allocate so components that never carry user data pay nothing.
    if (!defined(this._userData)) {
      this._userData = new Map();
    }
    this._userData.set(key, value);
  }

  /**
   * Returns the value previously stored under the given key, or undefined.
   * @param {string} key
   * @returns {*}
   */
  getUserData(key) {
    if (!defined(this._userData)) {
      return undefined;
    }
    return this._userData.get(key);
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  hasUserData(key) {
    return defined(this._userData) && this._userData.has(key);
  }

  /**
   * Removes the value stored under the given key.
   * @param {string} key
   * @returns {boolean} True if a value was removed.
   */
  deleteUserData(key) {
    if (!defined(this._userData)) {
      return false;
    }
    return this._userData.delete(key);
  }
}

export default MeshComponent;
