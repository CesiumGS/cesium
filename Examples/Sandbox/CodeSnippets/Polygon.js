(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.Polygon = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-72.0, 40.0),
                Cesium.Cartographic.fromDegrees(-70.0, 35.0),
                Cesium.Cartographic.fromDegrees(-75.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-68.0, 40.0)
            ]));

            primitives.add(polygon);
        };
    };

    Sandbox.PolygonWithExtent = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(50.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)
            ));

            primitives.add(polygon);
        };
    };

    Sandbox.NestedPolygon = function(scene, ellipsoid, primitives) {
        this.code = function () {
            var hierarchy = {
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        new Cesium.Cartographic.fromDegrees(-109.0, 35.0, 0.0),
                        new Cesium.Cartographic.fromDegrees(-95.0, 35.0, 0.0),
                        new Cesium.Cartographic.fromDegrees(-95.0, 40.0, 0.0),
                        new Cesium.Cartographic.fromDegrees(-109.0, 40.0, 0.0)
                    ]),
                    holes : [{
                                positions : ellipsoid.cartographicArrayToCartesianArray([
                                    new Cesium.Cartographic.fromDegrees(-107.0, 36.0, 0.0),
                                    new Cesium.Cartographic.fromDegrees(-107.0, 39.0, 0.0),
                                    new Cesium.Cartographic.fromDegrees(-97.0, 39.0, 0.0),
                                    new Cesium.Cartographic.fromDegrees(-97.0, 36.0, 0.0)
                                ]),
                                holes : [{
                                            positions : ellipsoid.cartographicArrayToCartesianArray([
                                                new Cesium.Cartographic.fromDegrees(-105.0, 36.5, 0.0),
                                                new Cesium.Cartographic.fromDegrees(-99.0, 36.5, 0.0),
                                                new Cesium.Cartographic.fromDegrees(-99.0, 38.5, 0.0),
                                                new Cesium.Cartographic.fromDegrees(-105.0, 38.5, 0.0)
                                            ]),
                                            holes : [{
                                                        positions : ellipsoid.cartographicArrayToCartesianArray([
                                                            new Cesium.Cartographic.fromDegrees(-103.0, 37.25, 0.0),
                                                            new Cesium.Cartographic.fromDegrees(-101.0, 37.25, 0.0),
                                                            new Cesium.Cartographic.fromDegrees(-101.0, 37.75, 0.0),
                                                            new Cesium.Cartographic.fromDegrees(-103.0, 37.75, 0.0)
                                                        ])
                                            }]
                                }]
                    }]
            };
            var polygon = new Cesium.Polygon();
            polygon.configureFromPolygonHierarchy(hierarchy);
            primitives.add(polygon);

        };

        this.camera = {
            eye : new Cesium.Cartesian3(-1280476.6605044599, -6108296.327862781, 4770090.478198281),
            target : new Cesium.Cartesian3(0.16300940344701773, 0.7776086602705017, -0.6072501180404701),
            up : new Cesium.Cartesian3(0.12458922984093211, 0.5943317505129697, 0.7945107262585154)
        };
    };

    Sandbox.PolygonColor = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-72.0, 40.0),
                Cesium.Cartographic.fromDegrees(-70.0, 35.0),
                Cesium.Cartographic.fromDegrees(-75.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-68.0, 40.0)
            ]));

            // The color's alpha component defines the polygon's opacity.
            // 0 - completely transparent.  1.0 - completely opaque.
            polygon.material.color = {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.75
            };

            primitives.add(polygon);
        };
    };

    Sandbox.StripePolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.VerticalStripeMaterial({
                repeat : 5.0
            });

            primitives.add(polygon);
        };
    };

    Sandbox.CheckerboardPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.CheckerboardMaterial({
                lightColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 0.0,
                    alpha: 0.75
                },
                darkColor: {
                    red: 0.0,
                    green: 1.0,
                    blue: 1.0,
                    alpha: 0.75
                },
                sRepeat : 5,
                tRepeat : 5
            });

            primitives.add(polygon);
        };
    };

    Sandbox.DotPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.DotMaterial({
                lightColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 0.0,
                    alpha: 0.75
                },
                darkColor: {
                    red: 0.0,
                    green: 1.0,
                    blue: 1.0,
                    alpha: 0.75
                },
                sRepeat : 5,
                tRepeat : 5
            });

            primitives.add(polygon);
        };
    };

    Sandbox.DiffuseMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-80.0, 33.0)
            ]));

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.DiffuseMapMaterial({
                    texture : scene.getContext().createTexture2D({
                            source : image,
                            pixelFormat : Cesium.PixelFormat.RGB
                    }),
                    sRepeat : 1,
                    tRepeat : 1
                });
            };
            image.src = '../../Images/Cesium_Logo_Color.jpg';

            primitives.add(polygon);
        };
    };

    Sandbox.TieDyePolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.TieDyeMaterial({
                lightColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 0.0,
                    alpha: 0.75
                },
                darkColor: {
                    red: 1.0,
                    green: 0.0,
                    blue: 0.0,
                    alpha: 0.75
                },
                frequency : (1.0 / 5.0)
            });

            primitives.add(polygon);
        };
    };

    Sandbox.FacetPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.FacetMaterial({
                lightColor: {
                    red: 0.25,
                    green: 0.25,
                    blue: 0.25,
                    alpha: 0.75
                },
                darkColor: {
                    red: 0.75,
                    green: 0.75,
                    blue: 0.75,
                    alpha: 0.75
                },
                repeat : 10.0
            });

            primitives.add(polygon);
        };
    };

    Sandbox.BlobPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.BlobMaterial({
                repeat : 10.0
            });

            primitives.add(polygon);
        };
    };

    Sandbox.ErosionPolygonAnimation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.CheckerboardMaterial({
                sRepeat : 5,
                tRepeat : 5
            });
            primitives.add(polygon);

            scene.getAnimations().addProperty(polygon, 'erosion', 0.0, 1.0);
        };
    };

    Sandbox.AlphaPolygonAnimation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.CheckerboardMaterial({
                sRepeat : 5,
                tRepeat : 5
            });
            primitives.add(polygon);

            scene.getAnimations().addAlpha(polygon.material, 0.0, 0.7);
        };
    };

    Sandbox.HeightPolygonAnimation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.CheckerboardMaterial({
                sRepeat : 5,
                tRepeat : 5
            });
            primitives.add(polygon);

            scene.getAnimations().addProperty(polygon, 'height', 2000000.0, 0.0);
        };
    };

}());