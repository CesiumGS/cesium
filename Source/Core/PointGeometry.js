/*global define*/
define([
        './defaultValue',
        './defined',
        './ComponentDatatype',
        './PrimitiveType',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './Geometry'
    ], function(
        defaultValue,
        defined,
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
    var PointGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._positionsTypedArray = options.positionsTypedArray;
        this._colorsTypedArray = options.colorsTypedArray;
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
            values : pointGeometry._positionsTypedArray
        });

        if (defined(pointGeometry._colorsTypedArray)) {
            attributes.color = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                values : pointGeometry._colorsTypedArray,
                normalize : true
            });
        }

        return new Geometry({
            attributes : attributes,
            indices : undefined,
            primitiveType : PrimitiveType.POINTS,
            boundingSphere : BoundingSphere.fromVertices(pointGeometry._positionsTypedArray)
        });
    };

    return PointGeometry;
});
