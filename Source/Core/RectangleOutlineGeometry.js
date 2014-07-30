/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './Math',
        './Matrix2',
        './PrimitiveType',
        './Rectangle',
        './RectangleGeometryLibrary'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        Matrix2,
        PrimitiveType,
        Rectangle,
        RectangleGeometryLibrary) {
    "use strict";

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

    function constructRectangle(params) {
        var rectangle = params.rectangle;
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
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = width - 1;
        for (row = 1; row < height; row++) {
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        row = height - 1;
        for (col = width-2; col >=0; col--){
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = 0;
        for (row = height - 2; row > 0; row--) {
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
            boundingSphere : BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight),
            positions: positions,
            indices: indices
        };
    }

    function constructExtrudedRectangle(params) {
        var surfaceHeight = params.surfaceHeight;
        var extrudedHeight = params.extrudedHeight;
        var minHeight = Math.min(extrudedHeight, surfaceHeight);
        var maxHeight = Math.max(extrudedHeight, surfaceHeight);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return constructRectangle(params);
        }
        var rectangle = params.rectangle;
        var height = params.height;
        var width = params.width;
        var size = params.size * 3;
        var ellipsoid = params.ellipsoid;

        var posIndex = 0;
        var row = 0;
        var col;
        var positions = new Float64Array(size * 2);
        for (col = 0; col < width; col++) {
            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = width - 1;
        for (row = 1; row < height; row++) {
            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        row = height - 1;
        for (col = width-2; col >=0; col--){
            positions[posIndex + size] = extrudedPosition.x;
            positions[posIndex + size + 1] = extrudedPosition.y;
            positions[posIndex + size + 2] = extrudedPosition.z;

            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }
        col = 0;
        for (row = height - 2; row > 0; row--) {
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


        var topBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, minHeight, bottomBoundingSphere);
        var boundingSphere = BoundingSphere.union(topBS, bottomBS);

        return {
            boundingSphere : boundingSphere,
            positions: positions,
            indices: indices
        };
    }

    /**
     * A description of the outline of a a cartographic rectangle on an ellipsoid centered at the origin.
     *
     * @alias RectangleOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The height from the surface of the ellipsoid.
     * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.extrudedHeight] Height of extruded surface.
     *
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>rectangle.south</code>.
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be greater than <code>rectangle.west</code>.
     *
     * @see RectangleOutlineGeometry#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Rectangle%20Outline.html|Cesium Sandcastle Rectangle Outline Demo}
     *
     * @example
     * var rectangle = new Cesium.RectangleOutlineGeometry({
     *   ellipsoid : Cesium.Ellipsoid.WGS84,
     *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0
     * });
     * var geometry = Cesium.RectangleOutlineGeometry.createGeometry(rectangle);
     */
    var RectangleOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var rectangle = options.rectangle;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var surfaceHeight = defaultValue(options.height, 0.0);
        var rotation = options.rotation;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        Rectangle.validate(rectangle);
        if (rectangle.east < rectangle.west) {
            throw new DeveloperError('options.rectangle.east must be greater than options.rectangle.west');
        }
        if (rectangle.north < rectangle.south) {
            throw new DeveloperError('options.rectangle.north must be greater than options.rectangle.south');
        }
        //>>includeEnd('debug');

        this._rectangle = rectangle;
        this._granularity = granularity;
        this._ellipsoid = ellipsoid;
        this._surfaceHeight = surfaceHeight;
        this._rotation = rotation;
        this._extrudedHeight = options.extrudedHeight;
        this._workerName = 'createRectangleOutlineGeometry';
    };

    /**
     * Computes the geometric representation of an outline of an rectangle, including its vertices, indices, and a bounding sphere.
     *
     * @param {RectangleOutlineGeometry} rectangleGeometry A description of the rectangle outline.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    RectangleOutlineGeometry.createGeometry = function(rectangleGeometry) {
        var rectangle = rectangleGeometry._rectangle;
        var granularity = rectangleGeometry._granularity;
        var ellipsoid = rectangleGeometry._ellipsoid;
        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var rotation = rectangleGeometry._rotation;
        var extrudedHeight = rectangleGeometry._extrudedHeight;

        var options = RectangleGeometryLibrary.computeOptions(rectangleGeometry, rectangle, nwCartographic);

        var geometry;
        if (defined(extrudedHeight)) {
            geometry = constructExtrudedRectangle(options);
        } else {
            geometry = constructRectangle(options);
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

    return RectangleOutlineGeometry;
});
