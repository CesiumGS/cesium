(function() {
    "use strict";
    /*global Cesium, Sandbox*/

    Sandbox.OutlineCircle = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicDegreesToCartesian(
                    new Cesium.Cartographic2(-75.59777, 40.03883)), 300000.0));

            primitives.add(polyline);
        };
    };

    Sandbox.FilledCircle = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicDegreesToCartesian(
                    new Cesium.Cartographic2(-75.59777, 40.03883)), 300000.0));

            primitives.add(polygon);
        };
    };

    Sandbox.FilledCircleMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicDegreesToCartesian(
                    new Cesium.Cartographic2(-75.59777, 40.03883)), 300000.0));
            // Any polygon-compatible material can be used
            polygon.material = new Cesium.TieDyeMaterial(undefined);

            primitives.add(polygon);
        };
    };

}());