(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.Polygon = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-72.0, 40.0),
                new Cesium.Cartographic2(-70.0, 35.0),
                new Cesium.Cartographic2(-75.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-68.0, 40.0)
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

    Sandbox.PolygonColor = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-72.0, 40.0),
                new Cesium.Cartographic2(-70.0, 35.0),
                new Cesium.Cartographic2(-75.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-68.0, 40.0)
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

    Sandbox.CompositeMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 33.0),
                new Cesium.Cartographic2(-80.0, 33.0)
            ]));
            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            //Load cube map images at once
            var imageFolder = '../../Images/';
            var cubeMapFolder = imageFolder + 'PalmTreesCubeMap/';
            var cubeMapFileExtension = '.jpg';
            var diffuseMapFilePath = imageFolder + 'Cesium_Logo_Color.jpg';
            var blendMapFilePath = imageFolder + 'alpha_map.png';
            Cesium.Chain.run(
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posz' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negz' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(diffuseMapFilePath),
                Cesium.Jobs.downloadImage(blendMapFilePath)
            ).thenRun(
            function() {
                var cubeMap = scene.getContext().createCubeMap({
                    source : {
                        positiveX : this.images[cubeMapFolder + 'posx' + cubeMapFileExtension],
                        negativeX : this.images[cubeMapFolder + 'negx' + cubeMapFileExtension],
                        positiveY : this.images[cubeMapFolder + 'negy' + cubeMapFileExtension],
                        negativeY : this.images[cubeMapFolder + 'posy' + cubeMapFileExtension],
                        positiveZ : this.images[cubeMapFolder + 'posz' + cubeMapFileExtension],
                        negativeZ : this.images[cubeMapFolder + 'negz' + cubeMapFileExtension]
                    },
                    pixelFormat : Cesium.PixelFormat.RGB
                });
                var diffuseMapTexture = scene.getContext().createTexture2D({
                    source : this.images[diffuseMapFilePath]
                });
                var blendMapTexture = scene.getContext().createTexture2D({
                    source : this.images[blendMapFilePath]
                });
                polygon.material = new Cesium.CompositeMaterial({
                    'materials' : [{
                        'id' : 'reflectionMap',
                        'type' : 'ReflectionMaterial',
                        'cubeMap' : cubeMap,
                        'reflectivity' : 1.0,
                        'channels' : 'RGB'
                    },
                    {
                        'id' : 'diffuseMap',
                        'type' : 'DiffuseMapMaterial',
                        'texture' : diffuseMapTexture,
                        'channels' : 'RGB'
                    },
                    {
                        'id' : 'blender',
                        'type' : 'BlendMap',
                        'texture' : blendMapTexture,
                        'channels' : 'R'
                    }],
                    'components' : {
                        'diffuse' : 'mix(reflectionMap, diffuseMap, blender)',
                        'alpha' : 'blender'
                    }
                });
                primitives.add(polygon);
            });
        };
    };

    Sandbox.DiffuseMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 33.0),
                new Cesium.Cartographic2(-80.0, 33.0)
            ]));
            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.DiffuseMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.RGBA
                    })
                });
            };
            image.src = '../../Images/Cesium_Logo_Color.jpg';

            primitives.add(polygon);
        };
    };

    Sandbox.AlphaMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 27.0),
                new Cesium.Cartographic2(-70.0, 27.0),
                new Cesium.Cartographic2(-70.0, 36.0),
                new Cesium.Cartographic2(-80.0, 36.0)
            ]));
            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.AlphaMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.LUMINANCE
                    })
                });
            };
            image.src = '../../Images/alpha_map.png';

            primitives.add(polygon);
        };
    };

    Sandbox.SpecularMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 27.0),
                new Cesium.Cartographic2(-70.0, 27.0),
                new Cesium.Cartographic2(-70.0, 36.0),
                new Cesium.Cartographic2(-80.0, 36.0)
            ]));
            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.SpecularMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.LUMINANCE
                    })
                });
            };
            image.src = '../../Images/alpha_map.png';

            primitives.add(polygon);
        };
    };

    Sandbox.EmissionMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 27.0),
                new Cesium.Cartographic2(-70.0, 27.0),
                new Cesium.Cartographic2(-70.0, 36.0),
                new Cesium.Cartographic2(-80.0, 36.0)
            ]));
            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.EmissionMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.LUMINANCE
                    })
                });
            };
            image.src = '../../Images/alpha_map.png';

            primitives.add(polygon);
        };
    };

    Sandbox.BumpMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 36.0),
                new Cesium.Cartographic2(-80.0, 36.0)
            ]));
            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.BumpMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.LUMINANCE
                    })
                });
            };
            image.src = '../../Images/earthbump1k.jpg';

            primitives.add(polygon);
        };
    };

    Sandbox.NormalMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 36.0),
                new Cesium.Cartographic2(-80.0, 36.0)
            ]));
            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            var image = new Image();
            image.onload = function() {
                polygon.material = new Cesium.NormalMapMaterial({
                    texture : scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : Cesium.PixelFormat.RGB
                    })
                });
            };
            image.src = '../../Images/earthnormalmap.jpg';

            primitives.add(polygon);
        };
    };

    Sandbox.ReflectionPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                    Cesium.Math.toRadians(-180.0), Cesium.Math.toRadians(-90.0), Cesium.Math.toRadians(180.0), Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            //Load cube map images at once
            var imageFolder = '../../Images/';
            var cubeMapFolder = imageFolder + 'PalmTreesCubeMap/';
            var cubeMapFileExtension = '.jpg';
            Cesium.Chain.run(
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posz' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negz' + cubeMapFileExtension)
            ).thenRun(
            function() {
                polygon.material = new Cesium.ReflectionMaterial({
                    cubeMap : scene.getContext().createCubeMap({
                        source : {
                            positiveX : this.images[cubeMapFolder + 'posx' + cubeMapFileExtension],
                            negativeX : this.images[cubeMapFolder + 'negx' + cubeMapFileExtension],
                            positiveY : this.images[cubeMapFolder + 'negy' + cubeMapFileExtension],
                            negativeY : this.images[cubeMapFolder + 'posy' + cubeMapFileExtension],
                            positiveZ : this.images[cubeMapFolder + 'posz' + cubeMapFileExtension],
                            negativeZ : this.images[cubeMapFolder + 'negz' + cubeMapFileExtension]
                        },
                        pixelFormat : Cesium.PixelFormat.RGB
                    }),
                    reflectivity : 1.0
                });
                primitives.add(polygon);
            });
        };
    };

    Sandbox.RefractionPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                    Cesium.Math.toRadians(-180.0), Cesium.Math.toRadians(-90.0), Cesium.Math.toRadians(180.0), Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            //Load cube map images at once
            var imageFolder = '../../Images/';
            var cubeMapFolder = imageFolder + 'PalmTreesCubeMap/';
            var cubeMapFileExtension = '.jpg';
            Cesium.Chain.run(
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posz' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negz' + cubeMapFileExtension)
            ).thenRun(
            function() {
                polygon.material = new Cesium.RefractionMaterial({
                    cubeMap : scene.getContext().createCubeMap({
                        source : {
                            positiveX : this.images[cubeMapFolder + 'posx' + cubeMapFileExtension],
                            negativeX : this.images[cubeMapFolder + 'negx' + cubeMapFileExtension],
                            positiveY : this.images[cubeMapFolder + 'negy' + cubeMapFileExtension],
                            negativeY : this.images[cubeMapFolder + 'posy' + cubeMapFileExtension],
                            positiveZ : this.images[cubeMapFolder + 'posz' + cubeMapFileExtension],
                            negativeZ : this.images[cubeMapFolder + 'negz' + cubeMapFileExtension]
                        },
                        pixelFormat : Cesium.PixelFormat.RGB
                    }),
                    indexOfRefractionRatio : (1.0 / 1.1),
                    refractivity : 1.0
                });
                primitives.add(polygon);
            });
        };
    };

    Sandbox.FresnelPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                    Cesium.Math.toRadians(-180.0), Cesium.Math.toRadians(-90.0), Cesium.Math.toRadians(180.0), Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 0.0,
                green: 0.0,
                blue: 0.0,
                alpha: 1.0
            };

            //Load cube map images at once
            var imageFolder = '../../Images/';
            var cubeMapFolder = imageFolder + 'PalmTreesCubeMap/';
            var cubeMapFileExtension = '.jpg';
            Cesium.Chain.run(
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negx' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negy' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'posz' + cubeMapFileExtension),
                Cesium.Jobs.downloadImage(cubeMapFolder + 'negz' + cubeMapFileExtension)
            ).thenRun(
            function() {
                polygon.material = new Cesium.FresnelMaterial({
                    cubeMap : scene.getContext().createCubeMap({
                        source : {
                            positiveX : this.images[cubeMapFolder + 'posx' + cubeMapFileExtension],
                            negativeX : this.images[cubeMapFolder + 'negx' + cubeMapFileExtension],
                            positiveY : this.images[cubeMapFolder + 'negy' + cubeMapFileExtension],
                            negativeY : this.images[cubeMapFolder + 'posy' + cubeMapFileExtension],
                            positiveZ : this.images[cubeMapFolder + 'posz' + cubeMapFileExtension],
                            negativeZ : this.images[cubeMapFolder + 'negz' + cubeMapFileExtension]
                        },
                        pixelFormat : Cesium.PixelFormat.RGB
                    }),
                    indexOfRefractionRatio : (1.0 / 1.1),
                    diffuseAmount : 0.0
                });
                primitives.add(polygon);
            });
        };
    };

    Sandbox.BrickPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.BrickMaterial({
                brickColor : {
                    red: 0.6,
                    green: 0.3,
                    blue: 0.1,
                    alpha: 1.0
                },
                mortarColor : {
                    red : 0.8,
                    green : 0.8,
                    blue : 0.7,
                    alpha : 1.0
                },
                brickSize : {
                    x : 0.30,
                    y : 0.15
                },
                brickPct : {
                    x : 0.90,
                    y : 0.85
                },
                brickRoughness : 0.2,
                mortarRoughness : 0.1
            });

            primitives.add(polygon);
        };
    };

    Sandbox.WoodPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.WoodMaterial({
                lightWoodColor : {
                    red : 0.6,
                    green : 0.3,
                    blue : 0.1,
                    alpha : 1.0
                },
                darkWoodColor : {
                    red : 0.4,
                    green : 0.2,
                    blue : 0.07,
                    alpha : 1.0
                },
                ringFrequency : 3.0,
                noiseScale : {
                    x : 0.7,
                    y : 0.5
                },
                grainFrequency : 27.0
            });

            primitives.add(polygon);
        };
    };
    Sandbox.AsphaltPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
            ]));
            polygon.material = new Cesium.AsphaltMaterial({
                asphaltColor : {
                    red : 0.15,
                    green : 0.15,
                    blue : 0.15,
                    alpha : 1.0
                },
                bumpSize : 0.02,
                roughness : 0.2
            });

            primitives.add(polygon);
        };
    };
    Sandbox.CementPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.CementMaterial({
                cementColor : {
                    red : 0.95,
                    green : 0.95,
                    blue : 0.85,
                    alpha : 1.0
                },
                grainScale : 0.01,
                roughness : 0.3
            });

            primitives.add(polygon);
        };
    };
    Sandbox.GrassPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.GrassMaterial({
                grassColor : {
                    red : 0.25,
                    green : 0.4,
                    blue : 0.1,
                    alpha : 1.0
                },
                dirtColor : {
                    red : 0.1,
                    green : 0.1,
                    blue : 0.1,
                    alpha : 1.0
                },
                patchiness : 1.5
            });

            primitives.add(polygon);
        };
    };

    Sandbox.StripePolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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

    Sandbox.TieDyePolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
                frequency : 5.0
            });

            primitives.add(polygon);
        };
    };

    Sandbox.FacetPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
                new Cesium.Cartographic2(-80.0, 30.0),
                new Cesium.Cartographic2(-70.0, 30.0),
                new Cesium.Cartographic2(-70.0, 40.0),
                new Cesium.Cartographic2(-80.0, 40.0)
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