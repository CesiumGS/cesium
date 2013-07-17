/*global define*/
define([
        './freezeObject',
        './defaultValue',
        './DeveloperError',
        './Ellipsoid',
        './Math',
        './Cartesian3',
        './Cartographic'
       ], function(
         freezeObject,
         defaultValue,
         DeveloperError,
         Ellipsoid,
         CesiumMath,
         Cartesian3,
         Cartographic) {
    "use strict";
    var a;
    var b;
    var f;
    var cosineHeading1;
    var sineHeading1;
    var tanU1;
    var cosineU1;
    var sineU1;
    var sigma1;
    var sineAlpha;
    var sineSquaredAlpha;
    var cosineSquaredAlpha;
    var cosineAlpha;
    var u2Over4;
    var u4Over16;
    var u6Over64;
    var u8Over256;
    var a0;
    var a1;
    var a2;
    var a3;
    var distanceRatio;
    function setConstants(ellipsoidGeodesic) {
        var uSquared= ellipsoidGeodesic._uSquared;
        a = ellipsoidGeodesic._ellipsoid.getMaximumRadius();
        b = ellipsoidGeodesic._ellipsoid.getMinimumRadius();
        f = (a - b) / a;

        cosineHeading1 = Math.cos(ellipsoidGeodesic._startHeading);
        sineHeading1 = Math.sin(ellipsoidGeodesic._startHeading);

        tanU1 = (1 - f) * Math.tan(ellipsoidGeodesic._start.latitude);

        cosineU1 = 1.0 / Math.sqrt(1.0 + tanU1 * tanU1);
        sineU1 = cosineU1 * tanU1;

        sigma1 = Math.atan2(tanU1, cosineHeading1);

        sineAlpha = cosineU1 * sineHeading1;
        sineSquaredAlpha = sineAlpha * sineAlpha;

        cosineSquaredAlpha = 1.0 - sineSquaredAlpha;
        cosineAlpha = Math.sqrt(cosineSquaredAlpha);

        u2Over4 = uSquared / 4.0;
        u4Over16 = u2Over4 * u2Over4;
        u6Over64 = u4Over16 * u2Over4;
        u8Over256 = u4Over16 * u4Over16;

        a0 = (1.0 + u2Over4 - 3.0 * u4Over16 / 4.0 + 5.0 * u6Over64 / 4.0 - 175.0 * u8Over256 / 64.0);
        a1 = (1.0 - u2Over4 + 15.0 * u4Over16 / 8.0 - 35.0 * u6Over64 / 8.0);
        a2 = (1.0 - 3.0 * u2Over4 + 35.0 * u4Over16 / 4.0);
        a3 = (1.0 - 5.0 * u2Over4);

        distanceRatio =  a0 * sigma1 - a1 * Math.sin(2.0 * sigma1) * u2Over4 / 2.0 - a2 * Math.sin(4.0 * sigma1) * u4Over16 / 16.0 -
            a3 * Math.sin(6.0 * sigma1) * u6Over64 / 48.0 - Math.sin(8.0 * sigma1) * 5.0 * u8Over256 / 512;
    }

    function computeC(f, cosineSquaredAlpha) {
        return f * cosineSquaredAlpha * (4.0 + f * (4.0 - 3.0 * cosineSquaredAlpha)) / 16.0;
    }

    function computeDeltaLambda(f, sineAlpha, cosineSquaredAlpha, sigma, sineSigma, cosineSigma, cosineTwiceSigmaMidpoint) {
        var C = computeC(f, cosineSquaredAlpha);

        return (1.0 - C) * f * sineAlpha * (sigma + C * sineSigma * (cosineTwiceSigmaMidpoint +
                C * cosineSigma * (2.0 * cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint - 1.0)));
    }

    var scratchCart1 = new Cartesian3();
    var scratchCart2 = new Cartesian3();
    var EllipsoidGeodesic = function(start, end, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        if (typeof start === 'undefined') {
            throw new DeveloperError('first cartographic position is required');
        }
        if (typeof end === 'undefined') {
            throw new DeveloperError('last cartgraphic position is required');
        }

        var firstCartesian = ellipsoid.cartographicToCartesian(start, scratchCart2).normalize(scratchCart1);
        var lastCartesian = ellipsoid.cartographicToCartesian(end, scratchCart2).normalize(scratchCart2);

        if (Math.abs(Math.abs(firstCartesian.angleBetween(lastCartesian)) - Math.PI) < 0.0125) {
            throw new DeveloperError('geodesic position is not unique');
        }

        var r = vincentyInverseFormula(ellipsoid.getMaximumRadius(), ellipsoid.getMinimumRadius(), start.longitude, start.latitude, end.longitude, end.latitude);

        start.height = 0;
        end.height = 0;
        this._ellipsoid = ellipsoid;
        this._start = start.clone();
        this._startHeading = r.startHeading;
        this._end = end.clone();
        this._endHeading = r.endHeading;
        this._distance = r.distance;
        this._uSquared = r.uSquared;

        setConstants(this);
    };

    EllipsoidGeodesic.prototype.getSurfaceDistance = function() {
        return this._distance;
    };

    EllipsoidGeodesic.prototype.getStart = function() {
        return this._start;
    };

    EllipsoidGeodesic.prototype.getEnd = function() {
        return this._end;
    };

    EllipsoidGeodesic.prototype.getStartHeading = function() {
        return this._startHeading;
    };

    EllipsoidGeodesic.prototype.getEndHeading = function() {
        return this._endHeading;
    };


    EllipsoidGeodesic.prototype.interpolateUsingSurfaceDistance = function(distance) {
        var s = distanceRatio + distance / b;

        var cosine2S = Math.cos(2.0 * s);
        var cosine4S = Math.cos(4.0 * s);
        var cosine6S = Math.cos(6.0 * s);
        var sine2S = Math.sin(2.0 * s);
        var sine4S = Math.sin(4.0 * s);
        var sine6S = Math.sin(6.0 * s);
        var sine8S = Math.sin(8.0 * s);

        var s2 = s * s;
        var s3 = s * s2;

        var sigma = 2.0 * s3 * u8Over256 * cosine2S / 3.0 +
            s * (1.0 - u2Over4 + 7.0 * u4Over16 / 4.0 - 15.0 * u6Over64 / 4.0 + 579.0 * u8Over256 / 64.0 -
            (u4Over16 - 15.0 * u6Over64 / 4.0 + 187.0 * u8Over256 / 16.0) * cosine2S -
            (5.0 * u6Over64 / 4.0 - 115.0 * u8Over256 / 16.0) * cosine4S -
            29.0 * u8Over256 * cosine6S / 16.0) +
            (u2Over4 / 2.0 - u4Over16 + 71.0 * u6Over64 / 32.0 - 85.0 * u8Over256 / 16.0) * sine2S +
            (5.0 * u4Over16 / 16.0 - 5.0 * u6Over64 / 4.0 + 383.0 * u8Over256 / 96.0) * sine4S -
            s2 * ((u6Over64 - 11.0 * u8Over256 / 2.0) * sine2S + 5.0 * u8Over256 * sine4S / 2.0) +
            (29.0 * u6Over64 / 96.0 - 29.0 * u8Over256 / 16.0) * sine6S +
            539.0 * u8Over256 * sine8S / 1536.0;

        var theta = Math.asin(Math.sin(sigma) * cosineAlpha);
        var latitude = Math.atan(a / b * Math.tan(theta));

        // Redefine in terms of relative argument of latitude.
        sigma = sigma - sigma1;

        var cosineTwiceSigmaMidpoint = Math.cos(2.0 * sigma1 + sigma);

        var sineSigma = Math.sin(sigma);
        var cosineSigma = Math.cos(sigma);

        var cc = cosineU1 * cosineSigma;
        var ss = sineU1 * sineSigma;

        var lambda = Math.atan2(sineSigma * sineHeading1, cc - ss * cosineHeading1);

        var l = lambda - computeDeltaLambda(f, sineAlpha, cosineSquaredAlpha,
            sigma, sineSigma, cosineSigma, cosineTwiceSigmaMidpoint);

        return new Cartographic(this._start.longitude + l, latitude, 0.0);
    };

    function vincentyInverseFormula(major, minor, firstLongitude, firstLatitude, secondLongitude, secondLatitude) {
        var eff = (major - minor) / major;
        var l = secondLongitude - firstLongitude;

        var u1 = Math.atan((1 - eff) * Math.tan(firstLatitude));
        var u2 = Math.atan((1 - eff) * Math.tan(secondLatitude));

        var cosineU1 = Math.cos(u1);
        var sineU1 = Math.sin(u1);
        var cosineU2 = Math.cos(u2);
        var sineU2 = Math.sin(u2);

        var cc = cosineU1 * cosineU2;
        var cs = cosineU1 * sineU2;
        var ss = sineU1 * sineU2;
        var sc = sineU1 * cosineU2;

        var lambda = l;
        var lambdaDot = CesiumMath.TWO_PI;

        var cosineLambda = Math.cos(lambda);
        var sineLambda = Math.sin(lambda);

        var sigma;
        var cosineSigma;
        var sineSigma;
        var cosineSquaredAlpha;
        var cosineTwiceSigmaMidpoint;

        do {
            cosineLambda = Math.cos(lambda);
            sineLambda = Math.sin(lambda);

            var temp = cs - sc * cosineLambda;
            sineSigma = Math.sqrt(cosineU2 * cosineU2 * sineLambda * sineLambda + temp * temp);
            cosineSigma = ss + cc * cosineLambda;

            sigma = Math.atan2(sineSigma, cosineSigma);

            var sineAlpha;

            if (sineSigma === 0.0) {
                sineAlpha = 0.0;
                cosineSquaredAlpha = 1.0;
            } else {
                sineAlpha = cc * sineLambda / sineSigma;
                cosineSquaredAlpha = 1.0 - sineAlpha * sineAlpha;
            }

            lambdaDot = lambda;

            cosineTwiceSigmaMidpoint = cosineSigma - 2.0 * ss / cosineSquaredAlpha;

            if (isNaN(cosineTwiceSigmaMidpoint)) {
                cosineTwiceSigmaMidpoint = 0.0;
            }

            lambda = l + computeDeltaLambda(eff, sineAlpha, cosineSquaredAlpha,
                sigma, sineSigma, cosineSigma, cosineTwiceSigmaMidpoint);
        } while (Math.abs(lambda - lambdaDot) > CesiumMath.EPSILON12);

        var uSquared = cosineSquaredAlpha * (major * major - minor * minor) / (minor * minor);
        var A = 1.0 + uSquared * (4096.0 + uSquared * (uSquared * (320.0 - 175.0 * uSquared) - 768.0)) / 16384.0;
        var B = uSquared * (256.0 + uSquared * (uSquared * (74.0 - 47.0 * uSquared) - 128.0)) / 1024.0;

        var cosineSquaredTwiceSigmaMidpoint = cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint;
        var deltaSigma =  B * sineSigma * (cosineTwiceSigmaMidpoint + B * (cosineSigma *
                (2.0 * cosineSquaredTwiceSigmaMidpoint - 1.0) - B * cosineTwiceSigmaMidpoint *
                (4.0 * sineSigma * sineSigma - 3.0) * (4.0 * cosineSquaredTwiceSigmaMidpoint - 3.0) / 6.0) / 4.0);

        var distance = minor * A * (sigma - deltaSigma);

        var startHeading = Math.atan2(cosineU2 * sineLambda, cs - sc * cosineLambda);
        var endHeading = Math.atan2(cosineU1 * sineLambda, cs * cosineLambda - sc);

        return {
            distance: distance,
            startHeading: startHeading,
            endHeading: endHeading,
            uSquared: uSquared
        };
    }

    return EllipsoidGeodesic;

});