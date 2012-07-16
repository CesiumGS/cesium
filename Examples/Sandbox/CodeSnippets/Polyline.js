(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.PolylineTwoPoints = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]));

            primitives.add(polyline);
        };
    };

    Sandbox.PolylineSeveralPoints = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                Cesium.Cartographic.fromDegrees(-77.02, 38.53),  // Washington, D.C.
                Cesium.Cartographic.fromDegrees(-80.50, 35.14),  // Charlotte
                Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]));

            primitives.add(polyline);
        };
    };

    Sandbox.PolylineColor = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]));

            polyline.color = { red : 1.0, green : 1.0, blue : 0.0, alpha : 1.0 };        // Yellow interior
            polyline.outlineColor = { red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 }; // Red outline

            primitives.add(polyline);
        };
    };

    Sandbox.PolylineTranslucency = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]));

            // The color's alpha component defines the polyline's opacity.
            // 0 - completely transparent.  255 - completely opaque.
            polyline.color = { red : polyline.color.red, green : polyline.color.green, blue : polyline.color.blue, alpha : 0.5 };
            polyline.outlineColor = { red : polyline.outlineColor.red, green : polyline.outlineColor.green, blue : polyline.outlineColor.blue, alpha : 0.5 };

            primitives.add(polyline);
        };
    };

    Sandbox.PolylineWidth = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polyline = new Cesium.Polyline(undefined);
            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]));

            polyline.width = 5;          // Request 5 pixels interior
            polyline.outlineWidth = 10;  // Request 10 pixels total

            primitives.add(polyline);
        };
    };

    Sandbox.PolylineReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var center = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883));

            // The arrow points to the east, i.e. along the local x-axis.
            var polyline = new Cesium.Polyline(undefined);
            polyline.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
            polyline.setPositions([
                new Cesium.Cartesian3(0.0, 0.0, 0.0),
                new Cesium.Cartesian3(1000000.0, 0.0, 0.0),
                new Cesium.Cartesian3(900000.0, -100000.0, 0.0),
                new Cesium.Cartesian3(900000.0, 100000.0, 0.0),
                new Cesium.Cartesian3(1000000.0, 0.0, 0.0)
            ]);

            primitives.add(polyline);
        };
    };
}());