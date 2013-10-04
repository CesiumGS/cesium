/*global define*/
define([
        './ComponentDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './Geometry'
    ], function(
        ComponentDatatype,
        PrimitiveType,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        Geometry) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PointGeometry = function(typedArray) {
        this._typedArray = typedArray;
        this._workerName = 'createPointGeometry';
    };

    /**
     * DOC_TBA
     */
    PointGeometry.createGeometry = function(pointGeometry) {
        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : pointGeometry._typedArray
        });

        return new Geometry({
            attributes : attributes,
            indices : undefined,
            primitiveType : PrimitiveType.POINTS,
            boundingSphere : BoundingSphere.fromVertices(pointGeometry._typedArray)
        });
    };

    return PointGeometry;
});
