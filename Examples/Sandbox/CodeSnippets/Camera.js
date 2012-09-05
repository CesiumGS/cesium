(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.CameraFlyToLosAngeles = function (scene, ellipsoid, primitives) {
        var flight = null;

        this.code = function() {
            flight = scene.getCamera().getControllers().addFlight({
                destination : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-118.26, 34.19, 100000.0)),
                duration : 4.0
            });
        };

        this.camera = {};

        this.clear = function() {
            scene.getCamera().getControllers().remove(flight);

            // set a new camera position, in case this example is clicked consecutively.
            scene.getCamera().lookAt({
                eye : new Cesium.Cartesian3(2203128.2853925996, -7504680.128731707, 5615591.201449535),
                target: Cesium.Cartesian3.ZERO,
                up : new Cesium.Cartesian3(-0.1642824655609347, 0.5596076102188919, 0.8123118822806428)
            });
        };
    };

    Sandbox.CameraReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var center = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883));
            var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

            var spindle = scene.getCamera().getControllers().get(0).spindleController;
            spindle.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
            spindle.setReferenceFrame(transform, Cesium.Ellipsoid.UNIT_SPHERE);

            var polylines = new Cesium.PolylineCollection(undefined);
            polylines.modelMatrix = transform;
            polylines.add({
                positions : [
                    Cesium.Cartesian3.ZERO,
                    Cesium.Cartesian3.UNIT_X.multiplyByScalar(100000.0)
                ],
                width : 2,
                color : {red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 }
            });
            polylines.add({
                positions : [
                    Cesium.Cartesian3.ZERO,
                    Cesium.Cartesian3.UNIT_Y.multiplyByScalar(100000.0)
                ],
                width : 2,
                color : {red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }
            });
            polylines.add({
                positions : [
                    Cesium.Cartesian3.ZERO,
                    Cesium.Cartesian3.UNIT_Z.multiplyByScalar(100000.0)
                ],
                width : 2,
                color : {red : 0.0, green : 0.0, blue : 1.0, alpha : 1.0 }
            });
            primitives.add(polylines);
        };

        this.camera = {
            eye: new Cesium.Cartesian3(1.0, 1.0, 1.0).normalize().multiplyByScalar(200000.0),
            target: Cesium.Cartesian3.ZERO,
            up: Cesium.Cartesian3.UNIT_Z
        };

        this.clear = function() {
            var spindle = scene.getCamera().getControllers().get(0).spindleController;
            spindle.setReferenceFrame(Cesium.Matrix4.IDENTITY);
        };
    };

    Sandbox.ViewExtent = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var west = Cesium.Math.toRadians(-77.0);
            var south = Cesium.Math.toRadians(38.0);
            var east = Cesium.Math.toRadians(-72.0);
            var north = Cesium.Math.toRadians(42.0);

            var extent = new Cesium.Extent(west, south, east, north);
            scene.viewExtent(extent, ellipsoid);

            var polylines = new Cesium.PolylineCollection();
            polylines.add({
                positions: ellipsoid.cartographicArrayToCartesianArray([
                    new Cesium.Cartographic(west, south),
                    new Cesium.Cartographic(west, north),
                    new Cesium.Cartographic(east, north),
                    new Cesium.Cartographic(east, south),
                    new Cesium.Cartographic(west, south)
                ])
            });
            primitives.add(polylines);
        };

        this.clear = function() {
            scene.getCamera().lookAt({
                eye : new Cesium.Cartesian3(2203128.2853925996, -7504680.128731707, 5615591.201449535),
                target: Cesium.Cartesian3.ZERO,
                up : new Cesium.Cartesian3(-0.1642824655609347, 0.5596076102188919, 0.8123118822806428)
            });
        };
    };
}());
