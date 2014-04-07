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
     * Describes the outline of a {@link FanGeometry}.
     *
     * @alias FanOutlineGeometry
     * @constructor
     *
     * @param {Spherical[]} options.directions The directions, pointing outward from the origin, that defined the fan.
     * @param {Number} options.radius The radius at which to draw the fan.
     * @param {Number} [options.numberOfRings=6] The number of outline rings to draw, starting from the outer edge and equidistantly spaced towards the center.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     */
    var FanOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!options.perDirectionRadius && !defined(options.radius)) {
            throw new DeveloperError('options.radius is required when options.perDirectionRadius is undefined or false.');
        }

        if (!defined(options.directions)) {
            throw new DeveloperError('options.directions is required');
        }
        //>>includeEnd('debug');

        this._radius = options.radius;
        this._directions = options.directions;
        this._perDirectionRadius = options.perDirectionRadius;
        this._numberOfRings = defaultValue(options.numberOfRings, 6);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._workerName = 'createFanOutlineGeometry';
    };

    /**
     * Computes the geometric representation of a fan outline, including its vertices, indices, and a bounding sphere.
     * @memberof FanOutlineGeometry
     *
     * @param {FanOutlineGeometry} fanGeometry A description of the fan.
     * @returns {Geometry} The computed vertices and indices.
     */
    FanOutlineGeometry.createGeometry = function(fanGeometry) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(fanGeometry)) {
            throw new DeveloperError('fanGeometry is required');
        }
        //>>includeEnd('debug');

        var radius = fanGeometry._radius;
        var perDirectionRadius = defined(fanGeometry._perDirectionRadius) && fanGeometry._perDirectionRadius;
        var directions = fanGeometry._directions;
        var vertexFormat = fanGeometry._vertexFormat;
        var numberOfRings = fanGeometry._numberOfRings;

        var i;
        var x;
        var ring;
        var length;
        var maxRadius = 0;
        var indices;
        var positions;
        var directionsLength = directions.length;
        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            x = 0;
            length = directionsLength * 3 * numberOfRings;
            positions = new Float64Array(length);

            for (ring = 0; ring < numberOfRings; ring++) {
                for (i = 0; i < directionsLength; i++) {
                    scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);

                    var currentRadius = perDirectionRadius ? Cartesian3.magnitude(scratchCartesian) : radius;
                    var ringRadius = (currentRadius / numberOfRings) * (ring + 1);

                    positions[x++] = scratchCartesian.x * ringRadius;
                    positions[x++] = scratchCartesian.y * ringRadius;
                    positions[x++] = scratchCartesian.z * ringRadius;
                    maxRadius = Math.max(maxRadius, currentRadius);
                }
            }

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        x = 0;
        length = directionsLength * 2 * numberOfRings;
        indices = new Uint16Array(length);

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
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, maxRadius)
        });
    };

    return FanOutlineGeometry;
});
