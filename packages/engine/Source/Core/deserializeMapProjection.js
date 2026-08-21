// @ts-check

import CustomProjection from "./CustomProjection.js";
import DeveloperError from "./DeveloperError.js";
import GeographicProjection from "./GeographicProjection.js";
import MapProjectionType from "./MapProjectionType.js";
import Matrix4Projection from "./Matrix4Projection.js";
import Proj4Projection from "./Proj4Projection.js";
import WebMercatorProjection from "./WebMercatorProjection.js";

/** @import MapProjection from "./MapProjection.js"; */
/** @import {SerializedMapProjection} from "./SerializedMapProjection.js"; */

/**
 * Reconstructs a {@link MapProjection} from a {@link SerializedMapProjection}.
 *
 * @param {SerializedMapProjection} serializedMapProjection The serialized projection.
 * @returns {MapProjection} The deserialized projection.
 *
 * @private
 */
function deserializeMapProjection(serializedMapProjection) {
  const type = serializedMapProjection.mapProjectionType;
  const json = serializedMapProjection.json;

  switch (type) {
    case MapProjectionType.GEOGRAPHIC:
      return GeographicProjection.deserialize(json);
    case MapProjectionType.WEBMERCATOR:
      return WebMercatorProjection.deserialize(json);
    case MapProjectionType.PROJ4:
      return Proj4Projection.deserialize(json);
    case MapProjectionType.CUSTOM:
      return CustomProjection.deserialize(json);
    case MapProjectionType.MATRIX4:
      return Matrix4Projection.deserialize(json);
    default:
      throw new DeveloperError(`Unknown map projection type: ${type}`);
  }
}

export default deserializeMapProjection;
