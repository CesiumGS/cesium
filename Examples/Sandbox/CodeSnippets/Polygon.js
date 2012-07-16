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

    Sandbox.Material = function (scene, ellipsoid, primitives) {
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

            var helper = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'MaterialReflection',
                    'textures' : {
                        'palm_tree_cube_map' : {
                            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
                        }
                    },
                    'materials' : {
                        'd' : {
                            'type' : 'ReflectionMaterial',
                            'cubeMap' : 'palm_tree_cube_map'
                        },
                        'dd' : {
                            'type' : 'RefractionMaterial',
                            'cubeMap' : 'palm_tree_cube_map'
                        }
                    },
                    'components' : {
                        'diffuse' : '(d.diffuse + dd.diffuse)/2.0'
                    }
                }
            });
            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'textures' : {
                        'cesium_logo_texture' : '../../Images/Cesium_Logo_Color.jpg',
                        'alpha_map_texture' : '../../Images/alpha_map.png'
                    },
                    'materials' : {
                        'reflection' : {
                            'type' : 'MaterialReflection'
                        },
                        'diffuseMap' : {
                            'type' : 'DiffuseMapMaterial',
                            'texture' : 'cesium_logo_texture'
                        }
                    },
                    'components' : {
                        'diffuse' : '(reflection.diffuse + diffuseMap.diffuse) / 2.0'
                    }
                }
            });

            primitives.add(polygon);
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

            polygon.material = new Cesium.Material({
               'context' : scene.getContext(),
               'template' : {
                   'id' : 'DiffuseMapMaterial',
                   'materials' : {
                       'one' : {
                           'id' : 'DiffuseMapMaterial',
                           'uniforms' : {
                               'u_repeat' : {
                                   'x' : 2,
                                   'y' : 3
                               }
                           }
                       }
                   }
               }
            });
//            polygon.material = new Cesium.Material({
//                'context' : scene.getContext(),
//                'template' : {
//                    'id' : 'DiffuseMapMaterial',
//                    'textures' : {
//                        'f' : '../../Images/Cesium_Logo_Color.jpg'
//                    },
//                    'uniforms' : {
//                        'u_repeat' : {
//                            'x' : 1,
//                            'y' : 2
//                        }
//                    },
//                    'components' : {
//                        'diffuse' : 'texture2D(f, fract(u_repeat * materialInput.st)).rgb'
//                    }
//                    //'sourcePath' : 'DiffuseMapMaterial'
//                    //'source' : 'uniform sampler2D u_texture;\n' +
//                    //           'uniform vec2 u_repeat;\n' +
//                    //           'agi_material agi_getMaterial(agi_materialInput materialInput)\n' +
//                    //           '{\n' +
//                    //           'agi_material material = agi_getDefaultMaterial(materialInput);\n' +
//                    //           'material.diffuse = texture2D(u_texture, fract(u_repeat * materialInput.st)).rgb;\n' +
//                    //           'return material;\n' +
//                    //           '}\n'
//                }
//            });

//            var otherMaterial = new Cesium.Material({
//                'context' : scene.getContext(),
//                'template' : {
//                    'id' : 'RandomMaterial',
//                    'textures' : {
//                        'palmTreeCubeMap' : {
//                            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
//                            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
//                            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
//                            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
//                            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
//                            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
//                        },
//                        'cesiumLogoTexture' : '../../Images/Cesium_Logo_Color.jpg',
//                        'alphaMapTexture' : '../../Images/alpha_map.png'
//                    },
//                    'materials' : {
//                        'one' : {
//                            'id' : 'DiffuseMapMaterial',
//                            'u_texture' : 'alphaMapTexture',
//                            'u_repeat' : {
//                                'x' : 2,
//                                'y' : 1
//                            }
//                        },
//                        'two' : {
//                            'id' : 'DiffuseMapMaterial',
//                            'u_texture' : 'cesiumLogoTexture'
//                        }
//                    },
//                    'uniforms' : {
//                        'thing' : {
//                            'type' : 'float',
//                            'value' : 0.5
//                        }
//                    },
//                    'components' : {
//                        'diffuse' : 'thing * (one.diffuse + two.diffuse) / 2.0',
//                        'specular' : 'one.diffuse.r / 100.0'
//                    }
//                }
//            });
//
//            polygon.material = new Cesium.Material({
//                'context' : scene.getContext(),
//                'template' : {
//                    'textures' : {
//                        'cesiumLogoTexture' : '../../Images/Cesium_Logo_Color.jpg'
//                    },
//                    'materials' : {
//                        'one' : {
//                            'id' : 'RandomMaterial'
//                        }
//                    },
//                    'uniforms' : {
//                        'thing' : {
//                            'type' : 'sampler2D',
//                            'value' : 'cesiumLogoTexture'
//                        }
//                    },
//                    'components' : {
//                        'diffuse' : 'texture2D(thing, materialInput.st).bgr * one.diffuse'
//                    }
//                }
//            });

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
            var polygon = new Cesium.Polygon();
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
            new Cesium.Cartographic2(-90.0, 27.0), new Cesium.Cartographic2(-70.0, 27.0), new Cesium.Cartographic2(-70.0, 36.0), new Cesium.Cartographic2(-90.0, 36.0)]));
            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'textures' : {
                        'bumpMapTexture' : '../../Images/earthbump1k.jpg',
                        'blendMapTexture' : '../../Images/earthspec1k.jpg'
                    },
                    'materials' : {
                        'bumpMap' : {
                            'type' : 'BumpMapMaterial',
                            'texture' : 'bumpMapTexture'
                        },
                        'blendMap' : {
                            'type' : 'BlendMap',
                            'texture' : 'blendMapTexture'
                        }
                    },
                    'components': {
                        'diffuse': 'mix(vec3(0.0, 0.5, 0.0), vec3(0.0, 0.0, 0.5), blendMap)',
                        'normal': 'bumpMap.normal',
                        'alpha': '(1.0 - blendMap * 0.4)',
                        'specular': '(1.0 - blendMap) * (1.0 / 200.0)'
                    }
                }
            });
            primitives.add(polygon);
        };
    };

    Sandbox.NormalMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon();
            polygon.setPositions(ellipsoid.cartographicDegreesToCartesians([
            new Cesium.Cartographic2(-90.0, 27.0), new Cesium.Cartographic2(-70.0, 27.0), new Cesium.Cartographic2(-70.0, 36.0), new Cesium.Cartographic2(-90.0, 36.0)]));
            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'textures' : {
                        'normalMapTexture' : '../../Images/earthnormalmap.jpg',
                        'blendMapTexture' : '../../Images/earthspec1k.jpg'
                    },
                    'materials' : {
                        'normalMap' : {
                            'type' : 'NormalMapMaterial',
                            'texture' : 'normalMapTexture'
                        },
                        'blendMap' : {
                            'type' : 'BlendMap',
                            'texture' : 'blendMapTexture'
                        }
                    },
                    'components' : {
                        'diffuse': 'mix(vec3(0.0, 0.5, 0.0), vec3(0.0, 0.0, 0.5), blendMap)',
                        'normal': 'normalMap.normal',
                        'alpha': '(1.0 - blendMap * 0.4)',
                        'specular': '(1.0 - blendMap) * (1.0 / 200.0)'
                    }
                }
            });
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
                    indexOfRefractionRatio : (1.0 / 1.1)
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