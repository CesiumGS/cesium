/*global define*/
define([
        '../Core/defined',
        '../Core/EllipsoidGeometry'
    ], function(
        defined,
        EllipsoidGeometry) {
    'use strict';

    return function(ellipsoidGeometry, offset) {
        if (defined(offset)) {
            ellipsoidGeometry = EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
        }
        return EllipsoidGeometry.createGeometry(ellipsoidGeometry);
    };
});
