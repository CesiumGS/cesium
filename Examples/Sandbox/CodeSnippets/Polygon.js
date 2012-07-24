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
                context : scene.getContext(),
                fabric : {
                    "id" : "Color",
                    "uniforms" : {
                        "color" : {
                            "red" : 1,
                            "green" : 0,
                            "blue" : 0,
                            "alpha" : 0.75
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
                context: scene.getContext(),
                fabric: {
                    "uniforms" : {
                        "texture": "../../Images/earthspec1k.jpg"
                    },
                    "materials": {
                        "bumpMap": {
                            "id": "BumpMap",
                            "uniforms" : {
                                "texture" : "../../Images/earthbump1k.jpg"
                            }
                        }
                    },
                    "source" :
                        "agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n" +
                        "agi_material material = agi_getDefaultMaterial(materialInput);\n" +
                        "float normalZ = bumpMap.normal.z;\n" +
                        "if(normalZ < 0.7)       {\n material.diffuse = vec3(1.0, 0.0, 0.0);\n}\n" +
                        "else if(normalZ < 0.95) {\n material.diffuse = vec3(0.0, 1.0, 0.0);\n}\n" +
                        "else                    {\n material.diffuse = vec3(0.0, 0.0, 1.0);\n}\n" +
                        "material.alpha *= (1.0 - texture2D(texture, materialInput.st).r);\n" +
                        "return material;\n}\n"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context: scene.getContext(),
                fabric: {
                    "materials" : {
                        "grass" : {
                            "id" : "Grass"
                        },
                        "asphalt" : {
                            "id" : "Asphalt"
                        },
                        "cement" : {
                            "id" : "Cement"
                        }
                    },
                    "source" :
                        "agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n" +
                        "agi_material material = agi_getDefaultMaterial(materialInput);\n" +
                        "float distanceFromCenter = abs(materialInput.st - vec2(0.5)).x;\n" +
                        "if(distanceFromCenter > 0.3){material.diffuse = grass.diffuse;}\n" +
                        "else if(distanceFromCenter > 0.2){material.diffuse = cement.diffuse;}\n" +
                        "else{material.diffuse = asphalt.diffuse;}\n" +
                        "return material;\n}\n"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
               context : scene.getContext(),
               fabric : {
                   "id" : "Image",
                   "uniforms" : {
                       "texture" : "../../Images/Cesium_Logo_overlay.png",
                       "repeat" : {
                           "x" : 1,
                           "y" : 1
                       }
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
               context : scene.getContext(),
               fabric : {
                   "id" : "DiffuseMap",
                   "uniforms" : {
                       "texture" : "../../Images/Cesium_Logo_Color.jpg",
                       "channels" : "rgb",
                       "repeat" : {
                           "x" : 1,
                           "y" : 1
                       }
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

            polygon.material.color = {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0,
                    alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "materials" : {
                        "alphaMaterial" : {
                            "id" : "AlphaMap",
                            "uniforms" : {
                                "texture" : "../../Images/Cesium_Logo_Color.jpg",
                                "channel" : "r",
                                "repeat" : {
                                    "x" : 1,
                                    "y" : 1
                                }
                            }
                        }
                    },
                    "components" : {
                        "diffuse" : "vec3(1.0)",
                        "alpha" : "alphaMaterial.alpha"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "id" : "SpecularMap",
                    "uniforms" : {
                        "texture" : "../../Images/Cesium_Logo_Color.jpg",
                        "channel" : "r",
                        "repeat" : {
                            "x" : 1,
                            "y" : 1
                        }
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "materials" : {
                        "diffuseMaterial" : {
                            "id" : "DiffuseMap",
                            "uniforms" : {
                                "texture" : "../../Images/Cesium_Logo_Color.jpg"
                            }
                        },
                        "emissionMaterial" : {
                            "id" : "EmissionMap",
                            "uniforms" : {
                                "texture" : "../../Images/checkerboard.png",
                                "channels" : "rgb",
                                "repeat" : {
                                    "x" : 1,
                                    "y" : 0.5
                                }
                            }
                        }
                    },
                    "components" : {
                        "diffuse" : "diffuseMaterial.diffuse",
                        "emission" : "emissionMaterial.emission * 0.2"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "materials" : {
                        "diffuseMaterial" : {
                            "id" : "DiffuseMap",
                            "uniforms" : {
                                "texture" : "../../Images/bumpmap.png"
                            }
                        },
                        "bumpMaterial" : {
                            "id" : "BumpMap",
                            "uniforms" : {
                                "texture" : "../../Images/bumpmap.png",
                                "channel" : "r",
                                "strength" : 0.8,
                                "repeat" : {
                                    "x" : 1,
                                    "y" : 1
                                }
                            }
                        }
                    },
                    "components" : {
                        "diffuse" : "diffuseMaterial.diffuse",
                        "specular" : 0.01,
                        "normal" : "bumpMaterial.normal"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "materials" : {
                        "diffuseMaterial" : {
                            "id" : "DiffuseMap",
                            "uniforms" : {
                                "texture" : "../../Images/bumpmap.png"
                            }
                        },
                        "normalMap" : {
                            "id" : "NormalMap",
                            "uniforms" : {
                                "texture" : "../../Images/normalmap.png",
                                "channels" : "rgb",
                                "strength" : 0.6,
                                "repeat" : {
                                    "x" : 1,
                                    "y" : 1
                                }
                            }
                        }
                    },
                    "components" : {
                        "diffuse" : "diffuseMaterial.diffuse",
                        "specular" : 0.01,
                        "normal" : "normalMap.normal"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "uniforms" : {
                        "texture" : "../../Images/earthspec1k.jpg"
                    },
                    "materials" : {
                        "reflection": {
                            "id": "Reflection",
                            "uniforms": {
                                "cubeMap": {
                                    "positiveX": filePath,
                                    "negativeX": filePath,
                                    "positiveY": filePath,
                                    "negativeY": filePath,
                                    "positiveZ": filePath,
                                    "negativeZ": filePath
                                },
                                "channels": "rgb"
                            }
                        }
                    },
                    "components": {
                        "diffuse": "reflection.diffuse + 0.7",
                        "alpha": "0.1 * texture2D(texture, materialInput.st).r"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "uniforms" : {
                        "texture" : "../../Images/earthspec1k.jpg"
                    },
                    "materials" : {
                        "refraction": {
                            "id": "Refraction",
                            "uniforms": {
                                "cubeMap": {
                                    "positiveX": filePath,
                                    "negativeX": filePath,
                                    "positiveY": filePath,
                                    "negativeY": filePath,
                                    "positiveZ": filePath,
                                    "negativeZ": filePath
                                },
                                "channels": "rgb"
                            }
                        }
                    },
                    "components": {
                        "diffuse": "refraction.diffuse + 0.7",
                        "alpha": "0.1 * texture2D(texture, materialInput.st).r"
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

            polygon.material.color = {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0
            };

            var filePath = '../../Images/checkerboard.png';
            polygon.material = new Cesium.Material({
                context : scene.getContext(),
                fabric : {
                    "uniforms" : {
                        "texture" : "../../Images/earthspec1k.jpg"
                    },
                    "materials" : {
                        "fresnel" : {
                            "id" : "Fresnel",
                            "materials" : {
                                "reflection" : {
                                    "uniforms" : {
                                        "cubeMap" : {
                                            "positiveX" : filePath,
                                            "negativeX" : filePath,
                                            "positiveY" : filePath,
                                            "negativeY" : filePath,
                                            "positiveZ" : filePath,
                                            "negativeZ" : filePath
                                        }
                                    }
                                },
                                "refraction" : {
                                    "uniforms" : {
                                        "cubeMap" : {
                                            "positiveX" : filePath,
                                            "negativeX" : filePath,
                                            "positiveY" : filePath,
                                            "negativeY" : filePath,
                                            "positiveZ" : filePath,
                                            "negativeZ" : filePath
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "components": {
                        "diffuse": "fresnel.diffuse + 0.7",
                        "alpha": "0.1 * texture2D(texture, materialInput.st).r"
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
                    "id" : "Brick",
                    "uniforms" : {
                        "brickColor" : {
                            "red": 0.6,
                            "green": 0.3,
                            "blue": 0.1,
                            "alpha": 1.0
                        },
                        "mortarColor" : {
                            "red" : 0.8,
                            "green" : 0.8,
                            "blue" : 0.7,
                            "alpha" : 1.0
                        },
                        "brickSize" : {
                            "x" : 0.30,
                            "y" : 0.15
                        },
                        "brickPct" : {
                            "x" : 0.90,
                            "y" : 0.85
                        },
                        "brickRoughness" : 0.2,
                        "mortarRoughness" : 0.1
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
                    "id" : "Wood",
                    "uniforms" : {
                        "lightWoodColor" : {
                            "red" : 0.6,
                            "green" : 0.3,
                            "blue" : 0.1,
                            "alpha" : 1.0
                        },
                        "darkWoodColor" : {
                            "red" : 0.4,
                            "green" : 0.2,
                            "blue" : 0.07,
                            "alpha" : 1.0
                        },
                        "ringFrequency" : 3.0,
                        "noiseScale" : {
                            "x" : 0.7,
                            "y" : 0.5
                        },
                        "grainFrequency" : 27.0
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
                    "id" : "Asphalt",
                    "uniforms" : {
                        "asphaltColor" : {
                            "red" : 0.15,
                            "green" : 0.15,
                            "blue" : 0.15,
                            "alpha" : 1.0
                        },
                        "bumpSize" : 0.02,
                        "roughness" : 0.2
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
                    "id" : "Cement",
                    "uniforms" : {
                        "cementColor" : {
                            "red" : 0.95,
                            "green" : 0.95,
                            "blue" : 0.85,
                            "alpha" : 1.0
                        },
                        "grainScale" : 0.01,
                        "roughness" : 0.3
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
                    "id" : "Grass",
                    "uniforms" : {
                        "grassColor" : {
                            "red" : 0.25,
                            "green" : 0.4,
                            "blue" : 0.1,
                            "alpha" : 1.0
                        },
                        "dirtColor" : {
                            "red" : 0.1,
                            "green" : 0.1,
                            "blue" : 0.1,
                            "alpha" : 1.0
                        },
                        "patchiness" : 1.5
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
                    "id" : "Stripe",
                    "uniforms" : {
                        "direction" : "x",
                        "lightColor" : {
                            "red" : 1.0,
                            "green" : 1.0,
                            "blue" : 1.0,
                            "alpha" : 0.5
                        },
                        "darkColor" : {
                            "red" : 0.0,
                            "green" : 0.0,
                            "blue" : 1.0,
                            "alpha" : 0.5
                        },
                        "offset" : 0.0,
                        "repeat" : 5.0
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
                    "id" : "Checkerboard",
                    "uniforms" : {
                        "lightColor" : {
                            "red" : 1.0,
                            "green" : 1.0,
                            "blue" : 0.0,
                            "alpha" : 0.75
                        },
                        "darkColor" : {
                            "red" : 0.0,
                            "green" : 1.0,
                            "blue" : 1.0,
                            "alpha" : 0.75
                        },
                        "repeat" : {
                            "x" : 5.0,
                            "y" : 5.0
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
                    "id" : "Dot",
                    "uniforms" : {
                        "lightColor" : {
                            "red" : 1.0,
                            "green" : 1.0,
                            "blue" : 0.0,
                            "alpha" : 0.75
                        },
                        "darkColor" : {
                            "red" : 0.0,
                            "green" : 1.0,
                            "blue" : 1.0,
                            "alpha" : 0.75
                        },
                        "repeat" : {
                            "x" : 5.0,
                            "y" : 5.0
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
                    "id" : "TieDye",
                    "uniforms" : {
                        "lightColor" : {
                            "red" : 1.0,
                            "green" : 1.0,
                            "blue" : 0.0,
                            "alpha" : 0.75
                        },
                        "darkColor" : {
                            "red" : 1.0,
                            "green" : 0.0,
                            "blue" : 0.0,
                            "alpha" : 0.75
                        },
                        "frequency" : 5.0
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
                    "id" : "Facet",
                    "uniforms" : {
                        "lightColor" : {
                            "red" : 0.25,
                            "green" : 0.25,
                            "blue" : 0.25,
                            "alpha" : 0.75
                        },
                        "darkColor" : {
                            "red" : 0.75,
                            "green" : 0.75,
                            "blue" : 0.75,
                            "alpha" : 0.75
                        },
                        "frequency" : 10.0
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
                    "id" : "Blob",
                    "uniforms" : {
                        "lightColor" : {
                            "red" : 1.0,
                            "green" : 1.0,
                            "blue" : 1.0,
                            "alpha" : 0.5
                        },
                        "darkColor" : {
                            "red" : 0.0,
                            "green" : 0.0,
                            "blue" : 1.0,
                            "alpha" : 0.5
                        },
                        "frequency" : 10.0
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

            polygon.material = Cesium.Material.fromID(scene.getContext(), 'Checkerboard');

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

            polygon.material = Cesium.Material.fromID(scene.getContext(), 'Checkerboard');

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

            polygon.material = Cesium.Material.fromID(scene.getContext(), 'Checkerboard');

            primitives.add(polygon);

            scene.getAnimations().addProperty(polygon, 'height', 2000000.0, 0.0);
        };
    };

}());