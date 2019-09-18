define([
        '../Core/CoplanarPolygonGeometry',
        '../Core/defined'
    ], function(
        CoplanarPolygonGeometry,
        defined) {
    'use strict';

    function createCoplanarPolygonGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
        }
        return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
    }

    return createCoplanarPolygonGeometry;
});
