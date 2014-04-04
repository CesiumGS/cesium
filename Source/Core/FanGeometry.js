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
        './GeometryPipeline',
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
        GeometryPipeline,
        VertexFormat,
        Geometry) {
    "use strict";

    var scratchCartesian;

    /**
     * Describes a triangle fan around the origin.
     *
     * @alias FanGeometry
     * @constructor
     *
     * @param {Spherical[]} options.directions The directions from the origin that defined the fan.
     * @param {Number} options.radius The radius at which to draw the fan.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @see FanGeometry#createGeometry
     */
    var FanGeometry = function(options) {
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

        this._radius = options.radius;
        this._directions = options.directions;
        this._vertexFormat = vertexFormat;
        this._workerName = 'createFanGeometry';
    };

    /**
     * Computes the geometric representation of a fan, including its vertices, indices, and a bounding sphere.
     * @memberof FanGeometry
     *
     * @param {FanGeometry} fanGeometry A description of the fan.
     * @returns {Geometry} The computed vertices and indices.
     */
    FanGeometry.createGeometry = function(fanGeometry) {
        var radius = fanGeometry._radius;
        var directions = fanGeometry._directions;
        var vertexFormat = fanGeometry._vertexFormat;

        var i;
        var x;
        var length;
        var directionsLength = directions.length;
        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            length = (1 + directionsLength) * 3;
            var positions = new Float64Array(length);

            x = 0;
            positions[x++] = 0;
            positions[x++] = 0;
            positions[x++] = 0;
            for (i = 0; i < directionsLength; i++) {
                scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);
                positions[x++] = scratchCartesian.x * radius;
                positions[x++] = scratchCartesian.y * radius;
                positions[x++] = scratchCartesian.z * radius;
            }

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.st) {
            length = (1 + directionsLength) * 2;
            var textureCoordinates = new Float64Array(length);
            textureCoordinates[0] = 0.0;
            textureCoordinates[1] = 0.0;
            for (i = 2; i < length - 1; i += 2) {
                textureCoordinates[i] = 1.0;
                textureCoordinates[i + 1] = 1.0;
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        length = directionsLength * 3;
        var indices = new Uint16Array(length);
        x = 0;
        for (i = 0; i < directionsLength - 1; i++) {
            indices[x++] = 0;
            indices[x++] = i;
            indices[x++] = i + 1;
        }
        indices[x++] = 0;
        indices[x++] = directionsLength - 1;
        indices[x++] = 1;

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });

        if (vertexFormat.normal) {
            geometry = GeometryPipeline.computeNormal(geometry);
        }

        if (vertexFormat.tangent || vertexFormat.binormal) {
            geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
            if (!vertexFormat.tangent) {
                geometry.attributes.tangent = undefined;
            }
            if (!vertexFormat.binormal) {
                geometry.attributes.binormal = undefined;
            }
            if (!vertexFormat.st) {
                geometry.attributes.st = undefined;
            }
        }

        return geometry;
    };

    return FanGeometry;
});
