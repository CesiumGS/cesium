/*global define*/
define([
        './defaultValue',
        './defined',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './Matrix2',
        './PrimitiveType'
    ], function(
        defaultValue,
        defined,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        Matrix2,
        PrimitiveType) {
    "use strict";

    function isValidLatLon(latitude, longitude) {
        if (latitude < -CesiumMath.PI_OVER_TWO || latitude > CesiumMath.PI_OVER_TWO) {
            return false;
        }
        if (longitude > CesiumMath.PI || longitude < -CesiumMath.PI) {
            return false;
        }
        return true;
    }

    var nw = new Cartesian3();
    var nwCartographic = new Cartographic();
    var centerCartographic = new Cartographic();
    var center = new Cartesian3();
    var rotationMatrix = new Matrix2();
    var proj = new GeographicProjection();
    var position = new Cartesian3();
    var extrudedPosition = new Cartesian3();
    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var stLatitude, stLongitude;

    function computePosition(params, row, col, maxHeight, minHeight) {
        var radiiSquared = params.radiiSquared;

        stLatitude = nwCartographic.latitude - params.granYCos * row + col * params.granXSin;
        var cosLatitude = cos(stLatitude);
        var nZ = sin(stLatitude);
        var kZ = radiiSquared.z * nZ;

        stLongitude = nwCartographic.longitude + row * params.granYSin + col * params.granXCos;
        var nX = cosLatitude * cos(stLongitude);
        var nY = cosLatitude * sin(stLongitude);

        var kX = radiiSquared.x * nX;
        var kY = radiiSquared.y * nY;

        var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

        var rSurfaceX = kX / gamma;
        var rSurfaceY = kY / gamma;
        var rSurfaceZ = kZ / gamma;

        if (defined(maxHeight)) {
            position.x = rSurfaceX + nX * maxHeight; // top
            position.y = rSurfaceY + nY * maxHeight;
            position.z = rSurfaceZ + nZ * maxHeight;
        }

        if (defined(minHeight)) {
            extrudedPosition.x = rSurfaceX + nX * minHeight; // bottom
            extrudedPosition.y = rSurfaceY + nY * minHeight;
            extrudedPosition.z = rSurfaceZ + nZ * minHeight;
        }
    }

    function constructExtent(params) {
        var extent = params.extent;
        var ellipsoid = params.ellipsoid;
        var size = params.size;
        var height = params.height;
        var width = params.width;
        var surfaceHeight = params.surfaceHeight;

        var positions = new Float64Array(size * 3);

        var posIndex = 0;
        var row = 0;
        var col;
        for (col = 0; col < width; col++) {
            computePosition(params, row, col, surfaceHeight);

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = width - 1;
        for (row = 1; row < height; row++) {
            computePosition(params, row, col, surfaceHeight);

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        row = height - 1;
        for (col = width-2; col >=0; col--){
            computePosition(params, row, col, surfaceHeight);

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = 0;
        for (row = height - 2; row > 0; row--) {
            computePosition(params, row, col, surfaceHeight);

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        var indicesSize = positions.length/3 * 2;
        var indices = IndexDatatype.createTypedArray(positions.length / 3, indicesSize);

        var index = 0;
        for(var i = 0; i < (positions.length/3)-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
        }
        indices[index++] = (positions.length/3)-1;
        indices[index++] = 0;

        return {
            boundingSphere : BoundingSphere.fromExtent3D(extent, ellipsoid, surfaceHeight),
            positions: positions,
            indices: indices
        };
    }

    function constructExtrudedExtent(params, extrudedHeight) {
        var surfaceHeight = params.surfaceHeight;
        var minHeight = Math.min(extrudedHeight, surfaceHeight);
        var maxHeight = Math.max(extrudedHeight, surfaceHeight);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return constructExtent(params);
        }
        var extent = params.extent;
        var height = params.height;
        var width = params.width;
        var size = params.size * 3;
        var ellipsoid = params.ellipsoid;

        var posIndex = 0;
        var row = 0;
        var col;
        var positions = new Float64Array(size * 2);
        for (col = 0; col < width; col++) {
            computePosition(params, row, col, maxHeight, minHeight);

            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = width - 1;
        for (row = 1; row < height; row++) {
            computePosition(params, row, col, maxHeight, minHeight);

            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        row = height - 1;
        for (col = width-2; col >=0; col--){
            computePosition(params, row, col, maxHeight, minHeight);

            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = 0;
        for (row = height - 2; row > 0; row--) {
            computePosition(params, row, col, maxHeight, minHeight);

            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        var indicesSize = positions.length/3 * 2 + 8;
        var indices = IndexDatatype.createTypedArray(positions.length / 3, indicesSize);
        var length = positions.length/6;
        var index = 0;
        for (var i = 0; i < length - 1; i++) {
            indices[index++] = i;
            indices[index++] =i+1;
            indices[index++] = i + length;
            indices[index++] = i + length + 1;
        }
        indices[index++] = length - 1;
        indices[index++] = 0;
        indices[index++] = length + length - 1;
        indices[index++] = length;

        indices[index++] = 0;
        indices[index++] = length;
        indices[index++] = width-1;
        indices[index++] = length + width-1;
        indices[index++] = width + height - 2;
        indices[index++] = width + height - 2 + length;
        indices[index++] =  2*width + height - 3;
        indices[index++] = 2*width + height - 3 + length;


        var topBS = BoundingSphere.fromExtent3D(extent, ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromExtent3D(extent, ellipsoid, minHeight, bottomBoundingSphere);
        var boundingSphere = BoundingSphere.union(topBS, bottomBS);

        return {
            boundingSphere : boundingSphere,
            positions: positions,
            indices: indices
        };
    }

    /**
     * A description of the outline of a a cartographic extent on an ellipsoid centered at the origin.
     *
     * @alias ExtentOutlineGeometry
     * @constructor
     *
     * @param {Extent} options.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The height from the surface of the ellipsoid.
     * @param {Number} [options.rotation=0.0] The rotation of the extent, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.extrudedHeight] Height of extruded surface.
     *
     * @exception {DeveloperError} <code>options.extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.north</code> must be greater than <code>extent.south</code>.
     * @exception {DeveloperError} <code>options.extent.east</code> must be greater than <code>extent.west</code>.
     *
     * @see ExtentOutlineGeometry#createGeometry
     *
     * @example
     * var extent = new Cesium.ExtentOutlineGeometry({
     *   ellipsoid : Cesium.Ellipsoid.WGS84,
     *   extent : Cesium.Extent.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0
     * });
     * var geometry = Cesium.ExtentOutlineGeometry.createGeometry(extent);
     */
    var ExtentOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var extent = options.extent;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var surfaceHeight = defaultValue(options.height, 0.0);
        var rotation = options.rotation;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(extent)) {
            throw new DeveloperError('extent is required.');
        }
        extent.validate();
        if (extent.east < extent.west) {
            throw new DeveloperError('options.extent.east must be greater than options.extent.west');
        }
        if (extent.north < extent.south) {
            throw new DeveloperError('options.extent.north must be greater than options.extent.south');
        }
        //>>includeEnd('debug');

        this._extent = extent;
        this._granularity = granularity;
        this._ellipsoid = ellipsoid;
        this._surfaceHeight = surfaceHeight;
        this._rotation = rotation;
        this._extrudedHeight = options.extrudedHeight;
        this._workerName = 'createExtentOutlineGeometry';
    };

    /**
     * Computes the geometric representation of an outline of an extent, including its vertices, indices, and a bounding sphere.
     * @memberof ExtentOutlineGeometry
     *
     * @param {ExtentOutlineGeometry} extentGeometry A description of the extent outline.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated extent is invalid.
     */
    ExtentOutlineGeometry.createGeometry = function(extentGeometry) {
        var extent = extentGeometry._extent;
        var granularity = extentGeometry._granularity;
        var ellipsoid = extentGeometry._ellipsoid;
        var surfaceHeight = extentGeometry._surfaceHeight;
        var rotation = extentGeometry._rotation;
        var extrudedHeight = extentGeometry._extrudedHeight;

        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        var granularityX = (extent.east - extent.west) / (width - 1);
        var granularityY = (extent.north - extent.south) / (height - 1);

        var radiiSquared = ellipsoid.radiiSquared;

        extent.getNorthwest(nwCartographic);
        extent.getCenter(centerCartographic);

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        if (defined(rotation)) {
            var cosRotation = cos(rotation);
            granYCos *= cosRotation;
            granXCos *= cosRotation;

            var sinRotation = sin(rotation);
            granYSin = granularityY * sinRotation;
            granXSin = granularityX * sinRotation;

            proj.project(nwCartographic, nw);
            proj.project(centerCartographic, center);

            Cartesian3.subtract(nw, center, nw);
            Matrix2.fromRotation(rotation, rotationMatrix);
            Matrix2.multiplyByVector(rotationMatrix, nw, nw);
            Cartesian3.add(nw, center, nw);
            proj.unproject(nw, nwCartographic);

            var latitude = nwCartographic.latitude;
            var latitude0 = latitude + (width - 1) * granXSin;
            var latitude1 = latitude - granYCos * (height - 1);
            var latitude2 = latitude - granYCos * (height - 1) + (width - 1) * granXSin;

            var north = Math.max(latitude, latitude0, latitude1, latitude2);
            var south = Math.min(latitude, latitude0, latitude1, latitude2);

            var longitude = nwCartographic.longitude;
            var longitude0 = longitude + (width - 1) * granXCos;
            var longitude1 = longitude + (height - 1) * granYSin;
            var longitude2 = longitude + (height - 1) * granYSin + (width - 1) * granXCos;

            var east = Math.max(longitude, longitude0, longitude1, longitude2);
            var west = Math.min(longitude, longitude0, longitude1, longitude2);

            if (!isValidLatLon(north, west) || !isValidLatLon(north, east) ||
                    !isValidLatLon(south, west) || !isValidLatLon(south, east)) {
                throw new DeveloperError('Rotated extent is invalid.');
            }
        }

        var size = 2*width + 2*height - 4;

        var params = {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            radiiSquared : radiiSquared,
            ellipsoid : ellipsoid,
            extent : extent,
            width : width,
            height : height,
            surfaceHeight : surfaceHeight,
            size : size
        };

        var geometry;
        if (defined(extrudedHeight)) {
            geometry = constructExtrudedExtent(params, extrudedHeight);
        } else {
            geometry = constructExtent(params);
        }

        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : geometry.positions
            })
        });

        return new Geometry({
            attributes : attributes,
            indices : geometry.indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : geometry.boundingSphere
        });
    };

    return ExtentOutlineGeometry;
});
