/*global define*/
define([
        '../Core/defined',
        '../Core/EllipsoidOutlineGeometry'
    ], function(
        defined,
        EllipsoidOutlineGeometry) {
    'use strict';

    return function(ellipsoidGeometry, offset) {
        if (defined(ellipsoidGeometry.buffer, offset)) {
            ellipsoidGeometry = EllipsoidOutlineGeometry.unpack(ellipsoidGeometry, offset);
        }
        return EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
    };
});
