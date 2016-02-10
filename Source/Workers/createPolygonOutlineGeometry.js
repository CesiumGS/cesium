/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolygonOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolygonOutlineGeometry) {
    'use strict';

    function createPolygonOutlineGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = PolygonOutlineGeometry.unpack(polygonGeometry, offset);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonOutlineGeometry;
});
