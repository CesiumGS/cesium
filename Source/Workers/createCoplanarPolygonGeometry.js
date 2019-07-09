define([
    '../Core/defined',
    '../Core/CoplanarPolygonGeometry'
], function(
    defined,
    CoplanarPolygonGeometry) {
    'use strict';

    function createCoplanarPolygonGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
        }
        return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
    }

    return createCoplanarPolygonGeometry;
});
