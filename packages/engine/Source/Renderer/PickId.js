// @ts-check

/** @import Color from "../Core/Color.js"; */
/** @import {Destroyable} from "../Core/globalTypes.js"; */

/**
 * Represents a pickable object with a unique integer ID and picking color.
 *
 * @implements {Destroyable}
 * @ignore
 */
class PickId {
  /**
   * @param {Map<number, object>} pickObjects
   * @param {number} key
   * @param {Color} color
   */
  constructor(pickObjects, key, color) {
    this._pickObjects = pickObjects;
    this.key = key;
    this.color = color;
  }

  /** @type {object} */
  get object() {
    return this._pickObjects.get(this.key);
  }

  set object(value) {
    this._pickObjects.set(this.key, value);
  }

  /** @returns {void} */
  destroy() {
    this._pickObjects.delete(this.key);
    return undefined;
  }
}

export default PickId;
