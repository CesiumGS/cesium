define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * This enumerated type is used in determining where, relative to the frustum, an
     * object is located. The object can either be fully contained within the frustum (INSIDE),
     * partially inside the frustum and partially outside (INTERSECTING), or somwhere entirely
     * outside of the frustum's 6 planes (OUTSIDE).
     *
     * @exports Intersect
     * @typedef Intersect
     * @type {Object}
     * @property {Number} OUTSIDE Represents that an object is not contained within the frustum.
     * @property {Number} INTERSECTING Represents that an object intersects one of the frustum's planes.
     * @property {Number} INSIDE Represents that an object is fully within the frustum.
     */
    var Intersect = {
        OUTSIDE : -1,
        INTERSECTING : 0,
        INSIDE : 1
    };

    return freezeObject(Intersect);
});
