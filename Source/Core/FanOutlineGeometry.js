/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat',
        './Geometry'
    ], function(
        defined,
        DeveloperError,
        Cartesian3,
        ComponentDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat,
        Geometry) {
    "use strict";

    var scratchCartesian;

    /**
     * Describes the outline of fan, centered around the origin.
     *
     * @alias FanOutlineGeometry
     * @constructor
     *
     * @param {Spherical[]} options.directions The directions from the origin that defined the fan.
     * @param {Number} options.radius The radius at which to draw the fan.
     * @param {Number} options.numberOfRings The number of outline rings to draw, starting from the outer edge and equidistantly spaced towards the center.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @see FanOutlineGeometry#fromDimensions
     * @see FanOutlineGeometry#createGeometry
     */
    var FanOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.radius)) {
            throw new DeveloperError('options.radius is required.');
        }
        if (!defined(options.directions)) {
            throw new DeveloperError('options.directions is required');
        }
        //>>includeEnd('debug');

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        this._numberOfRings = defaultValue(options.numberOfRings, 6);
        this._radius = options.radius;
        this._directions = options.directions;
        this._vertexFormat = vertexFormat;
        this._workerName = 'createFanOutlineGeometry';
    };

    /**
     * Computes the geometric representation of a fan, including its vertices, indices, and a bounding sphere.
     * @memberof FanOutlineGeometry
     *
     * @param {FanOutlineGeometry} fanGeometry A description of the fan.
     * @returns {Geometry} The computed vertices and indices.
     */
    FanOutlineGeometry.createGeometry = function(fanGeometry) {
        var radius = fanGeometry._radius;
        var directions = fanGeometry._directions;
        var vertexFormat = fanGeometry._vertexFormat;
        var numberOfRings = fanGeometry._numberOfRings;

        var i;
        var x;
        var length;
        var directionsLength = directions.length;
        var attributes = new GeometryAttributes();
        var indices;
        var positions;
        var ring;

        if (vertexFormat.position) {
            length = directionsLength * 3 * numberOfRings;
            positions = new Float64Array(length);
            x = 0;
            for (ring = 0; ring < numberOfRings; ring++) {
                var ringRadius = (radius / numberOfRings) * (ring + 1);
                for (i = 0; i < directionsLength; i++) {
                    scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);
                    positions[x++] = scratchCartesian.x * ringRadius;
                    positions[x++] = scratchCartesian.y * ringRadius;
                    positions[x++] = scratchCartesian.z * ringRadius;
                }
            }

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        length = directionsLength * 2 * numberOfRings;
        indices = new Uint16Array(length);
        x = 0;
        for (ring = 0; ring < numberOfRings; ring++) {
            var offset = ring * directionsLength;
            for (i = 0; i < directionsLength - 1; i++) {
                indices[x++] = i + offset;
                indices[x++] = i + 1 + offset;
            }
            indices[x++] = i + offset;
            indices[x++] = 0 + offset;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });
    };

    return FanOutlineGeometry;
});
