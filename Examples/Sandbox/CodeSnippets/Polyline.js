(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.PolylineTwoPoints = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ])});
            primitives.add(polylines);
        };
    };

    Sandbox.PolylineSeveralPoints = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-77.02, 38.53),  // Washington, D.C.
                new Cesium.Cartographic.fromDegrees(-80.50, 35.14),  // Charlotte
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ])});

            primitives.add(polylines);
        };
    };

    Sandbox.MultiplePolylineSeveralPoints = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-77.02, 38.53),  // Washington, D.C.
                new Cesium.Cartographic.fromDegrees(-80.50, 35.14),  // Charlotte
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ]),
            width:2});

            polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-73.10, 37.57),
                new Cesium.Cartographic.fromDegrees(-75.02, 36.53),
                new Cesium.Cartographic.fromDegrees(-78.50, 33.14),
                new Cesium.Cartographic.fromDegrees(-78.12, 23.46)
            ]),
            width:4,
            color:{
                red:1.0,
                green:0.0,
                blue:0.0,
                alpha:1.0
            }});

            primitives.add(polylines);
        };
    };

    Sandbox.PolylineColor = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            var polyline = polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ])});

            polyline.setColor( { red : 1.0, green : 1.0, blue : 0.0, alpha : 1.0 });        // Yellow interior
            polyline.setOutlineColor({ red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 }); // Red outline

            primitives.add(polylines);
        };
    };

    Sandbox.PolylineTranslucency = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            var polyline = polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
            ])});

            var color = polyline.getColor();
            var outlineColor = polyline.getOutlineColor();
            // The color's alpha component defines the polyline's opacity.
            // 0 - completely transparent.  255 - completely opaque.
            polyline.setColor({ red : color.red, green : color.green, blue : color.blue, alpha : 0.5 });
            polyline.setOutlineColor({ red : outlineColor.red, green : outlineColor.green, blue : outlineColor.blue, alpha : 0.5 });

            primitives.add(polylines);
        };
    };

    Sandbox.PolylineWidth = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polylines = new Cesium.PolylineCollection(undefined);
            var polyline = polylines.add({
                positions : ellipsoid.cartographicArrayToCartesianArray([
                new Cesium.Cartographic.fromDegrees(-75.10, 39.57),  // Philadelphia
                new Cesium.Cartographic.fromDegrees(-80.12, 25.46)   // Miami
                ]),
                color : {
                    red : 1.0,
                    green : 0.0,
                    blue : 0.0,
                    alpha : 1.0
                }
            });

            polyline.setWidth(5); // Request 5 pixels interior
            polyline.setOutlineWidth(10); // Request 10 pixels total

            primitives.add(polylines);
        };
    };

    Sandbox.PolylineReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var center = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883));

            // The arrow points to the east, i.e. along the local x-axis.
            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
            polylines.add({positions:[
                new Cesium.Cartesian3(0.0, 0.0, 0.0),
                new Cesium.Cartesian3(1000000.0, 0.0, 0.0),
                new Cesium.Cartesian3(900000.0, -100000.0, 0.0),
                new Cesium.Cartesian3(900000.0, 100000.0, 0.0),
                new Cesium.Cartesian3(1000000.0, 0.0, 0.0)
            ]});

            primitives.add(polylines);
        };
    };
}());