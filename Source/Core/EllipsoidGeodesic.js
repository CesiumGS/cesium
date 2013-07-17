/*global define*/
define([
        './freezeObject',
        './defaultValue',
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Cartographic'
       ], function(
         freezeObject,
         defaultValue,
         DeveloperError,
         CesiumMath,
         Cartesian3,
         Cartographic) {
    "use strict";
    var a;
    var b;
    var f;
    var cosHeading1;
    var sinHeading1;
    var tanU1;
    var cosU1;
    var sigma1;
    var sinAlpha;
    var sinLambda1;
    var cosLambda1;
    var lambda1;
    var mu;
    var mu2;
    var e2;
    var e4;
    var e6;
    var twoMinusMu;
    var j0;
    var j2;
    var j4;
    var j6;
    var deltaLongitudeAtLatitudeExtremum;
    var deltaLongitude1;
    var longitudeAtEquatorCrossing;
    function initializeConstants(ellipsoidGeodesic) {
        a = ellipsoidGeodesic._ellipsoid.getMaximumRadius();
        b = ellipsoidGeodesic._ellipsoid.getMinimumRadius();

        f = (a - b) / a;

        cosHeading1 = Math.Cos(ellipsoidGeodesic._initialHeading);
        sinHeading1 = Math.Sin(ellipsoidGeodesic._initialHeading);

        tanU1 = (1 - f) * Math.Tan(ellipsoidGeodesic._start.Latitude);
        cosU1 = 1.0 / Math.Sqrt(1.0 + tanU1 * tanU1);

        sigma1 = Math.Atan2(tanU1, cosHeading1);

        sinAlpha = cosU1 * sinHeading1;

        sinLambda1 = sinHeading1 * Math.sin(sigma1);
        cosLambda1 = Math.Sign(cosHeading1) * Math.Sqrt(1.0 - sinLambda1 * sinLambda1);

        lambda1 = Math.Atan2(sinLambda1, cosLambda1);

        mu = 1.0 - sinAlpha * sinAlpha;
        mu2 = mu * mu;
        e2 = 1.0 - b * b / (a * a);
        e4 = e2 * e2;
        e6 = e2 * e4;

        twoMinusMu = 2.0 - mu;

        j0 = (1.0 + e2 * twoMinusMu / 8.0 + e4 * (8.0 - 8.0 * mu + 3.0 * mu2) / 64.0 +
              5.0 * e6 * (16.0 - 24.0 * mu + 18.0 * mu2 - 5.0 * mu2 * mu) / 1024.0) / 2.0;
        j2 = mu * (1.0 + e2 * twoMinusMu / 2.0 + 15.0 * e4 * (16.0 - 16.0 * mu + 5.0 * mu2) / 256.0) / 32.0;
        j4 = mu2 * (1.0 + 15.0 * e2 * twoMinusMu / 16.0) / 512.0;
        j6 = 5.0 * mu * mu2 / 24576.0;

        // This could be positively or negatively valued depending on which extremum is desired.
        deltaLongitudeAtLatitudeExtremum = CesiumMath.PI_OVER_TWO * (1.0 - e2 * sinAlpha * j0);

        deltaLongitude1 = lambda1 - e2 * sinAlpha * (j0 * sigma1 + e2 * j2 * Math.sin(2.0 * sigma1) +
                          e4 * j4 * Math.sin(4.0 * sigma1) + e6 * j6 * Math.sin(6.0 * sigma1));

        longitudeAtEquatorCrossing = CesiumMath.NegativePiToPi(ellipsoidGeodesic._start.longitude - deltaLongitude1);
    }

    var scratchCart1 = new Cartesian3();
    var scratchCart2 = new Cartesian3();
    var EllipsoidGeodesic = function(ellipsoid, start, end) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required');
        }
        if (typeof start === 'undefined') {
            throw new DeveloperError('first cartographic position is required');
        }
        if (typeof end === 'undefined') {
            throw new DeveloperError('last cartgraphic position is required');
        }

        var distance;
        var initialHeading;
        var finalheading;
        var uSquared;

        var firstCartesian = ellipsoid.cartographicToCartesian(start, scratchCart2).normalize(scratchCart1);
        var lastCartesian = ellipsoid.cartographicToCartesian(end, scratchCart2).normalize(scratchCart2);

        if (Math.abs(Math.abs(firstCartesian.angleBetween(lastCartesian)) - Math.PI) < 0.0125) {
            throw new DevelopError('geodesic position is not unique');
        }

        var r = vincentyInverseFormula(ellipsoid.getMaximumRadius, ellipsoid.getMinimumRadius, start.longitude, start.latitude, end.longitude, end.latitude);

        start.height = 0;
        end.height = 0;
        this._ellipsoid = ellipsoid;
        this._start = start;
        this._startHeading = r.startHeading;
        this._end = end;
        this._endHeading = r.endHeading;
        this._distance = r.distance;
        this._uSquared = r.uSquared;

        initializeConstants(this);




    };

    return EllipsoidGeodesic;

});