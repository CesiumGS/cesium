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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'ColorMaterial',
                    'uniforms' : {
                        'u_color' : {
                            'red' : 1,
                            'green' : 0,
                            'blue' : 0,
                            'alpha' : 1
                        }
                    },
                    'sourcePath' : 'ColorMaterial'
                }
             });

            // The color's alpha component defines the polygon's opacity.
            // 0 - completely transparent.  1.0 - completely opaque.
            polygon.material.u_color = {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.75
            };

            primitives.add(polygon);
        };
    };

    Sandbox.CompositeMaterial1 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context': scene.getContext(),
                'template': {
                    'uniforms': {
                        'texture': '../../Images/earthspec1k.jpg',
                        'otherTexture': 'texture',
                        'value': 0.5,
                        'otherValue': 'value'
                    },
                    'materials': {
                        'first': {
                            'id': 'DiffuseMapMaterial',
                            'uniforms': {
                                'u_texture': 'texture',
                                'amount' : 'value'
                            },
                            'components' : {
                                'diffuse' : 'vec3(amount, 0.0, 0.0)',
                                'alpha' : 'amount'
                            }
                        }
                    },
                    'components': {
                        'diffuse': 'first.diffuse',
                        'specular': 'texture2D(otherTexture, materialInput.st).r / 5.0',
                        'alpha' : 'first.alpha'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.CompositeMaterial2 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context': scene.getContext(),
                'template': {
                    'uniforms': {
                        'texture': '../../Images/earthspec1k.jpg'
                    },
                    'materials': {
                        'grassMaterial' : {
                            'id' : 'GrassMaterial'
                        },
                        'waterMaterial' : {
                            'materials' : {
                                'blobMaterial' : {
                                    'id' : 'BlobMaterial',
                                    'uniforms' : {
                                        'u_lightColor' : {
                                            'red' : 0.4,
                                            'green' : 0.4,
                                            'blue' : 0.8
                                        },
                                        'u_darkColor' : {
                                            'red' : 0.1,
                                            'green' : 0.1,
                                            'blue' : 0.8
                                        },
                                        'u_frequency' : 50.0
                                    }
                                },
                                'reflectionMaterial' : {
                                    'id' : 'ReflectionMaterial'
                                }
                            },
                            'components' : {
                                'diffuse' : 'blobMaterial.diffuse + reflectionMaterial.diffuse * 0.1'
                            }
                        },
                        'bumpMapMaterial' : {
                            'id' : 'BumpMapMaterial'
                        }
                    },
                    'components': {
                        'diffuse' : 'mix(grassMaterial.diffuse, waterMaterial.diffuse, texture2D(texture, materialInput.st).r)',
                        'specular' : 'texture2D(texture, materialInput.st).r / 10.0',
                        'normal' : 'bumpMapMaterial.normal'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.CompositeMaterial3 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-100.0, 20.0),
                Cesium.Cartographic.fromDegrees(-70.0, 20.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-100.0, 33.0)
            ]));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context': scene.getContext(),
                'template': {
                    'materials' : {
                        'diffuse' : {
                            'id' : 'DiffuseMapMaterial'
                        }
                    },
                    'source' :
                        'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n' +
                        'agi_material material = agi_getDefaultMaterial(materialInput);\n' +
                        'vec2 value = 0.5 + 0.5*sin(materialInput.st);\n' +
                        'vec3 normalEC = material.normal;\n' +
                        'material.diffuse = mix(diffuse.diffuse, vec3(value.x + normalEC.x, value.y + normalEC.y, 0.0), normalEC.z);\n' +
                        'return material;\n}\n'
                }
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
                   'uniforms' : {
                       'u_repeat' : {
                           'x' : 1,
                           'y' : 1
                       },
                       'u_texture' : '../../Images/Cesium_Logo_Color.jpg',
                       'diffuseChannels' : 'rgb',
                       'alphaChannel' : 'a'
                   },
                   'sourcePath' : 'DiffuseMapMaterial'
               }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.AlphaMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-80.0, 36.0)
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
                    'id' : 'AlphaMapMaterial',
                    'uniforms' : {
                        'u_texture' : '../../Images/alpha_map.png',
                        'alphaChannel' : 'r',
                        'u_repeat' : {
                            'x' : 1,
                            'y' : 1
                        }
                    },
                    'sourcePath' : 'AlphaMapMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.SpecularMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-80.0, 36.0)
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
                    'id' : 'SpecularMapMaterial',
                    'uniforms' : {
                        'u_texture' : '../../Images/alpha_map.png',
                        'specularChannel' : 'r',
                        'u_repeat' : {
                            'x' : 1,
                            'y' : 1
                        }
                    },
                    'sourcePath' : 'SpecularMapMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.EmissionMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-80.0, 36.0)
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
                    'id' : 'EmissionMapMaterial',
                    'uniforms' : {
                        'u_texture' : '../../Images/alpha_map.png',
                        'emissionChannels' : 'rgb',
                        'u_repeat' : {
                            'x' : 1,
                            'y' : 1
                        }
                    },
                    'sourcePath' : 'EmissionMapMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.BumpMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon();
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-90.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-90.0, 36.0)
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
                    'id' : 'BumpMapMaterial',
                    'uniforms' : {
                        'u_texture' : '../../Images/earthbump1k.jpg',
                        'bumpMapChannel' : 'r',
                        'u_repeat' : {
                            'x' : 1,
                            'y' : 1
                        }
                    },
                    'sourcePath' : 'BumpMapMaterial',
                    'components' : {
                        'diffuse' : 'vec3(0.3, 0.3, 0.3)',
                        'specular' : '0.01'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.NormalMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon();
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-90.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 27.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-90.0, 36.0)
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
                    'id' : 'NormalMapMaterial',
                    'uniforms' : {
                        'u_texture' : '../../Images/earthnormalmap.jpg',
                        'normalMapChannels' : 'rgb',
                        'u_repeat' : {
                            'x' : 1,
                            'y' : 1
                        }
                    },
                    'sourcePath' : 'NormalMapMaterial',
                    'components' : {
                        'diffuse' : 'vec3(0.3, 0.3, 0.3)',
                        'specular' : '0.01'
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
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'ReflectionMaterial',
                    'uniforms' : {
                        'u_cubeMap' : {
                            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
                        },
                        'reflectionChannels' : 'rgb'
                    },
                    'sourcePath' : 'ReflectionMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.RefractionPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'RefractionMaterial',
                    'uniforms' : {
                        'u_cubeMap' : {
                            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
                        },
                        'refractionChannels' : 'rgb',
                        'u_indexOfRefractionRatio' : 0.9
                    },
                    'sourcePath' : 'RefractionMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.FresnelPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'FresnelMaterial',
                    'uniforms' : {
                        'palmTreeCubeMap' : {
                            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
                        }
                    },
                    'materials' : {
                        'reflection' : {
                            'id' : 'ReflectionMaterial',
                            'u_cubeMap' : 'palmTreeCubeMap'
                        },
                        'refraction' : {
                            'id' : 'RefractionMaterial',
                            'u_cubeMap' : 'palmTreeCubeMap'
                        }
                    },
                    'sourcePath' : 'FresnelMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.BrickPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'BrickMaterial',
                    'uniforms' : {
                        'u_brickColor' : {
                            'red': 0.6,
                            'green': 0.3,
                            'blue': 0.1,
                            'alpha': 1.0
                        },
                        'u_mortarColor' : {
                            'red' : 0.8,
                            'green' : 0.8,
                            'blue' : 0.7,
                            'alpha' : 1.0
                        },
                        'u_brickSize' : {
                            'x' : 0.30,
                            'y' : 0.15
                        },
                        'u_brickPct' : {
                            'x' : 0.90,
                            'y' : 0.85
                        },
                        'u_brickRoughness' : 0.2,
                        'u_mortarRoughness' : 0.1
                    },
                    'sourcePath' : 'BrickMaterial'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.WoodPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'WoodMaterial',
                    'uniforms' : {
                        'u_lightWoodColor' : {
                            'red' : 0.6,
                            'green' : 0.3,
                            'blue' : 0.1,
                            'alpha' : 1.0
                        },
                        'u_darkWoodColor' : {
                            'red' : 0.4,
                            'green' : 0.2,
                            'blue' : 0.07,
                            'alpha' : 1.0
                        },
                        'u_ringFrequency' : 3.0,
                        'u_noiseScale' : {
                            'x' : 0.7,
                            'y' : 0.5
                        },
                        'u_grainFrequency' : 27.0
                    },
                    'sourcePath' : 'WoodMaterial'
                }
            });

            primitives.add(polygon);
        };
    };
    Sandbox.AsphaltPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'AsphaltMaterial',
                    'uniforms' : {
                        'u_asphaltColor' : {
                            'red' : 0.15,
                            'green' : 0.15,
                            'blue' : 0.15,
                            'alpha' : 1.0
                        },
                        'u_bumpSize' : 0.02,
                        'u_roughness' : 0.2
                    },
                    'sourcePath' : 'AsphaltMaterial'
                }
            });

            primitives.add(polygon);
        };
    };
    Sandbox.CementPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'CementMaterial',
                    'uniforms' : {
                        'u_cementColor' : {
                            'red' : 0.95,
                            'green' : 0.95,
                            'blue' : 0.85,
                            'alpha' : 1.0
                        },
                        'u_grainScale' : 0.01,
                        'u_roughness' : 0.3
                    },
                    'sourcePath' : 'CementMaterial'
                }
            });

            primitives.add(polygon);
        };
    };
    Sandbox.GrassPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {

            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 40.0),
                Cesium.Cartographic.fromDegrees(-80.0, 40.0)
            ]));

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'GrassMaterial',
                    'uniforms' : {
                        'u_grassColor' : {
                            'red' : 0.25,
                            'green' : 0.4,
                            'blue' : 0.1,
                            'alpha' : 1.0
                        },
                        'u_dirtColor' : {
                            'red' : 0.1,
                            'green' : 0.1,
                            'blue' : 0.1,
                            'alpha' : 1.0
                        },
                        'u_patchiness' : 1.5
                    },
                    'sourcePath' : 'GrassMaterial'
                }
            });

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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'VerticalStripeMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 1.0,
                            'green' : 1.0,
                            'blue' : 1.0,
                            'alpha' : 0.5
                        },
                        'u_darkColor' : {
                            'red' : 0.0,
                            'green' : 0.0,
                            'blue' : 1.0,
                            'alpha' : 0.5
                        },
                        'u_offset' : 0.0,
                        'u_repeat' : 5.0
                    },
                    'sourcePath' : 'VerticalStripeMaterial'
                }
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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'CheckerboardMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 1.0,
                            'green' : 1.0,
                            'blue' : 0.0,
                            'alpha' : 0.75
                        },
                        'u_darkColor' : {
                            'red' : 0.0,
                            'green' : 1.0,
                            'blue' : 1.0,
                            'alpha' : 0.75
                        },
                        'u_repeat' : {
                            'x' : 5.0,
                            'y' : 5.0
                        }
                    },
                    'sourcePath' : 'CheckerboardMaterial'
                }
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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'DotMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 1.0,
                            'green' : 1.0,
                            'blue' : 0.0,
                            'alpha' : 0.75
                        },
                        'u_darkColor' : {
                            'red' : 0.0,
                            'green' : 1.0,
                            'blue' : 1.0,
                            'alpha' : 0.75
                        },
                        'u_repeat' : {
                            'x' : 5.0,
                            'y' : 5.0
                        }
                    },
                    'sourcePath' : 'DotMaterial'
                }
            });

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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'TieDyeMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 1.0,
                            'green' : 1.0,
                            'blue' : 0.0,
                            'alpha' : 0.75
                        },
                        'u_darkColor' : {
                            'red' : 1.0,
                            'green' : 0.0,
                            'blue' : 0.0,
                            'alpha' : 0.75
                        },
                        'u_frequency' : 5.0
                    },
                    'sourcePath' : 'TieDyeMaterial'
                }
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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'FacetMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 0.25,
                            'green' : 0.25,
                            'blue' : 0.25,
                            'alpha' : 0.75
                        },
                        'u_darkColor' : {
                            'red' : 0.75,
                            'green' : 0.75,
                            'blue' : 0.75,
                            'alpha' : 0.75
                        },
                        'u_frequency' : 10.0
                    },
                    'sourcePath' : 'FacetMaterial'
                }
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

            polygon.material = new Cesium.Material({
                'context' : scene.getContext(),
                'template' : {
                    'id' : 'BlobMaterial',
                    'uniforms' : {
                        'u_lightColor' : {
                            'red' : 1.0,
                            'green' : 1.0,
                            'blue' : 1.0,
                            'alpha' : 0.5
                        },
                        'u_darkColor' : {
                            'red' : 0.0,
                            'green' : 0.0,
                            'blue' : 1.0,
                            'alpha' : 0.5
                        },
                        'u_frequency' : 10.0
                    },
                    'sourcePath' : 'BlobMaterial'
                }
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