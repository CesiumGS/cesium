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

    /**
     * Describes a cube centered at the origin.
     *
     * @alias FanGeometry
     * @constructor
     *
     * @param {Cartesian3} options.minimumCorner The minimum x, y, and z coordinates of the fan.
     * @param {Cartesian3} options.maximumCorner The maximum x, y, and z coordinates of the fan.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @see FanGeometry#fromDimensions
     * @see FanGeometry#createGeometry
     *
     * @example
     * var fan = new Cesium.FanGeometry({
     *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
     *   maximumCorner : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
     *   minimumCorner : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
     * });
     * var geometry = Cesium.FanGeometry.createGeometry(fan);
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

        var attributes = new GeometryAttributes();
        var indices;
        var positions;
        var i;
        var x;

        if (vertexFormat.position) {
            positions = new Float64Array((1 + directions.length) * 3);

            x = 0;
            positions[x++] = 0;
            positions[x++] = 0;
            positions[x++] = 0;
            for (i = 0; i < directions.length; i++) {
                var direction = Cartesian3.fromSpherical(directions[i]);
                //Our vertices are simple the AER converted to cartesian.
                positions[x++] = direction.x * radius;
                positions[x++] = direction.y * radius;
                positions[x++] = direction.z * radius;
            }

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.normal) {
            var normals = new Float32Array((1 + directions.length) * 3);

            x = 0;
            normals[x++] = 0;
            normals[x++] = 0;
            normals[x++] = -1;
            for (i = 0; i < directions.length - 1; i++) {
                var v1 = directions[i + 1];
                var tmp = Cartesian3.subtract(directions[i], v1);
                tmp = Cartesian3.cross(tmp, Cartesian3.negate(v1));
                tmp = Cartesian3.negate(Cartesian3.normalize(tmp));
                normals[x++] = tmp.x;
                normals[x++] = tmp.x;
                normals[x++] = tmp.x;
            }
            normals[x++] = 0;
            normals[x++] = 0;
            normals[x++] = -1;

            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }
        /*
                if (vertexFormat.st) {
                    var texCoords = new Float32Array(6 * 4 * 2);

                    attributes.st = new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : texCoords
                    });
                }

                if (vertexFormat.tangent) {
                    var tangents = new Float32Array(6 * 4 * 3);

                    attributes.tangent = new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : tangents
                    });
                }

                if (vertexFormat.binormal) {
                    var binormals = new Float32Array(6 * 4 * 3);

                    attributes.binormal = new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : binormals
                    });
                }
        */
        indices = new Uint16Array(directions.length * 3);

        x = 0;
        for (i = 0; i < directions.length - 1; i++) {
            indices[x++] = 0;
            indices[x++] = i;
            indices[x++] = i + 1;
        }
        indices[x++] = 0;
        indices[x++] = directions.length - 1;
        indices[x++] = 1;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });
    };

    return FanGeometry;
});
