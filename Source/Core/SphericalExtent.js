/*global define*/
define([
        './Cartesian2',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Math'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath) {
    "use strict";

    var SphericalExtent = function() {
        this.minimumLatitude = undefined;
        this.minimumLongitude = undefined;
        this.latitudeExtent = undefined;
        this.longitudeExtent = undefined;
    };

    function longitude(extent, v0, v1) {
        var lessThan180Degs = extent.lessThan180Degs;
        var eastNormal = extent.eastNormal;
        var westNormal = extent.westNormal;
        var east = extent.east;
        var west = extent.west;

        //
        // Longitude
        //
        // If the point is inside the extent, do nothing
        //
        var tempVec = Cartesian2.clone(v1);
        var dotEast = Cartesian2.dot(eastNormal, tempVec);
        var dotWest = Cartesian2.dot(westNormal, tempVec);
        if (lessThan180Degs)
        {
            if (dotEast >= -CesiumMath.EPSILON5 && dotWest >= -CesiumMath.EPSILON5)
            {
                return false;
            }
        }
        else if (!(dotEast < CesiumMath.EPSILON5 && dotWest < CesiumMath.EPSILON5))
        {
            return false;
        }

        //
        // Determine if the line is going more east or more west and assign
        // the approriate east or west vector
        //
        var eastDir = Cartesian2.fromElements(-v0.y, v0.x);
        Cartesian2.normalize(eastDir, eastDir);
        var diff = Cartesian2.subtract(v1, v0, new Cartesian2());
        var dot = Cartesian2.dot(eastDir, diff);
        if (-CesiumMath.EPSILON5 <= dot && dot <= CesiumMath.EPSILON5)
        {
            //
            // It is not obvious if the line is more east or west, so ignore this line
            //
            extent.previousVertexProcessed = false;
            return true;
        }
        if (dot > CesiumMath.EPSILON5)
        {
            Cartesian2.clone(v1, east);
            Cartesian2.normalize(east, east);
            Cartesian2.fromElements(east.y, -east.x, eastNormal);
        }
        else // if (dot < -CesiumMath.EPSILON5)
        {
            Cartesian2.clone(v1, west);
            Cartesian2.normalize(west, west);
            Cartesian2.fromElements(-west.y, west.x, westNormal);
        }

        //
        // Determine if the extents are less than or equal to 180 degs
        //
        var crossZ = (east.x * west.y) - (east.y * west.x);
        if (!(-CesiumMath.EPSILON5 < crossZ && crossZ < CesiumMath.EPSILON5))
        {
            extent.lessThanEqual180Degs = crossZ < 0.0;
        }
        else
        {
            Cartesian2.fromElements(-east.y, east.x, eastDir);
            diff = Cartesian2.subtract(west, east, diff);
            extent.lessThanEqual180Degs = Cartesian2.dot(eastDir, diff) < 0.0;
        }
        return true;
    }

    function initialize(extent, v0, v1) {
        //
        // This code expects v0 and v1 to be connected
        //
        // Latitude
        //
        var zOverXY = v0.z >= 0.0 ? 1.0 : -1.0;
        var xYMagSquared = Cartesian2.magnitudeSquared(v0);
        if (xYMagSquared !== 0.0)
        {
            zOverXY *= (v0.z * v0.z) / xYMagSquared;
        }
        else
        {
            zOverXY *= Number.MAX_VALUE;
        }
        extent.minZOverXY = zOverXY;
        extent.maxZOverXY = zOverXY;
        zOverXY = v1.z >= 0.0 ? 1.0 : -1.0;
        xYMagSquared = Cartesian2.magnitudeSquared(v1);
        if (xYMagSquared !== 0.0)
        {
            zOverXY *= (v1.z * v1.z) / xYMagSquared;
        }
        else
        {
            zOverXY *= Number.MAX_VALUE;
        }
        if (zOverXY < extent.minZOverXY)
        {
            extent.minZOverXY = zOverXY;
        }
        else if (zOverXY > extent.maxZOverXY)
        {
            extent.maxZOverXY = zOverXY;
        }

        var east = extent.east;
        var west = extent.west;

        var eastNormal = extent.eastNormal;
        var westNormal = extent.westNormal;

        //
        // Longitude
        //
        // Determine if the line is going more east or more west and assign
        // the default east and west vectors; it does not matter if the dot
        // product is zero
        //
        var eastDir = Cartesian2.fromElements(-v0.y, v0.x);
        Cartesian2.normalize(eastDir, eastDir);
        var diff = Cartesian2.subtract(v1, v0, new Cartesian2());
        if (Cartesian2.dot(eastDir, diff) > 0.0)
        {
            Cartesian2.clone(v1, east);
            Cartesian2.clone(v0, west);
        }
        else
        {
            Cartesian2.clone(v0, east);
            Cartesian2.clone(v1, west);
        }
        Cartesian2.normalize(east, east);
        Cartesian2.normalize(west, west);
        Cartesian2.fromElements(east.y, -east.x, eastNormal);
        Cartesian2.fromElements(-west.y, west.x, westNormal);

        //
        // The first points cannot be separate by more that 180 degs
        //
        extent.lessThanEqual180Degs = true;
        extent.previousVertexProcessed = true;
    }

    function expand(extent, v0, v1) {
        //
        // This code expects v0 and v1 to be connected
        //
        // Latitude
        //
        var zOverXY = v1.z >= 0.0 ? 1.0 : -1.0;
        var xYMagSquared = Cartesian2.magnitudeSquared(v1);
        if (xYMagSquared !== 0.0)
        {
            zOverXY *= (v1.z * v1.z) / xYMagSquared;
        }
        else
        {
            zOverXY *= Number.MAX_VALUE;
        }
        if (zOverXY < extent._minZOverXY)
        {
            extent._minZOverXY = zOverXY;
        }
        else if (zOverXY > extent._maxZOverXY)
        {
            extent._maxZOverXY = zOverXY;
        }

        //
        // Longitude
        //
        if (!extent._previousVertexProcessed)
        {
            extent._previousVertexProcessed = true;
            if (!longitude(extent, v1, v0) || !extent._previousVertexProcessed)
            {
                return;
            }
        }
        longitude(extent, v0, v1);
    }

    var state = {
        minZOverXY : 0.0,
        maxZOverXY : 0.0,
        east : new Cartesian2(),
        west : new Cartesian2(),
        eastNormal : new Cartesian2(),
        westNormal : new Cartesian2(),
        lessThanEqual180Degs : true,
        previousVertexProcessed : true
    };

    SphericalExtent.fromPositions = function(positions, result) {
        if (!defined(result)) {
            result = new SphericalExtent();
        }

        initialize(state, positions[0], positions[1]);

        var length = positions.length;
        for (var i = 1; i < length; ++i) {
            expand(state, positions[i], positions[(i + 1) % length]);
        }

        //
        // Latitude
        //
        var minLat;
        if (state.minZOverXY === Number.MAX_VALUE)
        {
            minLat = CesiumMath.PI_OVER_TWO;
        }
        else if (state.minZOverXY === -Number.MAX_VALUE)
        {
            minLat = -CesiumMath.PI_OVER_TWO;
        }
        else if (state.minZOverXY > 0.0)
        {
            minLat = Math.atan(Math.sqrt(state.minZOverXY));
        }
        else
        {
            minLat = -Math.atan(Math.sqrt(-state.minZOverXY));
        }
        var maxLat;
        if (state.maxZOverXY === Number.MAX_VALUE)
        {
            maxLat = CesiumMath.PI_OVER_TWO;
        }
        else if (state.maxZOverXY === -Number.MAX_VALUE)
        {
            maxLat = -CesiumMath.PI_OVER_TWO;
        }
        else if (state.maxZOverXY > 0.0)
        {
            maxLat = Math.atan(Math.sqrt(state.maxZOverXY));
        }
        else
        {
            maxLat = -Math.atan(Math.sqrt(-state.maxZOverXY));
        }

        result.minimumLatitude = minLat;
        result.latitudeExtent = maxLat - minLat;

        //
        // Longitude
        //
        var west = state.west;
        var east = state.east;

        var westAzimuth = Math.atan2(west.y, west.x);
        result.minimumLongitude = westAzimuth;
        var eastAzimuth = Math.atan2(east.y, east.x);
        result.longitudeExtent = eastAzimuth >= westAzimuth ? eastAzimuth - westAzimuth : eastAzimuth - westAzimuth + CesiumMath.TWO_PI;

        return result;
    };

    return SphericalExtent;
});
