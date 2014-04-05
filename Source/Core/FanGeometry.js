/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './Math',
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
        CesiumMath,
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

        if (directions[0].clock < directions[1].clock) {
            directions.reverse();
        }

        var vertexFormat = fanGeometry._vertexFormat;
        var binormals;
        var normals;

        var i;
        var x;
        var s;
        var q;
        var length;
        var directionsLength = directions.length;
        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            length = ((directionsLength + 1) * 2) * 3;
            var positions = new Float64Array(length);

            x = 0;
            for (i = 0; i < directionsLength; i++) {
                positions[x++] = 0;
                positions[x++] = 0;
                positions[x++] = 0;

                scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);
                positions[x++] = scratchCartesian.x * radius;
                positions[x++] = scratchCartesian.y * radius;
                positions[x++] = scratchCartesian.z * radius;
            }

            positions[x++] = 0;
            positions[x++] = 0;
            positions[x++] = 0;

            scratchCartesian = Cartesian3.fromSpherical(directions[0], scratchCartesian);
            positions[x++] = scratchCartesian.x * radius;
            positions[x++] = scratchCartesian.y * radius;
            positions[x++] = scratchCartesian.z * radius;

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.normal) {
            length = ((directionsLength + 1) * 2) * 3;
            normals = new Float64Array(length);

            x = 0;
            for (i = 0; i < directionsLength - 1; i++) {
                scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);
                var v2 = Cartesian3.fromSpherical(directions[i + 1]);
                scratchCartesian = Cartesian3.cross(scratchCartesian, v2);
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

            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.binormal) {
            length = ((directionsLength + 1) * 2) * 3;
            binormals = new Float64Array(length);

            x = 0;
            for (i = 0; i < directionsLength - 1; i++) {
                scratchCartesian = Cartesian3.fromSpherical(directions[i], scratchCartesian);
                binormals[x++] = scratchCartesian.x;
                binormals[x++] = scratchCartesian.y;
                binormals[x++] = scratchCartesian.z;

                binormals[x++] = scratchCartesian.x;
                binormals[x++] = scratchCartesian.y;
                binormals[x++] = scratchCartesian.z;
            }
            binormals[x++] = binormals[0];
            binormals[x++] = binormals[1];
            binormals[x++] = binormals[2];

            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }

        if (vertexFormat.tangent) {
            length = ((directionsLength + 1) * 2) * 3;
            var tangents = new Float64Array(length);

            x = 0;
            for (i = 0; i < length; i += 3) {
                var normal = Cartesian3.unpack(normals, i);
                var binormal = Cartesian3.unpack(binormals, i);
                var tangent = Cartesian3.cross(binormal, normal);
                tangents[x++] = tangent.x;
                tangents[x++] = tangent.y;
                tangents[x++] = tangent.z;

                tangents[x++] = tangent.x;
                tangents[x++] = tangent.y;
                tangents[x++] = tangent.z;
            }
            tangents[x++] = tangents[0];
            tangents[x++] = tangents[1];
            tangents[x++] = tangents[2];

            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.st) {
            length = ((directionsLength + 1) * 2) * 2;
            var textureCoordinates = new Float64Array(length);

            q = 0;
            x = 0;
            for (i = 0; i < directionsLength; i++) {
                s = q / (directionsLength + 1);
                textureCoordinates[x++] = s;
                textureCoordinates[x++] = 0;

                textureCoordinates[x++] = s;
                textureCoordinates[x++] = 1;
                q++;
            }

            s = q / (directionsLength + 1);
            textureCoordinates[x++] = s;
            textureCoordinates[x++] = 0;

            textureCoordinates[x++] = s;
            textureCoordinates[x++] = 1;
            q++;

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        length = (directionsLength * 3) * 2;
        var indices = new Uint16Array(length);
        x = 0;
        i = 0;
        while (x < length) {
            indices[x++] = i;
            indices[x++] = i + 3;
            indices[x++] = i + 1;

            indices[x++] = i;
            indices[x++] = i + 2;
            indices[x++] = i + 3;

            i += 2;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });
    };

    return FanGeometry;
});
