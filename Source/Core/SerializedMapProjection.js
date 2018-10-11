define([
        '../ThirdParty/when',
        './Check',
        './CustomProjection',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './freezeObject',
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
        freezeObject,
        GeographicProjection,
        Proj4Projection,
        WebMercatorProjection) {
    'use strict';

    var ProjectionType = freezeObject({
        GEOGRAPHIC : 0,
        WEBMERCATOR : 1,
        PROJ4JS : 2,
        CUSTOM : 3
    });

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

        var projectionType = ProjectionType.GEOGRAPHIC;
        var wellKnownText;
        var heightScale;
        var url;
        var projectionName;
        if (mapProjection instanceof WebMercatorProjection) {
            projectionType = ProjectionType.WEBMERCATOR;
        } else if (mapProjection instanceof Proj4Projection) {
            projectionType = ProjectionType.PROJ4JS;
            wellKnownText = mapProjection.wellKnownText;
            heightScale = mapProjection.heightScale;
        } else if (mapProjection instanceof CustomProjection) {
            projectionType = ProjectionType.CUSTOM;
            url = mapProjection.url;
            projectionName = mapProjection.projectionName;
        }

        this.projectionType = projectionType;
        this.wellKnownText = wellKnownText;
        this.heightScale = heightScale;
        this.url = url;
        this.projectionName = projectionName;

        this.packedEllipsoid = Ellipsoid.pack(mapProjection.ellipsoid, new Array(Ellipsoid.packedLength));
    }

    /**
     * Unpacks the given SerializedMapProjection on a web worker.
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
        var projectionType = serializedMapProjection.projectionType;

        if (projectionType === ProjectionType.GEOGRAPHIC) {
            projection = new GeographicProjection(ellipsoid);
        } else if (projectionType === ProjectionType.WEBMERCATOR) {
            projection = new WebMercatorProjection(ellipsoid);
        } else if (projectionType === ProjectionType.PROJ4JS) {
            projection = new Proj4Projection(serializedMapProjection.wellKnownText, serializedMapProjection.heightScale);
        } else if (projectionType === ProjectionType.CUSTOM) {
            projection = new CustomProjection(serializedMapProjection.url, serializedMapProjection.projectionName, ellipsoid);
            return projection.readyPromise;
        }

        if (defined(projection)) {
            return when.resolve(projection);
        }

        return when.reject(new DeveloperError('unknown projection'));
    };

    return SerializedMapProjection;
});
