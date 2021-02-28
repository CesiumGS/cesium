import Check from "./Check.js";

/**
 * Contains data for transfer to a web worker that can be used to
 * reconstruct a MapProjection.
 *
 * @param {MapProjectionType} mapProjectionType Type of the serialized MapProjection.
 * @param {Object} json JSON containing information about the MapProjection.
 * @alias SerializedMapProjection
 *
 * @see MapProjection.prototype.serialize
 * @see GeographicProjection.prototype.serialize
 * @see WebMercatorProjection.prototype.serialize
 * @see CustomProjection.prototype.serialize
 * @see Proj4Projection.prototype.serialize
 *
 * @constructor
 * @private
 */
function SerializedMapProjection(mapProjectionType, json) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("mapProjectionType", mapProjectionType);
  Check.defined("json", json);
  //>>includeEnd('debug');

  this.mapProjectionType = mapProjectionType;
  this.json = json;
}
export default SerializedMapProjection;
