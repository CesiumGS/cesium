// @ts-check

/**
 * A JSON-serializable representation of a {@link MapProjection} for
 * transfer to web workers.
 *
 * @typedef {object} SerializedMapProjection
 * @property {number} mapProjectionType A {@link MapProjectionType} value.
 * @property {object} json Projection-specific serialized data.
 */

/**
 * @param {number} mapProjectionType
 * @param {object} json
 * @returns {SerializedMapProjection}
 */
function createSerializedMapProjection(mapProjectionType, json) {
  return {
    mapProjectionType: mapProjectionType,
    json: json,
  };
}

export default createSerializedMapProjection;
