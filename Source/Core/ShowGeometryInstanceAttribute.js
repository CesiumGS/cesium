/*global define*/
define([
        './defaultValue',
        './ComponentDatatype',
        './DeveloperError'
    ], function(
        defaultValue,
        ComponentDatatype,
        DeveloperError) {
    "use strict";

    /**
     * Value and type information for per-instance geometry attribute that determines if the geometry instance will be shown.
     *
     * @alias ShowGeometryInstanceAttribute
     * @constructor
     *
     * @param {Boolean} [show=true] Determines if the geometry instance will be shown.
     *
     * @example
     * var instance = new GeometryInstance({
     *   geometry : new BoxGeometry({
     *     vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *     dimensions : new Cartesian3(1000000.0, 1000000.0, 500000.0)
     *   }),
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 1000000.0)),
     *   id : 'box',
     *   attributes : {
     *     show : new ShowGeometryInstanceAttribute(false)
     *   }
     * });
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     */
    var ShowGeometryInstanceAttribute = function(show) {
        show = defaultValue(show, true);

        /**
         * DOC_TBA
         */
        this.componentDatatype = ComponentDatatype.UNSIGNED_BYTE;

        /**
         * DOC_TBA
         */
        this.componentsPerAttribute = 1;

        /**
         * DOC_TBA
         */
        this.normalize = true;

        /**
         * DOC_TBA
         */
        this.value = ShowGeometryInstanceAttribute.toValue(show);
    };

    /**
     * DOC_TBA
     */
    ShowGeometryInstanceAttribute.toValue = function(show) {
        if (typeof show === 'undefined') {
            throw new DeveloperError('show is required.');
        }

        return new Uint8Array([show]);
    };

    return ShowGeometryInstanceAttribute;
});
