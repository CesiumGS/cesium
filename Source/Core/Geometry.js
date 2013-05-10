/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Matrix4',
    ], function(
        defaultValue,
        DeveloperError,
        Matrix4) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Geometry
     * @constructor
     */
    var Geometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.attributes = options.attributes;

        /**
         * DOC_TBA
         */
        this.indexLists = options.indexLists;

        /**
         * DOC_TBA
         */
        this.boundingSphere = options.boundingSphere;

        /**
         * DOC_TBA
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} geometries is required.
     */
    Geometry.isPickable = function(geometries) {
        if (typeof geometries === 'undefined') {
            throw new DeveloperError('geometries is required.');
        }

        var pickable = false;
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            if (typeof geometries[i].pickData !== 'undefined') {
                pickable = true;
                break;
            }
        }

        return pickable;
    };

    return Geometry;
});
