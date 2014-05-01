/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './GeometryAttribute',
        './GeometryAttributes',
        './Geometry',
        './GeometryPipeline',
        './PrimitiveType'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        GeometryAttribute,
        GeometryAttributes,
        Geometry,
        GeometryPipeline,
        PrimitiveType) {
    "use strict";

    var PerspectiveFrustumGeometry = function(perspectiveFrustum) {
        var offCenter = perspectiveFrustum.offCenterFrustum;

        var near = offCenter.near;
        var far = offCenter.far;
        var top = offCenter.top;
        var bottom = offCenter.bottom;
        var left = offCenter.left;
        var right = offCenter.right;

        var lowerLeftNear = new Cartesian3(left, bottom, -near);
        var lowerRightNear = new Cartesian3(right, bottom, -near);
        var upperLeftNear = new Cartesian3(left, top, -near);
        var upperRightNear = new Cartesian3(right, top, -near);

        var farOverNear = far / near;
        var lowerLeftFar = Cartesian3.multiplyByScalar(lowerLeftNear, farOverNear);
        var lowerRightFar = Cartesian3.multiplyByScalar(lowerRightNear, farOverNear);
        var upperLeftFar = Cartesian3.multiplyByScalar(upperLeftNear, farOverNear);
        var upperRightFar = Cartesian3.multiplyByScalar(upperRightNear, farOverNear);

        var faces = 6;
        var trianglesPerFace = 2;
        var verticesPerFace = 4;
        var componentsPerVertex = 3;
        var indicesPerTriangle = 3;

        var positions = new Float64Array(faces * verticesPerFace * componentsPerVertex);

        var index = 0;

        // Left face
        Cartesian3.pack(lowerLeftFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerLeftNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperLeftNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperLeftFar, positions, (index++) * componentsPerVertex);

        // Right face
        Cartesian3.pack(lowerRightFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerRightNear, positions, (index++) * componentsPerVertex);

        // Top face
        Cartesian3.pack(upperLeftFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperLeftNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightFar, positions, (index++) * componentsPerVertex);

        // Bottom face
        Cartesian3.pack(lowerLeftFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerRightFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerRightNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerLeftFar, positions, (index++) * componentsPerVertex);

        // Near face
        Cartesian3.pack(lowerLeftNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerRightNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightNear, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperLeftNear, positions, (index++) * componentsPerVertex);

        // Far face
        Cartesian3.pack(lowerLeftFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperLeftFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(upperRightFar, positions, (index++) * componentsPerVertex);
        Cartesian3.pack(lowerRightFar, positions, (index++) * componentsPerVertex);

        var indices = new Uint16Array(faces * trianglesPerFace * indicesPerTriangle);

        index = 0;

        for (var face = 0; face < faces; ++face) {
            var faceStart = face * 4;
            indices[index++] = faceStart;
            indices[index++] = faceStart + 1;
            indices[index++] = faceStart + 2;

            indices[index++] = faceStart + 3;
            indices[index++] = faceStart + 0;
            indices[index++] = faceStart + 2;
        }

        var attributes = new GeometryAttributes({
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            })
        });

        var geometry = GeometryPipeline.computeNormal(new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromVertices(positions)
        }));

        this.attributes = geometry.attributes;
        this.indices = geometry.indices;
        this.primitiveType = geometry.primitiveType;
        this.boundingSphere = geometry.boundingSphere;
    };

    return PerspectiveFrustumGeometry;
});
