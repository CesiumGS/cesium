define([
    '../Core/defined',
    '../Core/CoplanarPolygonOutlineGeometry',
    '../Core/Ellipsoid'
], function(
    defined,
    CoplanarPolygonOutlineGeometry,
    Ellipsoid) {
    'use strict';

    function createCoplanarPolygonOutlineGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonOutlineGeometry.unpack(polygonGeometry, offset);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return CoplanarPolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createCoplanarPolygonOutlineGeometry;
});
