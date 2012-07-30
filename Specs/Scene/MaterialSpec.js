/*global defineSuite*/
defineSuite([
        'Scene/Material',
        'Scene/Polygon',
        '../Specs/createContext',
        '../Specs/sceneState',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Matrix4',
        'Core/Math'
    ], function(
        Material,
        Polygon,
        createContext,
        sceneState,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        Matrix4,
        CesiumMath) {
    "use strict";
    /*global it,expect*/


    var context = createContext();
    var polygon = new Polygon();
    var camera = {
        eye : new Cartesian3(1.02, 0.0, 0.0),
        target : Cartesian3.ZERO,
        up : Cartesian3.UNIT_Z
    };
    var us = context.getUniformState();
    us.setView(Matrix4.fromCamera({
        eye : camera.eye,
        target : camera.target,
        up : camera.up
    }));
    us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));

    var ellipsoid = Ellipsoid.UNIT_SPHERE;
    polygon.ellipsoid = ellipsoid;
    polygon.granularity = CesiumMath.toRadians(20.0);
    polygon.setPositions([
        ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
        ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
        ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
        ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
    ]);

    var renderMaterial = function(material) {
        polygon.material = material;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        return context.readPixels();
    };

    it('draws all base material types', function() {
        var materialTypes = ['Color', 'Image', 'DiffuseMap', 'AlphaMap', 'SpecularMap', 'EmissionMap',
            'BumpMap', 'NormalMap','Reflection', 'Refraction', 'Fresnel', 'Brick', 'Wood', 'Asphalt',
            'Cement', 'Grass', 'Stripe', 'Checkerboard','Dot','TieDye', 'Facet', 'Blob'];

        for (var i = 0; i < materialTypes.length; i++) {
            var materialId = materialTypes[i];
            var material = new Material({
                context : context,
                strict : true,
                fabric : {
                    "id" : materialId
                }
            });
            var pixel = renderMaterial(material);
            expect(pixel).not.toEqual([0, 0, 0, 0]);
        }
    });

    it('gets the material id', function() {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "id" : "Color"
            }
        });
        expect(material.getId()).toEqual("Color");
    });
    it('creates a new material type and builds off of it', function() {
        var material1 = new Material({
            context : context,
            strict : true,
            fabric : {
                "id" : "New",
                "components" : {
                    "diffuse" : "vec3(0.0, 0.0, 0.0)"
                }
            }
        });

        var material2 = new Material({
            context : context,
            strict : true,
            fabric : {
                "materials" : {
                    "first" : {
                        "id" : "New"
                    }
                },
                "components" : {
                    "diffuse" : "first.diffuse"
                }
            }
        });

        var pixel1 = renderMaterial(material1);
        expect(pixel1).not.toEqual([0, 0, 0, 0]);
        var pixel2 = renderMaterial(material2);
        expect(pixel2).not.toEqual([0, 0, 0, 0]);
    });

    it('accesses material properties after construction', function() {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "materials" : {
                    "first" : {
                        "id" : "DiffuseMap"
                    }
                },
                "uniforms" : {
                    "value" : {
                        "x" : 0.0,
                        "y" : 0.0,
                        "z" : 0.0
                    }
                },
                "components" : {
                    "diffuse" : "value + first.diffuse"
                }
            }
        });
        material.uniforms.value.x = 1.0;
        material.materials.first.uniforms.repeat.x = 2.0;

        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material inside a material inside a material', function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "materials" : {
                    "first" : {
                        "materials" : {
                            "second" : {
                                "components" : {
                                    "diffuse" : "vec3(0.0, 0.0, 0.0)"
                                }
                            }
                        },
                        "components" : {
                            "diffuse" : "second.diffuse"
                        }
                    }
                },
                "components" : {
                    "diffuse" : "first.diffuse"
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material with an image uniform', function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "id" : "DiffuseMap",
                "uniforms" : {
                    "image" :  "./Data/Images/Blue.png"
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material with a cube map uniform' , function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "id" : "Reflection",
                "uniforms" : {
                    "cubeMap" : {
                        "positiveX" : "./Data/Images/Blue.png",
                        "negativeX" : "./Data/Images/Blue.png",
                        "positiveY" : "./Data/Images/Blue.png",
                        "negativeY" : "./Data/Images/Blue.png",
                        "positiveZ" : "./Data/Images/Blue.png",
                        "negativeZ" : "./Data/Images/Blue.png"
                    }
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });
    it('creates a material with a boolean uniform', function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "uniforms" : {
                    "value" : true
                },
                "components" : {
                    "diffuse" : "float(value) * vec3(1.0)"
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create a material with a matrix uniform', function () {
        var material1 = new Material({
            context : context,
            strict : true,
            fabric : {
                "uniforms" : {
                    "value" : [0.5, 0.5, 0.5, 0.5]
                },
                "components" : {
                    "diffuse" : "vec3(value[0][0], value[0][1], value[1][0])",
                    "alpha" : "value[1][1]"
                }
            }
        });
        var pixel = renderMaterial(material1);
        expect(pixel).not.toEqual([0, 0, 0, 0]);

        var material2 = new Material({
            context : context,
            strict : true,
            fabric : {
                "uniforms" : {
                    "value" : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
                },
                "components" : {
                    "diffuse" : "vec3(value[0][0], value[0][1], value[1][0])",
                    "alpha" : "value[2][2]"
                }
            }
        });
        pixel = renderMaterial(material2);
        expect(pixel).not.toEqual([0, 0, 0, 0]);

        var material3 = new Material({
            context : context,
            strict : true,
            fabric : {
                "uniforms" : {
                    "value" : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
                },
                "components" : {
                    "diffuse" : "vec3(value[0][0], value[0][1], value[1][0])",
                    "alpha" : "value[3][3]"
                }
            }
        });
        pixel = renderMaterial(material3);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material using unusual uniform and material names', function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                "uniforms" : {
                    "i" : 0.5
                },
                "materials" : {
                    "d" : {
                        "id" : "ColorMaterial"
                    },
                    "diffuse" : {
                        "id" : "ColorMaterial"
                    }
                },
                "components" : {
                    "diffuse" : "(d.diffuse + diffuse.diffuse)*i",
                    "specular" : "i"
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create a material using fromId', function () {
        var material = Material.fromId(context, 'Color');
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws without context for material that uses images', function() {
        expect(function() {
            return new Material({
                context : undefined,
                fabric : {
                    "id" : "DiffuseMap"
                }
            });
        }).toThrow();
    });

    it('throws with source and components in same template', function () {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "components" : {
                        "diffuse" : "vec3(0.0, 0.0, 0.0)"
                    },
                    "source" : "agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n" +
                               "agi_material material = agi_getDefaultMaterial(materialInput);\n" +
                               "return material;\n}\n"
                }
            });
        }).toThrow();

        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "id" : "DiffuseMap",
                    "components" : {
                        "diffuse" : "vec3(0.0, 0.0, 0.0)"
                    }
                }
            });
        }).toThrow();
    });

    it('throws with duplicate names in materials and uniforms', function () {
        expect(function() {
            return new Material({
                context : context,
                strict : false,
                fabric : {
                    "uniforms" : {
                        "first" : 0.0,
                        "second" : 0.0
                    },
                    "materials" : {
                        "second" : {}
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid template type', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "invalid" : 3
                }
            });
        }).toThrow();
    });

    it('throws with invalid component type', function () {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "components" : {
                        "difuse" : "vec3(0.0, 0.0, 0.0)"
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid uniform type', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "uniforms" : {
                        "value" : {
                            "x" : 0.0,
                            "y" : 0.0,
                            "z" : 0.0,
                            "w" : 0.0,
                            "t" : 0.0
                        }
                    }
                }
            });
        }).toThrow();

        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "uniforms" : {
                        "value" : [0.0, 0.0, 0.0, 0.0, 0.0]
                    }
                }
            });
        }).toThrow();
    });

    it('throws with unused uniform string', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "uniforms" : {
                        "image" : "agi_defaultImage",
                        "nonexistant" : "value"
                    },
                    "components" : {
                        "diffuse" : "texture2D(image, materialInput.st).rgb"
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused uniform strings are ignored.
        var material = new Material({
            context : context,
            strict : false,
            fabric : {
                "uniforms" : {
                    "image" : "agi_defaultImage",
                    "channels" : "rgb"
                },
                "components" : {
                    "diffuse" : "texture2D(image, materialInput.st).rgb"
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws with unused uniform', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "uniforms" : {
                        "first" : {
                            "x" : 0.0,
                            "y" : 0.0,
                            "z" : 0.0
                        }
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused uniforms are ignored.
        var material = new Material({
            context : context,
            strict : false,
            fabric : {
                "uniforms" : {
                    "first" : {
                        "x" : 0.0,
                        "y" : 0.0,
                        "z" : 0.0
                    }
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws with unused material', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "materials" : {
                        "first" : {
                            "id" : "DiffuseMap"
                        }
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused materials are ignored.
        var material = new Material({
            context : context,
            strict : false,
            fabric : {
                "materials" : {
                    "first" : {
                        "id" : "DiffuseMap"
                    }
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws with invalid id sent to fromId', function() {
        expect(function() {
            return Material.fromId(context, "Nothing");
        }).toThrow();
    });
});
