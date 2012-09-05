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

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    type : 'Color',
                    uniforms : {
                        color : {
                            red : 1.0,
                            green : 0.0,
                            blue : 0.0,
                            alpha : 0.75
                        }
                    }
                }
            });

            primitives.add(polygon);
        };
    };


    Sandbox.CompositeMaterial1 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 34.0),
                Cesium.Cartographic.fromDegrees(-70.0, 34.0),
                Cesium.Cartographic.fromDegrees(-70.0, 37.0),
                Cesium.Cartographic.fromDegrees(-80.0, 37.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context: scene.getContext(),
                fabric: {
                    materials: {
                        logo: {
                            type: 'Image',
                            uniforms: {
                                image: '../../Images/Cesium_Logo_overlay.png'
                            }
                        }
                    },
                    components: {
                        diffuse: 'mix(vec3(0.0, 0.0, 1.0), logo.diffuse, logo.alpha)',
                        specular : 'mix(0.0, 0.01, logo.alpha)',
                        alpha: 'logo.alpha'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.CompositeMaterial2 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 20.0),
                Cesium.Cartographic.fromDegrees(-70.0, 20.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-80.0, 33.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context: scene.getContext(),
                fabric: {
                    materials : {
                        grass : {
                            type : 'Grass'
                        },
                        asphalt : {
                            type : 'Asphalt'
                        },
                        cement : {
                            type : 'Cement'
                        }
                    },
                    source :
                        'czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n' +
                        'czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                        'float distanceFromCenter = abs(materialInput.st - vec2(0.5)).x;\n' +
                        'if(distanceFromCenter > 0.3){material.diffuse = grass.diffuse;}\n' +
                        'else if(distanceFromCenter > 0.2){material.diffuse = cement.diffuse;}\n' +
                        'else{material.diffuse = asphalt.diffuse;}\n' +
                        'return material;\n}\n'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.CompositeMaterial3 = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);

            polygon.configureExtent(new Cesium.Extent(
                Cesium.Math.toRadians(-180.0),
                Cesium.Math.toRadians(-90.0),
                Cesium.Math.toRadians(180.0),
                Cesium.Math.toRadians(90.0)));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context: scene.getContext(),
                fabric: {
                    uniforms : {
                        image: '../../Images/earthspec1k.jpg',
                        heightField : '../../Images/earthbump1k.jpg'
                    },
                    materials: {
                        bumpMap: {
                            type : 'BumpMap',
                            uniforms : {
                                image : '../../Images/earthbump1k.jpg'
                            }
                        }
                    },
                    source :
                        'czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n' +
                        'czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                        'float heightValue = texture2D(heightField, materialInput.st).r;\n' +
                        'material.diffuse = mix(vec3(0.2, 0.6, 0.2), vec3(1.0, 0.5, 0.2), heightValue);\n' +
                        'material.alpha = (1.0 - texture2D(image, materialInput.st).r) * 0.7;\n' +
                        'material.normal = bumpMap.normal;\n' +
                        'material.specular = (1.0 - texture2D(image, materialInput.st).r) / 100.0;\n' +
                        'return material;\n}\n'
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.ImagePolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 32.5),
                Cesium.Cartographic.fromDegrees(-80.0, 32.5)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
               context : scene.getContext(),
               fabric : {
                   type : 'Image',
                   uniforms : {
                       image : '../../Images/Cesium_Logo_overlay.png'
                   }
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

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
               context : scene.getContext(),
               fabric : {
                   type : 'DiffuseMap',
                   uniforms : {
                       image : '../../Images/Cesium_Logo_Color.jpg'
                   }
               }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.AlphaMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-80.0, 33.0)
            ]));

            polygon.material.uniforms.color = {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0,
                    alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    materials : {
                        alphaMaterial : {
                            type : 'AlphaMap',
                            uniforms : {
                                image : '../../Images/Cesium_Logo_Color.jpg',
                                channel : 'r'
                            }
                        }
                    },
                    components : {
                        diffuse : 'vec3(1.0)',
                        alpha : 'alphaMaterial.alpha'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.SpecularMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-80.0, 33.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    type : 'SpecularMap',
                    uniforms : {
                        image : '../../Images/Cesium_Logo_Color.jpg',
                        channel : 'r'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.EmissionMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon(undefined);
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 33.0),
                Cesium.Cartographic.fromDegrees(-80.0, 33.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    materials : {
                        diffuseMaterial : {
                            type : 'DiffuseMap',
                            uniforms : {
                                image : '../../Images/Cesium_Logo_Color.jpg'
                            }
                        },
                        emissionMaterial : {
                            type : 'EmissionMap',
                            uniforms : {
                                image : '../../Images/checkerboard.png',
                                repeat : {
                                    x : 1,
                                    y : 0.5
                                }
                            }
                        }
                    },
                    components : {
                        diffuse : 'diffuseMaterial.diffuse',
                        emission : 'emissionMaterial.emission * 0.2'
                    }
                }
            });

            primitives.add(polygon);
        };
    };

    Sandbox.BumpMapPolygonMaterial = function (scene, ellipsoid, primitives) {
        this.code = function() {
            var polygon = new Cesium.Polygon();
            polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-80.0, 36.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    materials : {
                        diffuseMaterial : {
                            type : 'DiffuseMap',
                            uniforms : {
                                image : '../../Images/bumpmap.png'
                            }
                        },
                        bumpMaterial : {
                            type : 'BumpMap',
                            uniforms : {
                                image : '../../Images/bumpmap.png',
                                strength : 0.8
                            }
                        }
                    },
                    components : {
                        diffuse : 'diffuseMaterial.diffuse',
                        specular : 0.01,
                        normal : 'bumpMaterial.normal'
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
                Cesium.Cartographic.fromDegrees(-80.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 30.0),
                Cesium.Cartographic.fromDegrees(-70.0, 36.0),
                Cesium.Cartographic.fromDegrees(-80.0, 36.0)
            ]));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    materials : {
                        diffuseMaterial : {
                            type : 'DiffuseMap',
                            uniforms : {
                                image : '../../Images/bumpmap.png'
                            }
                        },
                        normalMap : {
                            type : 'NormalMap',
                            uniforms : {
                                image : '../../Images/normalmap.png',
                                strength : 0.6
                            }
                        }
                    },
                    components : {
                        diffuse : 'diffuseMaterial.diffuse',
                        specular : 0.01,
                        normal : 'normalMap.normal'
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
                Cesium.Math.toRadians(90.0)
            ));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    uniforms : {
                        image : '../../Images/earthspec1k.jpg'
                    },
                    materials : {
                        reflection: {
                            type : 'Reflection',
                            uniforms: {
                                cubeMap: {
                                    positiveX: filePath,
                                    negativeX: filePath,
                                    positiveY: filePath,
                                    negativeY: filePath,
                                    positiveZ: filePath,
                                    negativeZ: filePath
                                }
                            }
                        }
                    },
                    components: {
                        diffuse: 'reflection.diffuse + 0.7',
                        alpha: '0.1 * texture2D(image, materialInput.st).r'
                    }
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
                Cesium.Math.toRadians(90.0)
            ));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    uniforms : {
                        image : '../../Images/earthspec1k.jpg'
                    },
                    materials : {
                        refraction: {
                            type : 'Refraction',
                            uniforms: {
                                cubeMap: {
                                    positiveX: filePath,
                                    negativeX: filePath,
                                    positiveY: filePath,
                                    negativeY: filePath,
                                    positiveZ: filePath,
                                    negativeZ: filePath
                                },
                                indexOfRefractionRatio: 0.9
                            }
                        }
                    },
                    components: {
                        diffuse: 'refraction.diffuse + 0.7',
                        alpha: '0.1 * texture2D(image, materialInput.st).r'
                    }
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
                Cesium.Math.toRadians(90.0)
            ));

            polygon.material.uniforms.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    uniforms : {
                        image : '../../Images/earthspec1k.jpg'
                    },
                    materials : {
                        fresnel : {
                            type : 'Fresnel',
                            materials : {
                                reflection : {
                                    uniforms : {
                                        cubeMap : {
                                            positiveX : filePath,
                                            negativeX : filePath,
                                            positiveY : filePath,
                                            negativeY : filePath,
                                            positiveZ : filePath,
                                            negativeZ : filePath
                                        }
                                    }
                                },
                                refraction : {
                                    uniforms : {
                                        cubeMap : {
                                            positiveX : filePath,
                                            negativeX : filePath,
                                            positiveY : filePath,
                                            negativeY : filePath,
                                            positiveZ : filePath,
                                            negativeZ : filePath
                                        }
                                    }
                                }
                            }
                        }
                    },
                    components: {
                        diffuse: 'fresnel.diffuse + 0.7',
                        alpha: '0.1 * texture2D(image, materialInput.st).r'
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Brick',
                    uniforms : {
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
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Wood',
                    uniforms : {
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
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Asphalt',
                    uniforms : {
                        asphaltColor : {
                            red : 0.15,
                            green : 0.15,
                            blue : 0.15,
                            alpha : 1.0
                        },
                        bumpSize : 0.02,
                        roughness : 0.2
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Cement',
                    uniforms : {
                        cementColor : {
                            red : 0.95,
                            green : 0.95,
                            blue : 0.85,
                            alpha : 1.0
                        },
                        grainScale : 0.01,
                        roughness : 0.3
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Grass',
                    uniforms : {
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
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Stripe',
                    uniforms : {
                        horizontal : true,
                        lightColor : {
                            red : 1.0,
                            green : 1.0,
                            blue : 1.0,
                            alpha : 0.5
                        },
                        darkColor : {
                            red : 0.0,
                            green : 0.0,
                            blue : 1.0,
                            alpha : 0.5
                        },
                        offset : 0.0,
                        repeat : 5.0
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Checkerboard',
                    uniforms : {
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
                            alpha : 0.75
                        },
                        repeat : {
                            x : 5.0,
                            y : 5.0
                        }
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Dot',
                    uniforms : {
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
                            alpha : 0.75
                        },
                        repeat : {
                            x : 5.0,
                            y : 5.0
                        }
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'TieDye',
                    uniforms : {
                        lightColor : {
                            red : 1.0,
                            green : 1.0,
                            blue : 0.0,
                            alpha : 0.75
                        },
                        darkColor : {
                            red : 1.0,
                            green : 0.0,
                            blue : 0.0,
                            alpha : 0.75
                        },
                        frequency : 5.0
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Facet',
                    uniforms : {
                        lightColor : {
                            red : 0.25,
                            green : 0.25,
                            blue : 0.25,
                            alpha : 0.75
                        },
                        darkColor : {
                            red : 0.75,
                            green : 0.75,
                            blue : 0.75,
                            alpha : 0.75
                        },
                        frequency : 10.0
                    }
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
                context : scene.getContext(),
                fabric : {
                    type : 'Blob',
                    uniforms : {
                        lightColor : {
                            red : 1.0,
                            green : 1.0,
                            blue : 1.0,
                            alpha : 0.5
                        },
                        darkColor : {
                            red : 0.0,
                            green : 0.0,
                            blue : 1.0,
                            alpha : 0.5
                        },
                        frequency : 10.0
                    }
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

            polygon.material = Cesium.Material.fromType(scene.getContext(), 'Checkerboard');

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

            polygon.material = Cesium.Material.fromType(scene.getContext(), 'Checkerboard');

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

            polygon.material = Cesium.Material.fromType(scene.getContext(), 'Checkerboard');

            primitives.add(polygon);

            scene.getAnimations().addProperty(polygon, 'height', 2000000.0, 0.0);
        };
    };

}());