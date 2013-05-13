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
        this.position = defaultValue(options.position, true);

        /**
         * DOC_TBA
         */
        this.normal = defaultValue(options.normal, true);

        /**
         * DOC_TBA
         */
        this.st = defaultValue(options.textureCoordinates, true);

        /**
         * DOC_TBA
         */
        this.binormal = defaultValue(options.binormal, false);

        /**
         * DOC_TBA
         */
        this.tangent = defaultValue(options.tangent, false);

        // pickColor is also a reserved name added, when needed, for picking.
    };

    /**
     * DOC_TBA
     */
    VertexFormat.DEFAULT = freezeObject(new VertexFormat());

    /**
     * DOC_TBA
     */
    VertexFormat.POSITION_ONLY = freezeObject(new VertexFormat({
        st : false,
        textureCoordinates : false
    }));

    return VertexFormat;
});