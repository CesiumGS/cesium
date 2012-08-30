(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.OutlineCircle = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.add({
                positions : Cesium.Shapes.computeCircleBoundary(
                    ellipsoid, ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)), 300000.0)
            });

            primitives.add(polylines);
        };
    };

    Sandbox.FilledCircle = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicToCartesian(
                        Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)), 300000.0));

            primitives.add(polygon);
        };
    };

    Sandbox.FilledCircleMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicToCartesian(
                        Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)), 300000.0));
            // Any polygon-compatible material can be used
            polygon.material = Cesium.Material.fromType(scene.getContext(), 'TieDye');

            primitives.add(polygon);
        };
    };

    Sandbox.FilledEllipse = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeEllipseBoundary(
                ellipsoid, ellipsoid.cartographicToCartesian(
                        Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)), 500000.0, 300000.0, Cesium.Math.toRadians(60)));

            primitives.add(polygon);
        };
    };

}());