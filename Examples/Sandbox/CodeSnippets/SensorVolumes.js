(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    var camera = {
        eye : new Cesium.Cartesian3(10023151.69362372, -13827878.43369639, 9372792.307042792),
        target: new Cesium.Cartesian3(-0.5144998319921075, 0.7098008040195547, -0.4811161413767852),
        up : new Cesium.Cartesian3(-0.2823615303334198, 0.38954423071206706, 0.8766568647462434)
    };

    Sandbox.RectangularPyramidSensorVolume = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addRectangularPyramid({
                modelMatrix : modelMatrix,
                radius : 20000000.0,
                xHalfAngle : Cesium.Math.toRadians(40.0),
                yHalfAngle : Cesium.Math.toRadians(20.0)
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.CustomSensorVolume = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var directions = [];
            for (var i = 0; i < 20; ++i) {
                directions.push({
                    clock : Cesium.Math.toRadians(18.0 * i),
                    cone : Cesium.Math.toRadians(25.0)
                });
            }

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addCustom({
                modelMatrix : modelMatrix,
                radius : 20000000.0,
                directions : directions
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.ConicSensorVolume = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.ConicSensorVolumeClockAngles = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                maximumClockAngle : Cesium.Math.toRadians(45.0),
                minimumClockAngle : Cesium.Math.toRadians(-45.0),
                radius : 20000000.0
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.SensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var sensors = new Cesium.SensorVolumeCollection(undefined);
            primitives.add(sensors);

            var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)));

            var sensor = sensors.addComplexConic({
                modelMatrix: modelMatrix,
                outerHalfAngle: Cesium.Math.toRadians(30.0),
                innerHalfAngle: Cesium.Math.toRadians(20.0),
                radius: 6000000.0
            });

            sensor.outerMaterial.color = {
                red   : 1.0,
                green : 0.0,
                blue  : 1.0,
                alpha : 0.5
            };
            sensor.innerMaterial.color = {
                red : 1.0,
                green : 1.0,
                blue : 0.0,
                alpha : 0.5
            };
            sensor.capMaterial.color = {
                red : 0.0,
                green : 1.0,
                blue : 1.0,
                alpha : 0.5
            };
            sensor.intersectionColor = {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            };
        };

        this.camera = {
            eye : new Cesium.Cartesian3(12668760.917690558, -4162864.676083243, 14201974.580333995),
            target: new Cesium.Cartesian3(-0.650301977156195, 0.21368460160223057, -0.7290035867846191),
            up : new Cesium.Cartesian3(-0.6925721460043828, 0.2275742782559654, 0.6845098760829973)
        };
    };

    Sandbox.StripeSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            // Also try HorizontalStripeMaterial
            var material = new Cesium.HorizontalStripeMaterial(undefined);    // Use default colors

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.DistanceIntervalSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.DistanceIntervalMaterial({
                intervals : [
                    {
                        distance : 1000000.0,
                        color : {
                            red   : 1.0,
                            green : 0.0,
                            blue  : 0.0,
                            alpha : 0.5
                        }
                    },
                    {
                        distance : 10000000.0,
                        color : {
                            red   : 0.0,
                            green : 1.0,
                            blue  : 0.0,
                            alpha : 0.5
                        }
                    },
                    {
                        distance : 20000000.0,
                        color : {
                            red   : 0.0,
                            green : 0.0,
                            blue  : 1.0,
                            alpha : 0.5
                        }
                    }
                ]
            });

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.CheckerboardSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.CheckerboardMaterial({
                lightColor : {
                    red : 1.0,
                    green : 1.0,
                    blue : 0.0,
                    alpha : 0.75
                },
                darkColor : {
                    red : 0.0,
                    green : 1.0,
                    blue : 1.0,
                    alpha : 0.25
                }
            });

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.DotSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.DotMaterial({
                lightColor : {
                    red : 1.0,
                    green : 1.0,
                    blue : 0.0,
                    alpha : 0.75
                },
                darkColor : {
                    red : 0.0,
                    green : 1.0,
                    blue : 1.0,
                    alpha : 0.25
                }
            });

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.TieDyeSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.TieDyeMaterial(undefined);    // Use default colors

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.FacetSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.FacetMaterial(undefined); // Use default colors

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    Sandbox.BlobSensorMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.BlobMaterial(undefined);  // Use default colors

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);
        };

        this.camera = camera;
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.SensorMaterialPerSurface = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var sensors = new Cesium.SensorVolumeCollection(undefined);
            primitives.add(sensors);

            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var lightColor = {
                red : 1.0,
                green : 1.0,
                blue : 0.0,
                alpha : 0.75
            };
            var darkColor = {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.25
            };

            sensors.addComplexConic({
                modelMatrix: modelMatrix,
                outerHalfAngle: Cesium.Math.toRadians(30.0),
                innerHalfAngle: Cesium.Math.toRadians(25.0),
                radius: 20000000.0,
                outerMaterial : new Cesium.TieDyeMaterial({
                    lightColor : lightColor,
                    darkColor : darkColor
                }),
                innerMaterial : new Cesium.DotMaterial({
                    lightColor : lightColor,
                    darkColor : darkColor
                }),
                capMaterial : new Cesium.ColorMaterial({
                    color : {
                        red : 1.0,
                        green : 1.0,
                        blue : 0.0,
                        alpha : 0.75
                }}),
                silhouetteMaterial: new Cesium.ColorMaterial({
                    color: {
                        red: 0.5,
                        green: 0.5,
                        blue: 0.5,
                        alpha: 0.75
                    }
                })
            });
        };

        this.camera = {
            eye : new Cesium.Cartesian3(12668760.917690558, -4162864.676083243, 14201974.580333995),
            target: new Cesium.Cartesian3(-0.650301977156195, 0.21368460160223057, -0.7290035867846191),
            up : new Cesium.Cartesian3(-0.6925721460043828, 0.2275742782559654, 0.6845098760829973)
        };
    };

    ///////////////////////////////////////////////////////////////////////////

    Sandbox.ErosionSensorAnimation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.CheckerboardMaterial(undefined);

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            var sensor = sensors.addComplexConic({
                modelMatrix : modelMatrix,
                outerHalfAngle : Cesium.Math.toRadians(30.0),
                innerHalfAngle : Cesium.Math.toRadians(20.0),
                radius : 20000000.0,
                outerMaterial : material,
                innerMaterial : material,
                capMaterial : material
            });
            primitives.add(sensors);

            scene.getAnimations().addProperty(sensor, 'erosion', 0.0, 1.0);
        };

        this.camera = camera;
    };

    Sandbox.AlphaSensorAnimation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.CheckerboardMaterial(undefined);

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            var sensor = sensors.addRectangularPyramid({
                modelMatrix : modelMatrix,
                radius : 20000000.0,
                xHalfAngle : Cesium.Math.toRadians(40.0),
                yHalfAngle : Cesium.Math.toRadians(20.0),
                material : material
            });
            primitives.add(sensors);

            // Start alpha 0.0.  End alpha 0.7.
            scene.getAnimations().addAlpha(material, 0.0, 0.7); // Animate material colors
            scene.getAnimations().addAlpha(sensor, 0.0, 0.7);   // Animate intersection color
        };

        this.camera = camera;
    };

    Sandbox.AnimateSensorStripes = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.createTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            var material = new Cesium.HorizontalStripeMaterial(undefined);   // Use default colors

            var sensors = new Cesium.SensorVolumeCollection(undefined);
            sensors.addRectangularPyramid({
                modelMatrix : modelMatrix,
                radius : 20000000.0,
                xHalfAngle : Cesium.Math.toRadians(40.0),
                yHalfAngle : Cesium.Math.toRadians(20.0),
                material : material
            });
            primitives.add(sensors);

            scene.getAnimations().addOffsetIncrement(material);
        };

        this.camera = camera;
    };

}());