(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.Label = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var labels = new Cesium.LabelCollection(undefined);
            labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)),
                text     : 'Philadelphia'
            });

            primitives.add(labels);
        };
    };

    Sandbox.Labels = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var labels = new Cesium.LabelCollection(undefined);
            labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)),
                text     : 'Philadelphia'
            });
            labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-80.50, 35.14)),
                text     : 'Charlotte'
            });
            labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-80.12, 25.46)),
                text     : 'Miami'
            });

            primitives.add(labels);
        };
    };

    Sandbox.LabelFont = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var labels = new Cesium.LabelCollection(undefined);
            labels.add({
                position  : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)),
                text      : 'Philadelphia',
                // CSS font-family
                font      : '36px Helvetica',
                fillColor : { red : 0.0, blue : 1.0, green : 1.0, alpha : 1.0 },
                outlineColor : { red : 0.0, blue : 0.0, green : 0.0, alpha : 1.0 },
                style : Cesium.LabelStyle.FILL_AND_OUTLINE
            });

            primitives.add(labels);
        };
    };

    Sandbox.LabelProperties = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var labels = new Cesium.LabelCollection(undefined);
            var l = labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)),
                text     : 'Philadelphia'
            });

            l.setPosition(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57, 300000.0)));
            l.setScale(2.0);

            primitives.add(labels);
        };
    };

    Sandbox.LabelReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var center = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883));

            var labels = new Cesium.LabelCollection(undefined);
            labels.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
            labels.add({
                position : new Cesium.Cartesian3(0.0, 0.0, 0.0),
                text     : 'Center'
            });
            labels.add({
                position : new Cesium.Cartesian3(1000000.0, 0.0, 0.0),
                text     : 'East'
            });
            labels.add({
                position : new Cesium.Cartesian3(0.0, 1000000.0, 0.0),
                text     : 'North'
            });
            labels.add({
                position : new Cesium.Cartesian3(0.0, 0.0, 1000000.0),
                text     : 'Up'
            });

            primitives.add(labels);
        };
    };
}());
