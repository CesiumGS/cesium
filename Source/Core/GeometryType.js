define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     */
    var GeometryType = {
        NONE : 0,
        TRIANGLES : 1,
        LINES : 2,
        POLYLINES : 3
    };

    return freezeObject(GeometryType);
});
