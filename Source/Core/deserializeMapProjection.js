define([
    '../ThirdParty/when',
    './Check',
    './CustomProjection',
    './DeveloperError',
    './GeographicProjection',
    './MapProjectionType',
    './Proj4Projection',
    './WebMercatorProjection'
], function(
    when,
    Check,
    CustomProjection,
    DeveloperError,
    GeographicProjection,
    MapProjectionType,
    Proj4Projection,
    WebMercatorProjection) {
    'use strict';

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
        Check.defined('serializedMapProjection', serializedMapProjection);
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
        }

        return when.reject(new DeveloperError('unknown projection'));
    }

    return deserializeMapProjection;
});
