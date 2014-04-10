/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    var scratchCartesian = new Cartesian3();

    /**
     * Describes a triangle fan around the origin.
     *
     * @alias FanGeometry
     * @constructor
     *
     * @param {Spherical[]} options.directions The directions, pointing outward from the origin, that defined the fan.
     * @param {Number} options.radius The radius at which to draw the fan.
     * @param {Boolean} [options.perDirectionRadius=false] When set to true, the magnitude of each direction is used in place of a constant radius.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @see FanGeometry#createGeometry
     */
    var FanGeometry = function(options) {
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
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(fanGeometry)) {
            throw new DeveloperError('fanGeometry is required');
        }
        //>>includeEnd('debug');

        var vertexFormat = fanGeometry._vertexFormat;
        var radius = fanGeometry._radius;
        var perDirectionRadius = defined(fanGeometry._perDirectionRadius) && fanGeometry._perDirectionRadius;
        var sphericalDiretions = fanGeometry._directions;
        if (sphericalDiretions[0].clock < sphericalDiretions[1].clock) {
            sphericalDiretions.reverse();
        }

        var normals;
        var binormals;
        var maxRadius = 0;

        var i;
        var x;
        var s;
        var direction;
        var length;
        var attributes = new GeometryAttributes();

        //Convert all directions to Cartesian space and remove adjacent duplicates.
        var directions = [];
        var normalizedDirections = [];
        var directionsLength = sphericalDiretions.length;
        for (i = 0; i < directionsLength; i++) {
            direction = Cartesian3.fromSpherical(sphericalDiretions[i]);
            if (i === 0) {
                directions.push(direction);
                normalizedDirections.push(Cartesian3.normalize(direction));
            } else if (!Cartesian3.equals(directions[i - 1], direction)) {
                if (i === directionsLength - 1) {
                    if (!Cartesian3.equals(directions[0], direction)) {
                        directions.push(direction);
                        normalizedDirections.push(Cartesian3.normalize(direction));
                    }
                } else {
                    directions.push(direction);
                    normalizedDirections.push(Cartesian3.normalize(direction));
                }
            }
        }
        directionsLength = directions.length;

        if (vertexFormat.position) {
            length = ((directionsLength + 1) * 2) * 3;
            var positions = new Float64Array(length);

            x = 0;
            for (i = 0; i < directionsLength; i++) {
                positions[x++] = 0;
                positions[x++] = 0;
                positions[x++] = 0;

                direction = normalizedDirections[i];
                var currentRadius = perDirectionRadius ? Cartesian3.magnitude(directions[i]) : radius;
                positions[x++] = direction.x * currentRadius;
                positions[x++] = direction.y * currentRadius;
                positions[x++] = direction.z * currentRadius;
                maxRadius = Math.max(maxRadius, currentRadius);
            }

            positions[x++] = positions[0];
            positions[x++] = positions[1];
            positions[x++] = positions[2];
            positions[x++] = positions[3];
            positions[x++] = positions[4];
            positions[x++] = positions[5];

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.normal) {
            length = ((directionsLength + 1) * 2) * 3;
            normals = new Float32Array(length);

            var direction2;
            x = 0;
            for (i = 0; i < directionsLength; i++) {
                direction = directions[i];
                if (i + 1 === directionsLength) {
                    direction2 = directions[0];
                } else {
                    direction2 = directions[i + 1];
                }
                scratchCartesian = Cartesian3.normalize(Cartesian3.cross(direction, direction2, scratchCartesian), scratchCartesian);
                normals[x++] = scratchCartesian.x;
                normals[x++] = scratchCartesian.y;
                normals[x++] = scratchCartesian.z;

                normals[x++] = scratchCartesian.x;
                normals[x++] = scratchCartesian.y;
                normals[x++] = scratchCartesian.z;
            }

            normals[x++] = normals[0];
            normals[x++] = normals[1];
            normals[x++] = normals[2];
            normals[x++] = normals[3];
            normals[x++] = normals[4];
            normals[x++] = normals[5];

            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.binormal) {
            length = ((directionsLength + 1) * 2) * 3;
            binormals = new Float32Array(length);

            x = 0;
            for (i = 0; i < directionsLength; i++) {
                direction = normalizedDirections[i];
                binormals[x++] = direction.x;
                binormals[x++] = direction.y;
                binormals[x++] = direction.z;

                binormals[x++] = direction.x;
                binormals[x++] = direction.y;
                binormals[x++] = direction.z;
            }
            binormals[x++] = binormals[0];
            binormals[x++] = binormals[1];
            binormals[x++] = binormals[2];
            binormals[x++] = binormals[3];
            binormals[x++] = binormals[4];
            binormals[x++] = binormals[5];

            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }

        if (vertexFormat.tangent) {
            length = ((directionsLength + 1) * 2) * 3;
            var tangents = new Float32Array(length);

            x = 0;
            for (i = 0; i < length; i += 6) {
                var normal = Cartesian3.unpack(normals, i);
                var binormal = Cartesian3.unpack(binormals, i);
                var tangent = Cartesian3.normalize(Cartesian3.cross(binormal, normal, scratchCartesian), scratchCartesian);
                tangents[x++] = tangent.x;
                tangents[x++] = tangent.y;
                tangents[x++] = tangent.z;

                tangents[x++] = tangent.x;
                tangents[x++] = tangent.y;
                tangents[x++] = tangent.z;
            }

            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.st) {
            length = ((directionsLength + 1) * 2) * 2;
            var textureCoordinates = new Float32Array(length);

            x = 0;
            for (i = 0; i < directionsLength; i++) {
                s = 1.0 - (i / (directionsLength + 1));
                textureCoordinates[x++] = s;
                textureCoordinates[x++] = 0.0;

                textureCoordinates[x++] = s;
                textureCoordinates[x++] = 1.0;
            }

            s = 1 - (i / (directionsLength + 1));
            textureCoordinates[x++] = s;
            textureCoordinates[x++] = 0.0;

            textureCoordinates[x++] = s;
            textureCoordinates[x++] = 1.0;

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        x = 0;
        i = 0;
        length = ((directionsLength + 1) * 2) * 3;
        var indices = IndexDatatype.createTypedArray(length / 3, length);
        while (x < length - 6) {
            indices[x++] = i;
            indices[x++] = i + 3;
            indices[x++] = i + 1;

            indices[x++] = i;
            indices[x++] = i + 2;
            indices[x++] = i + 3;

            i += 2;
        }

        indices[x++] = i;
        indices[x++] = 1;
        indices[x++] = i + 1;

        indices[x++] = i;
        indices[x++] = 0;
        indices[x++] = 1;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, maxRadius)
        });
    };

    return FanGeometry;
});
