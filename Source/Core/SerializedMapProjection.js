define([
        '../ThirdParty/when',
        './Check',
        './CustomProjection',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Proj4Projection',
        './WebMercatorProjection'
    ], function(
        when,
        Check,
        CustomProjection,
        defined,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Proj4Projection,
        WebMercatorProjection) {
    'use strict';

    /**
     * Serializes and Deserializes MapProjections.
     *
     * @param {MapProjection} mapProjection Any MapProjection supported by Cesium.
     * @alias SerializedMapProjection
     * @constructor
     * @private
     */
    function SerializedMapProjection(mapProjection) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('mapProjection', mapProjection);
        //>>includeEnd('debug');

        this.isMercator = mapProjection instanceof WebMercatorProjection;
        this.isGeographic = mapProjection instanceof GeographicProjection;
        this.wellKnownText = mapProjection.wellKnownText;
        this.url = mapProjection.url;
        this.functionName = mapProjection.functionName;

        this.packedEllipsoid = Ellipsoid.pack(mapProjection.ellipsoid, new Array(Ellipsoid.packedLength));
    }

    /**
     * Unpacks the given SerializedMapProjection.
     *
     * @param {Object} serializedMapProjection A SerializedMapProjection object.
     * @returns {Promise.<CustomProjection>} A Promise that resolves to a MapProjection, or rejects if the SerializedMapProjection is malformed.
     */
    SerializedMapProjection.deserialize = function(serializedMapProjection) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('serializedMapProjection', serializedMapProjection);
        //>>includeEnd('debug');

        var ellipsoid = Ellipsoid.unpack(serializedMapProjection.packedEllipsoid);
        var projection;

        if (defined(serializedMapProjection.url) && defined(serializedMapProjection.url)) {
            projection = new CustomProjection(serializedMapProjection.url, serializedMapProjection.functionName, ellipsoid);
            return projection.readyPromise;
        }

        if (serializedMapProjection.isMercator) {
            projection = new WebMercatorProjection(ellipsoid);
        }
        if (serializedMapProjection.isGeographic) {
            projection = new GeographicProjection(ellipsoid);
        }
        if (defined(serializedMapProjection.wellKnownText)) {
            projection = new Proj4Projection(serializedMapProjection.wellKnownText);
        }
        if (defined(projection)) {
            return when.resolve(projection);
        }

        return when.reject(new DeveloperError('unknown projection'));
    };

    return SerializedMapProjection;
});
