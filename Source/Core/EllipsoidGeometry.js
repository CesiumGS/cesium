/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian3',
        './Math',
        './Ellipsoid',
        './ComponentDatatype',
        './IndexDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat',
        './Geometry'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian3,
        CesiumMath,
        Ellipsoid,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat,
        Geometry) {
    "use strict";

    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var defaultRadii = new Cartesian3(1.0, 1.0, 1.0);

    /**
     * A description of an ellipsoid centered at the origin.
     *
     * @alias EllipsoidGeometry
     * @constructor
     *
     * @param {Cartesian3} [options.radii=Cartesian3(1.0, 1.0, 1.0)] The radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.stackPartitions=64] The number of times to partition the ellipsoid into stacks.
     * @param {Number} [options.slicePartitions=64] The number of times to partition the ellipsoid into radial slices.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} options.slicePartitions cannot be less than three.
     * @exception {DeveloperError} options.stackPartitions cannot be less than three.
     *
     * @see EllipsoidGeometry#createGeometry
     *
     * @example
     * var ellipsoid = new EllipsoidGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   radii : new Cartesian3(1000000.0, 500000.0, 500000.0)
     * });
     * var geometry = EllipsoidGeometry.createGeometry(ellipsoid);
     */

    var cos = Math.cos;
    var sin = Math.sin;
    var EllipsoidGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var radii = defaultValue(options.radii, defaultRadii);
        var ellipsoid = new Ellipsoid(radii.x, radii.y, radii.z);
        var stackPartitions = defaultValue(options.stackPartitions, 64);
        var slicePartitions = defaultValue(options.slicePartitions, 64);

        if (slicePartitions < 3) {
            throw new DeveloperError ('options.slicePartitions cannot be less than three.');
        }
        if (stackPartitions < 3) {
            throw new DeveloperError('options.stackPartitions cannot be less than three.');
        }
        var vertexCount = 2 + (stackPartitions - 1) * slicePartitions;
        var positions = new Float64Array(vertexCount * 3);
        var numIndices =  6*slicePartitions*(stackPartitions - 1);
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

        this._radii = Cartesian3.clone(radii);
        this._numberOfPartitions = numberOfPartitions;
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._workerName = 'createEllipsoidGeometry';
    };

    /**
     * Computes the geometric representation of an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipsoidGeometry} ellipsoidGeometry A description of the ellipsoid.
     * @returns {Geometry} The computed vertices and indices.
     */
    EllipsoidGeometry.createGeometry = function(ellipsoidGeometry) {
        var radii = ellipsoidGeometry._radii;
        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var numberOfPartitions = ellipsoidGeometry._numberOfPartitions;
        var vertexFormat = ellipsoidGeometry._vertexFormat;

        var normals = (vertexFormat.normal) ? new Float32Array(vertexCount * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(vertexCount * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(vertexCount * 3) : undefined;
        var st = (vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined;

        var cosTheta = new Array(slicePartitions);
        var sinTheta = new Array(slicePartitions);


        var i;
        var j;
        for (i = 0; i < slicePartitions; i++) {
            var theta = CesiumMath.TWO_PI * i / slicePartitions;
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);
        }

        var index = 0;
        positions[index++] = 0; // first point
        positions[index++] = 0;
        positions[index++] = radii.z;

        for (i = 1; i < stackPartitions; i++) {
            var phi = Math.PI * i / stackPartitions;
            var sinPhi = sin(phi);

            var xSinPhi = radii.x * sinPhi;
            var ySinPhi = radii.y * sinPhi;
            var zCosPhi = radii.z * cos(phi);

            for (j = 0; j < slicePartitions; j++) {
                positions[index++] = cosTheta[j] * xSinPhi;
                positions[index++] = sinTheta[j] * ySinPhi;
                positions[index++] = zCosPhi;
            }
        }
        positions[index++] = 0; // last point
        positions[index++] = 0;
        positions[index++] = -radii.z;

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }
        var stIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            for( i = 0; i < vertexCount; i++) {
                var position = Cartesian3.fromArray(positions, i*3, scratchPosition);
                var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                if (vertexFormat.st) {
                    st[stIndex++] = (Math.atan2(normal.y, normal.x) / CesiumMath.TWO_PI) + 0.5;
                    st[stIndex++] = (Math.asin(normal.z) / Math.PI) + 0.5;
                }
                if (vertexFormat.normal) {
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    var tangent;
                    if (i === 0 || i === vertexCount - 1) {
                        tangent = Cartesian3.cross(Cartesian3.UNIT_X, normal, scratchTangent).normalize(tangent);
                    } else {
                        tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, scratchTangent).normalize(tangent);
                    }
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                    if (vertexFormat.binormal) {
                        var binormal = Cartesian3.cross(normal, tangent, scratchBinormal).normalize(scratchBinormal);
                        binormals[binormalIndex++] = binormal.x;
                        binormals[binormalIndex++] = binormal.y;
                        binormals[binormalIndex++] = binormal.z;
                    }
                }
            }

            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : st
                });
            }
            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }
            if (vertexFormat.tangent) {
                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }
            if (vertexFormat.binormal) {
                attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }

        index = 0;
        for (i = 1; i < slicePartitions; i++) { //top row
            indices[index++] = 0;
            indices[index++] = i;
            indices[index++] = i + 1;
        }
        indices[index++] = 0;
        indices[index++] = slicePartitions;
        indices[index++] = 1;

        for (i = 0; i < stackPartitions - 2; i++) {
            var topOffset = (i * slicePartitions) + 1;
            var bottomOffset = ((i+1) * slicePartitions) + 1;

            for (j = 0; j < slicePartitions - 1; j++) {
                indices[index++] = bottomOffset + j;
                indices[index++] = bottomOffset + j + 1;
                indices[index++] = topOffset + j + 1;

                indices[index++] = bottomOffset + j;
                indices[index++] = topOffset + j + 1;
                indices[index++] = topOffset + j;
            }

            indices[index++] = bottomOffset + slicePartitions - 1;
            indices[index++] = bottomOffset;
            indices[index++] = topOffset;
            indices[index++] = bottomOffset + slicePartitions - 1;
            indices[index++] = topOffset;
            indices[index++] = topOffset + slicePartitions - 1;
        }

        var lastPos = vertexCount - 1;
        for (i = lastPos - 1; i > lastPos - slicePartitions; i--) {
            indices[index++] = lastPos;
            indices[index++] = i;
            indices[index++] = i - 1;
        }
        indices[index++] = lastPos;
        indices[index++] = lastPos - slicePartitions;
        indices[index++] = lastPos - 1;

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = BoundingSphere.fromEllipsoid(ellipsoid);
    };

    return EllipsoidGeometry;
});
