define([
    '../Core/defined',
    '../Core/CoplanarPolygonOutlineGeometry'
], function(
    defined,
    CoplanarPolygonOutlineGeometry) {
    'use strict';

    function createCoplanarPolygonOutlineGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonOutlineGeometry.unpack(polygonGeometry, offset);
        }
        return CoplanarPolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createCoplanarPolygonOutlineGeometry;
});
