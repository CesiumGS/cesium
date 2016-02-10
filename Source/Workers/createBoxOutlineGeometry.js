/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        '../Core/defined'
    ], function(
        BoxOutlineGeometry,
        defined) {
    'use strict';

    return function(boxGeometry, offset) {
        if (defined(offset)) {
            boxGeometry = BoxOutlineGeometry.unpack(boxGeometry, offset);
        }
        return BoxOutlineGeometry.createGeometry(boxGeometry);
    };
});
