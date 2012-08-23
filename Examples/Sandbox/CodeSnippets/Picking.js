(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.PickingCartographicMouseOver = function (scene, ellipsoid, primitives) {
        var handler;
        var label;

        this.code = function () {
            // Mouse over the globe to see the cartographic position
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(function(movement) {
                var cartesian = scene.pickEllipsoid(movement.endPosition, ellipsoid);
                if (cartesian) {
                    var cartographic = ellipsoid.cartesianToCartographic(cartesian);
                    label.setShow(true);
                    label.setText('(' + Cesium.Math.toDegrees(cartographic.longitude).toFixed(2) + ', ' + Cesium.Math.toDegrees(cartographic.latitude).toFixed(2) + ')');
                    label.setPosition(cartesian);
                } else {
                    label.setText('');
                }
            }, Cesium.MouseEventType.MOVE);

            // Setup code
            var labels = new Cesium.LabelCollection(undefined);
            label = labels.add();
            primitives.add(labels);
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

    Sandbox.PickingBillboardMouseOver = function (scene, ellipsoid, primitives) {
        var handler;

        this.code = function () {
            var billboard;

            // If the mouse is over the billboard, change its scale and color
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(
                function (movement) {
                    var pickedObject = scene.pick(movement.endPosition);
                    if (pickedObject === billboard) {
                        billboard.setScale(2.0);
                        billboard.setColor({ red : 1.0, green : 1.0, blue : 0.0, alpha : 1.0 });
                    }
                    else if (billboard) {
                        billboard.setScale(1.0);
                        billboard.setColor({ red : 1.0, green : 1.0, blue : 1.0, alpha : 1.0 });
                    }
                },
                Cesium.MouseEventType.MOVE
            );

            // Setup code
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                var textureAtlas = scene.getContext().createTextureAtlas({image : image});
                billboards.setTextureAtlas(textureAtlas);
                billboard = billboards.add({
                    position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)),
                    imageIndex : 0
                });
                primitives.add(billboards);
            };
            image.src = 'Images/Cesium_Logo_overlay.png';
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

    Sandbox.PickingPolylineMouseOver = function (scene, ellipsoid, primitives) {
        var handler;

        this.code = function () {
            var polyline1;
            var polyline2;

            // If the mouse is over the polyline, change its width, outlineWidth and color
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(

            function(movement) {
                var pickedObject = scene.pick(movement.endPosition);
                if (pickedObject === polyline1) {
                    polyline1.setColor({
                        red: 1.0,
                        green: 1.0,
                        blue: 0.0,
                        alpha: 1.0
                    });
                    polyline1.setWidth(3);
                    polyline1.setOutlineWidth(2);
                } else if (pickedObject === polyline2) {
                    polyline2.setColor({
                        red: 1.0,
                        green: 0.0,
                        blue: 1.0,
                        alpha: 1.0
                    });
                    polyline2.setOutlineWidth(2);
                } else {
                    polyline1.setColor({
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0,
                        alpha: 1.0
                    });
                    polyline1.setWidth(1);
                    polyline1.setOutlineWidth(0);
                    polyline2.setColor({
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0,
                        alpha: 1.0
                    });
                    polyline2.setOutlineWidth(0);
                }
            }, Cesium.MouseEventType.MOVE);

            // Setup code
            var polylines = new Cesium.PolylineCollection(undefined);

            polyline1 = polylines.add({
                positions: ellipsoid.cartographicArrayToCartesianArray([
                                                                        new Cesium.Cartographic.fromDegrees(-75.10, 39.57),
                                                                        new Cesium.Cartographic.fromDegrees(-77.02, 38.53),
                                                                        new Cesium.Cartographic.fromDegrees(-80.50, 35.14),
                                                                        new Cesium.Cartographic.fromDegrees(-80.12, 25.46)
                                                                        ])
            });
            polyline2 = polylines.add({
                positions: ellipsoid.cartographicArrayToCartesianArray([
                                                                        new Cesium.Cartographic.fromDegrees(-73.10, 37.57),
                                                                        new Cesium.Cartographic.fromDegrees(-75.02, 36.53),
                                                                        new Cesium.Cartographic.fromDegrees(-78.50, 33.14),
                                                                        new Cesium.Cartographic.fromDegrees(-78.12, 23.46)
                                                                        ])
            });
            primitives.add(polylines);
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

    Sandbox.PickingBillboardAnimationMouseOver = function (scene, ellipsoid, primitives) {
        var handler;

        this.code = function () {
            var billboard;
            var animation;

            function update(value) {
                billboard.setScale(value.scale);
                billboard.setColor({ red : value.red, blue : value.blue, green : value.green, alpha : value.alpha });
            }

            function complete() {
                animation = undefined;
                billboard.highlighted = !billboard.highlighted;
            }

            // If the mouse is over the billboard, change its scale and color
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(
                function (movement) {
                    if (billboard) {
                        var pickedObject = scene.pick(movement.endPosition);
                        if ((pickedObject === billboard) && !billboard.highlighted) {
                            // on enter
                            animation = animation || scene.getAnimations().add({
                                onUpdate : update,
                                onComplete : complete,
                                startValue : {
                                    scale : billboard.getScale(),
                                    red   : billboard.getColor().red,
                                    green : billboard.getColor().green,
                                    blue  : billboard.getColor().blue,
                                    alpha : billboard.getColor().alpha
                                },
                                stopValue : {
                                    scale : 2.0,
                                    red   : 1.0,
                                    green : 1.0,
                                    blue  : 0.0,
                                    alpha : 1.0
                                },
                                duration : 500,
                                easingFunction : Cesium.Tween.Easing.Quartic.EaseOut
                            });
                        }
                        else if ((pickedObject !== billboard) && billboard.highlighted) {
                            // on exit
                            animation = animation || scene.getAnimations().add({
                                onUpdate : update,
                                onComplete : complete,
                                startValue : {
                                    scale : billboard.getScale(),
                                    red   : billboard.getColor().red,
                                    green : billboard.getColor().green,
                                    blue  : billboard.getColor().blue,
                                    alpha : billboard.getColor().alpha
                                },
                                stopValue : {
                                    scale : 1.0,
                                    red   : 1.0,
                                    green : 1.0,
                                    blue  : 1.0,
                                    alpha : 1.0
                                },
                                duration : 500,
                                easingFunction : Cesium.Tween.Easing.Quartic.EaseOut
                            });
                        }
                    }
                },
                Cesium.MouseEventType.MOVE
            );

            // Setup code
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                var textureAtlas = scene.getContext().createTextureAtlas({image : image});
                billboards.setTextureAtlas(textureAtlas);
                billboard = billboards.add({
                    position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)),
                    imageIndex : 0
                });
                billboard.highlighted = true;
                primitives.add(billboards);
            };
            image.src = 'Images/Cesium_Logo_overlay.png';
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

    Sandbox.PickingPolygonAnimationMouseOver = function (scene, ellipsoid, primitives) {
        var handler;

        this.code = function () {
            var polygon;
            var animation;

            var outside = {
                lightColorRed : 0.25,
                lightColorGreen : 0.5,
                lightColorBlue : 0.0,
                lightColorAlpha : 0.25,
                darkColorRed : 0.2,
                darkColorGreen : 0.2,
                darkColorBlue : 0.2,
                darkColorAlpha : 0.25
            };

            var inside = {
                lightColorRed : 0.5,
                lightColorGreen : 1.0,
                lightColorBlue : 0.0,
                lightColorAlpha : 0.85,
                darkColorRed : 0.6,
                darkColorGreen : 0.6,
                darkColorBlue : 0.6,
                darkColorAlpha : 0.85
            };

            function update(value) {
                polygon.material.uniforms.lightColor = {
                    red : value.lightColorRed,
                    green : value.lightColorGreen,
                    blue : value.lightColorBlue,
                    alpha : value.lightColorAlpha
                };
                polygon.material.uniforms.darkColor = {
                    red : value.darkColorRed,
                    green : value.darkColorGreen,
                    blue : value.darkColorBlue,
                    alpha : value.darkColorAlpha
                };
            }

            function complete() {
                animation = undefined;
                polygon.highlighted = !polygon.highlighted;
            }

            // If the mouse is over the polygon, start the animation to highlight it.
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(
                function (movement) {
                    if (polygon) {
                        var pickedObject = scene.pick(movement.endPosition);
                        if ((pickedObject === polygon) && !polygon.highlighted) {
                            // on enter
                            animation = animation || scene.getAnimations().add({
                                onUpdate : update,
                                onComplete : complete,
                                startValue : outside,
                                stopValue : inside,
                                duration : 1000,
                                easingFunction : Cesium.Tween.Easing.Quartic.EaseOut
                            });
                        }
                        else if ((pickedObject !== polygon) && polygon.highlighted) {
                            // on exit
                            animation = animation || scene.getAnimations().add({
                                onUpdate : update,
                                onComplete : complete,
                                startValue : inside,
                                stopValue : outside,
                                duration : 1000,
                                easingFunction : Cesium.Tween.Easing.Quartic.EaseOut
                            });
                        }
                    }
                },
                Cesium.MouseEventType.MOVE
            );

            // Setup code
            polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(Cesium.Shapes.computeCircleBoundary(
                ellipsoid, ellipsoid.cartographicToCartesian(
                        Cesium.Cartographic.fromDegrees(-75.59777, 40.03883)), 800000.0));
            polygon.material = Cesium.Material.fromType(scene.getContext(), 'Checkerboard');
            polygon.material.uniforms.lightColor = {
                red : outside.lightColorRed,
                green : outside.lightColorGreen,
                blue : outside.lightColorBlue,
                alpha : outside.lightColorAlpha
            };
            polygon.material.uniforms.darkColor = {
                red : outside.darkColorRed,
                green : outside.darkColorGreen,
                blue : outside.darkColorBlue,
                alpha : outside.darkColorAlpha
            };

            primitives.add(polygon);
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

    Sandbox.PickingErodeSensorDoubleClick = function (scene, ellipsoid, primitives) {
        var handler;

        this.code = function () {
            var sensors;
            var sensor;
            var eroding = false;

            // If the mouse is over the sensor, change start the erosion animation.
            handler = new Cesium.EventHandler(scene.getCanvas());
            handler.setMouseAction(
                function (movement) {
                    var pickedObject = scene.pick(movement.position);
                    if (!eroding && (pickedObject === sensor)) {
                        // Prevent multiple erosions
                        eroding = true;

                        scene.getAnimations().addProperty(sensor, 'erosion', 1.0, 0.0, {
                            onComplete : function() {
                                sensors.remove(sensor);
                            }
                        });
                    }
                },
                Cesium.MouseEventType.LEFT_DOUBLE_CLICK
            );

            // Setup code
            var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
            modelMatrix = modelMatrix.multiply(Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

            sensors = new Cesium.SensorVolumeCollection(undefined);
            sensor = sensors.addRectangularPyramid({
                modelMatrix : modelMatrix,
                radius : 20000000.0,
                xHalfAngle : Cesium.Math.toRadians(40.0),
                yHalfAngle : Cesium.Math.toRadians(20.0)
            });

            primitives.add(sensors);
        };

        this.camera = {
            eye : new Cesium.Cartesian3(10023151.69362372, -13827878.43369639, 9372792.307042792),
            target: new Cesium.Cartesian3(-0.5144998319921075, 0.7098008040195547, -0.4811161413767852),
            up : new Cesium.Cartesian3(-0.2823615303334198, 0.38954423071206706, 0.8766568647462434)
        };

        this.clear = function () {
            handler = handler && handler.destroy();
        };
    };

}());
