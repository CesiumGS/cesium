define([
        '../Core/BoxGeometry',
        '../Core/defined'
    ], function(
        BoxGeometry,
        defined) {
    'use strict';

    return function(boxGeometry, offset) {
        if (defined(offset)) {
            boxGeometry = BoxGeometry.unpack(boxGeometry, offset);
        }
        return BoxGeometry.createGeometry(boxGeometry);
    };
});
