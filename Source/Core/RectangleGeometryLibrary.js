import Cartesian3 from './Cartesian3.js';
import Cartographic from './Cartographic.js';
import defined from './defined.js';
import DeveloperError from './DeveloperError.js';
import GeographicProjection from './GeographicProjection.js';
import CesiumMath from './Math.js';
import Matrix2 from './Matrix2.js';
import Rectangle from './Rectangle.js';

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    /**
     * @private
     */
    var RectangleGeometryLibrary = {};

    /**
     * @private
     */
    RectangleGeometryLibrary.computePosition = function(computedOptions, ellipsoid, computeST, row, col, position, st) {
        var radiiSquared = ellipsoid.radiiSquared;
        var nwCorner = computedOptions.nwCorner;
        var rectangle = computedOptions.boundingRectangle;

        var stLatitude = nwCorner.latitude - computedOptions.granYCos * row + col * computedOptions.granXSin;
        var cosLatitude = cos(stLatitude);
        var nZ = sin(stLatitude);
        var kZ = radiiSquared.z * nZ;

        var stLongitude = nwCorner.longitude + row * computedOptions.granYSin + col * computedOptions.granXCos;
        var nX = cosLatitude * cos(stLongitude);
        var nY = cosLatitude * sin(stLongitude);

        var kX = radiiSquared.x * nX;
        var kY = radiiSquared.y * nY;

        var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

        position.x = kX / gamma;
        position.y = kY / gamma;
        position.z = kZ / gamma;

        if (computeST) {
            var stNwCorner = computedOptions.stNwCorner;
            if (defined(stNwCorner)) {
                stLatitude = stNwCorner.latitude - computedOptions.stGranYCos * row + col * computedOptions.stGranXSin;
                stLongitude = stNwCorner.longitude + row * computedOptions.stGranYSin + col * computedOptions.stGranXCos;

                st.x = (stLongitude - computedOptions.stWest) * computedOptions.lonScalar;
                st.y = (stLatitude - computedOptions.stSouth) * computedOptions.latScalar;
            } else {
                st.x = (stLongitude - rectangle.west) * computedOptions.lonScalar;
                st.y = (stLatitude - rectangle.south) * computedOptions.latScalar;
            }
        }
    };

    var rotationMatrixScratch = new Matrix2();
    var nwCartesian = new Cartesian3();
    var centerScratch = new Cartographic();
    var centerCartesian = new Cartesian3();
    var proj = new GeographicProjection();

    function getRotationOptions(nwCorner, rotation, granularityX, granularityY, center, width, height) {
        var cosRotation = Math.cos(rotation);
        var granYCos = granularityY * cosRotation;
        var granXCos = granularityX * cosRotation;

        var sinRotation = Math.sin(rotation);
        var granYSin = granularityY * sinRotation;
        var granXSin = granularityX * sinRotation;

        nwCartesian = proj.project(nwCorner, nwCartesian);

        nwCartesian = Cartesian3.subtract(nwCartesian, centerCartesian, nwCartesian);
        var rotationMatrix = Matrix2.fromRotation(rotation, rotationMatrixScratch);
        nwCartesian = Matrix2.multiplyByVector(rotationMatrix, nwCartesian, nwCartesian);
        nwCartesian = Cartesian3.add(nwCartesian, centerCartesian, nwCartesian);
        nwCorner = proj.unproject(nwCartesian, nwCorner);

        width -= 1;
        height -= 1;

        var latitude = nwCorner.latitude;
        var latitude0 = latitude + width * granXSin;
        var latitude1 = latitude - granYCos * height;
        var latitude2 = latitude - granYCos * height + width * granXSin;

        var north = Math.max(latitude, latitude0, latitude1, latitude2);
        var south = Math.min(latitude, latitude0, latitude1, latitude2);

        var longitude = nwCorner.longitude;
        var longitude0 = longitude + width * granXCos;
        var longitude1 = longitude + height * granYSin;
        var longitude2 = longitude + height * granYSin + width * granXCos;

        var east = Math.max(longitude, longitude0, longitude1, longitude2);
        var west = Math.min(longitude, longitude0, longitude1, longitude2);

        return {
            north: north,
            south: south,
            east: east,
            west: west,
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            nwCorner : nwCorner
        };
    }

    /**
     * @private
     */
    RectangleGeometryLibrary.computeOptions = function(rectangle, granularity, rotation, stRotation, boundingRectangleScratch, nwCornerResult, stNwCornerResult) {
        var east = rectangle.east;
        var west = rectangle.west;
        var north = rectangle.north;
        var south = rectangle.south;

        var northCap = false;
        var southCap = false;

        if (north === CesiumMath.PI_OVER_TWO) {
            northCap = true;
        }
        if (south === -CesiumMath.PI_OVER_TWO) {
            southCap = true;
        }

        var width;
        var height;
        var granularityX;
        var granularityY;
        var dx;
        var dy = north - south;
        if (west > east) {
            dx = (CesiumMath.TWO_PI - west + east);
        } else {
            dx = east - west;
        }

        width = Math.ceil(dx / granularity) + 1;
        height = Math.ceil(dy / granularity) + 1;
        granularityX = dx / (width - 1);
        granularityY = dy / (height - 1);

        var nwCorner = Rectangle.northwest(rectangle, nwCornerResult);
        var center = Rectangle.center(rectangle, centerScratch);
        if (rotation !== 0 || stRotation !== 0) {
            if (center.longitude < nwCorner.longitude) {
                center.longitude += CesiumMath.TWO_PI;
            }
            centerCartesian = proj.project(center, centerCartesian);
        }

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        var boundingRectangle = Rectangle.clone(rectangle, boundingRectangleScratch);

        var computedOptions = {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            nwCorner : nwCorner,
            boundingRectangle : boundingRectangle,
            width: width,
            height: height,
            northCap: northCap,
            southCap: southCap
        };

        if (rotation !== 0) {
            var rotationOptions = getRotationOptions(nwCorner, rotation, granularityX, granularityY, center, width, height);
            north = rotationOptions.north;
            south = rotationOptions.south;
            east = rotationOptions.east;
            west = rotationOptions.west;

            //>>includeStart('debug', pragmas.debug);
            if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO ||
                south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
                throw new DeveloperError('Rotated rectangle is invalid.  It crosses over either the north or south pole.');
            }
            //>>includeEnd('debug')

            computedOptions.granYCos = rotationOptions.granYCos;
            computedOptions.granYSin = rotationOptions.granYSin;
            computedOptions.granXCos = rotationOptions.granXCos;
            computedOptions.granXSin = rotationOptions.granXSin;

            boundingRectangle.north = north;
            boundingRectangle.south = south;
            boundingRectangle.east = east;
            boundingRectangle.west = west;
        }

        if (stRotation !== 0) {
            rotation = rotation - stRotation;
            var stNwCorner = Rectangle.northwest(boundingRectangle, stNwCornerResult);

            var stRotationOptions = getRotationOptions(stNwCorner, rotation, granularityX, granularityY, center, width, height);

            computedOptions.stGranYCos =  stRotationOptions.granYCos;
            computedOptions.stGranXCos = stRotationOptions.granXCos;
            computedOptions.stGranYSin = stRotationOptions.granYSin;
            computedOptions.stGranXSin = stRotationOptions.granXSin;
            computedOptions.stNwCorner = stNwCorner;
            computedOptions.stWest = stRotationOptions.west;
            computedOptions.stSouth = stRotationOptions.south;
        }

        return computedOptions;
    };
export default RectangleGeometryLibrary;
