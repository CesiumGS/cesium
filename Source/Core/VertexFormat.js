/*global define*/
define([
        './defaultValue',
        './freezeObject'
    ], function(
        defaultValue,
        freezeObject) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias VertexFormat
     * @constructor
     */
    var VertexFormat = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.position = defaultValue(options.position, false);

        /**
         * DOC_TBA
         */
        this.normal = defaultValue(options.normal, false);

        /**
         * DOC_TBA
         */
        this.st = defaultValue(options.st, false);

        /**
         * DOC_TBA
         */
        this.binormal = defaultValue(options.binormal, false);

        /**
         * DOC_TBA
         */
        this.tangent = defaultValue(options.tangent, false);

        // Reserved names
        // * color - for per-geometry color.
        // * pickColor - for picking.
    };

    /**
     * DOC_TBA
     */
    VertexFormat.DEFAULT = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true
    }));

    /**
     * DOC_TBA
     */
    VertexFormat.POSITION_ONLY = freezeObject(new VertexFormat({
        position : true
    }));

    /**
     * DOC_TBA
     *
     * For use with per-geometry color appearance.
     */
    VertexFormat.POSITION_AND_NORMAL = freezeObject(new VertexFormat({
        position : true,
        normal : true
    }));

    /**
     * DOC_TBA
     *
     * For use with ellipsoid-surface appearance.
     */
    VertexFormat.POSITION_AND_ST = freezeObject(new VertexFormat({
        position : true,
        st : true
    }));

    /**
     * DOC_TBA
     */
    VertexFormat.ALL = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true,
        binormal : true,
        tangent  : true
    }));

    return VertexFormat;
});