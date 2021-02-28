import when from "../ThirdParty/when.js";
import Check from "./Check.js";
import CustomProjection from "./CustomProjection.js";
import DeveloperError from "./DeveloperError.js";
import GeographicProjection from "./GeographicProjection.js";
import MapProjectionType from "./MapProjectionType.js";
import Matrix4Projection from "./Matrix4Projection.js";
import Proj4Projection from "./Proj4Projection.js";
import WebMercatorProjection from "./WebMercatorProjection.js";

/**
 * Unpacks the given SerializedMapProjection on a web worker.
 *
 * @param {Object} serializedMapProjection A SerializedMapProjection object.
 * @returns {Promise.<CustomProjection>} A Promise that resolves to a MapProjection, or rejects if the SerializedMapProjection is malformed.
 *
 * @see MapProjection.deserialize
 * @see GeographicProjection.deserialize
 * @see WebMercatorProjection.deserialize
 * @see CustomProjection.deserialize
 * @see Proj4Projection.deserialize
 *
 * @private
 */
function deserializeMapProjection(serializedMapProjection) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("serializedMapProjection", serializedMapProjection);
  //>>includeEnd('debug');

  var mapProjectionType = serializedMapProjection.mapProjectionType;

  if (mapProjectionType === MapProjectionType.GEOGRAPHIC) {
    return GeographicProjection.deserialize(serializedMapProjection);
  } else if (mapProjectionType === MapProjectionType.WEBMERCATOR) {
    return WebMercatorProjection.deserialize(serializedMapProjection);
  } else if (mapProjectionType === MapProjectionType.PROJ4) {
    return Proj4Projection.deserialize(serializedMapProjection);
  } else if (mapProjectionType === MapProjectionType.CUSTOM) {
    return CustomProjection.deserialize(serializedMapProjection);
  } else if (mapProjectionType === MapProjectionType.MATRIX4) {
    return Matrix4Projection.deserialize(serializedMapProjection);
  }

  return when.reject(new DeveloperError("unknown projection"));
}
export default deserializeMapProjection;
