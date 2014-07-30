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
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
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
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PrimitiveType,
        Rectangle,
        RectangleGeometryLibrary) {
    "use strict";

    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();
    var positionScratch = new Cartesian3();
    var rectangleScratch = new Rectangle();

    function constructRectangle(options) {
        var size = options.size;
        var height = options.height;
        var width = options.width;
        var positions = new Float64Array(size * 3);

        var posIndex = 0;
        var row = 0;
        var col;
        var position = positionScratch;
        for (col = 0; col < width; col++) {
            RectangleGeometryLibrary.computePosition(options, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        col = width - 1;
        for (row = 1; row < height; row++) {
            RectangleGeometryLibrary.computePosition(options, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        row = height - 1;
        for (col = width-2; col >=0; col--){
            RectangleGeometryLibrary.computePosition(options, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        col = 0;
        for (row = height - 2; row > 0; row--) {
            RectangleGeometryLibrary.computePosition(options, row, col, position);
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

        var geo = new Geometry({
            attributes : new GeometryAttributes(),
            primitiveType : PrimitiveType.LINES
        });

        geo.attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });
        geo.indices = indices;

        return geo;
    }

    function constructExtrudedRectangle(options) {
        var surfaceHeight = options.surfaceHeight;
        var extrudedHeight = options.extrudedHeight;
        var ellipsoid = options.ellipsoid;
        var minHeight = Math.min(extrudedHeight, surfaceHeight);
        var maxHeight = Math.max(extrudedHeight, surfaceHeight);
        var geo = constructRectangle(options);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return geo;
        }
        var height = options.height;
        var width = options.width;

        geo = PolygonPipeline.scaleToGeodeticHeight(geo, maxHeight, ellipsoid, false);
        var topPositions = geo.attributes.position.values;
        var length = topPositions.length;
        var positions = new Float64Array(length*2);
        positions.set(topPositions);
        geo = PolygonPipeline.scaleToGeodeticHeight(geo, minHeight, ellipsoid);
        var bottomPositions = geo.attributes.position.values;
        positions.set(bottomPositions, length);
        geo.attributes.position.values = positions;

        var indicesSize = positions.length/3 * 2 + 8;
        var indices = IndexDatatype.createTypedArray(positions.length / 3, indicesSize);
        length = positions.length/6;
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

        geo.indices = indices;

        return geo;
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

    var nwScratch = new Cartographic();
    /**
     * Computes the geometric representation of an outline of an rectangle, including its vertices, indices, and a bounding sphere.
     *
     * @param {RectangleOutlineGeometry} rectangleGeometry A description of the rectangle outline.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    RectangleOutlineGeometry.createGeometry = function(rectangleGeometry) {
        var rectangle = Rectangle.clone(rectangleGeometry._rectangle, rectangleScratch);
        var ellipsoid = rectangleGeometry._ellipsoid;
        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var extrudedHeight = rectangleGeometry._extrudedHeight;

        var options = RectangleGeometryLibrary.computeOptions(rectangleGeometry, rectangle, nwScratch);
        options.size =  2*options.width + 2*options.height - 4;

        var geometry;
        var boundingSphere;
        rectangle = rectangleGeometry._rectangle;
        if (defined(extrudedHeight)) {
            geometry = constructExtrudedRectangle(options);
            var topBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight, topBoundingSphere);
            var bottomBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, extrudedHeight, bottomBoundingSphere);
            boundingSphere = BoundingSphere.union(topBS, bottomBS);
        } else {
            geometry = constructRectangle(options);
            geometry = PolygonPipeline.scaleToGeodeticHeight(geometry, surfaceHeight, ellipsoid, false);
            boundingSphere = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight);
        }

        return new Geometry({
            attributes : geometry.attributes,
            indices : geometry.indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : boundingSphere
        });
    };

    return RectangleOutlineGeometry;
});
