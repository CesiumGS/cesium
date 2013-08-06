/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './Matrix2',
        './PrimitiveType'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
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

        if (typeof maxHeight !== 'undefined') {
            position.x = rSurfaceX + nX * maxHeight; // top
            position.y = rSurfaceY + nY * maxHeight;
            position.z = rSurfaceZ + nZ * maxHeight;
        }

        if (typeof minHeight !== 'undefined') {
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
        var indices = IndexDatatype.createTypedArray(positions.length/3, indicesSize);

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
        var indices = IndexDatatype.createTypedArray(positions.length/3, indicesSize);
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
     * A {@link Geometry} that represents geometry for the outline of a a cartographic extent on an ellipsoid centered at the origin.
     *
     * @alias ExtentOutlineGeometry
     * @constructor
     *
     * @param {Extent} options.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The height from the surface of the ellipsoid.
     * @param {Number} [options.rotation=0.0] The rotation of the extent, in radians. A positive rotation is counter-clockwise.
     * @param {Object} [options.extrudedOptions] Extruded options
     * @param {Number} [options.extrudedOptions.height] Height of extruded surface.
     * @param {Boolean} [options.extrudedOptions.closeTop=true] <code>true</code> to render top of the extruded extent; <code>false</code> otherwise.
     * @param {Boolean} [options.extrudedOptions.closeBottom=true] <code>true</code> to render bottom of the extruded extent; <code>false</code> otherwise.
     *
     * @exception {DeveloperError} <code>options.extent</code> is required and must have north, south, east and west attributes.
     * @exception {DeveloperError} <code>options.extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.north</code> must be greater than <code>extent.south</code>.
     * @exception {DeveloperError} <code>options.extent.east</code> must be greater than <code>extent.west</code>.
     * @exception {DeveloperError} Rotated extent is invalid.
     *
     * @example
     * var extent = new ExtentOutlineGeometry({
     *   ellipsoid : Ellipsoid.WGS84,
     *   extent : Extent.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0
     * });
     */
    var ExtentOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var extent = options.extent;
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        extent.validate();

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        var granularityX = (extent.east - extent.west) / (width - 1);
        var granularityY = (extent.north - extent.south) / (height - 1);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var radiiSquared = ellipsoid.getRadiiSquared();

        var surfaceHeight = defaultValue(options.height, 0.0);
        var rotation = options.rotation;

        extent.getNorthwest(nwCartographic);
        extent.getCenter(centerCartographic);

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        if (typeof rotation !== 'undefined') {
            var cosRotation = cos(rotation);
            granYCos *= cosRotation;
            granXCos *= cosRotation;

            var sinRotation = sin(rotation);
            granYSin = granularityY * sinRotation;
            granXSin = granularityX * sinRotation;

            proj.project(nwCartographic, nw);
            proj.project(centerCartographic, center);

            nw.subtract(center, nw);
            Matrix2.fromRotation(rotation, rotationMatrix);
            rotationMatrix.multiplyByVector(nw, nw);
            nw.add(center, nw);
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

        var extentGeometry;
        if (typeof options.extrudedHeight !== 'undefined') {
            extentGeometry = constructExtrudedExtent(params, options.extrudedHeight);
        } else {
            extentGeometry = constructExtent(params);
        }

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : extentGeometry.positions
            })
        });

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = extentGeometry.indices;
        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = extentGeometry.boundingSphere;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;
    };

    return ExtentOutlineGeometry;
});
