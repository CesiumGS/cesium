/*global defineSuite*/
defineSuite([
        'Scene/Material',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext'
    ], function(
        Material,
        renderMaterial,
        createContext,
        destroyContext) {
    "use strict";
    /*global it,expect*/

    it('draws all basic material types', function() {
        var materialTypes = ['Color', 'Image', 'DiffuseMap', 'AlphaMap', 'SpecularMap', 'EmissionMap',
            'BumpMap', 'NormalMap','Reflection', 'Refraction', 'Fresnel', 'Brick', 'Wood', 'Asphalt',
            'Cement', 'Grass', 'Stripe', 'Checkerboard','Dot','TieDye', 'Facet', 'Blob'];
        for (var i = 0; i < materialTypes.length; i++) {
            var materialID = materialTypes[i];
            var context = createContext();
            var material = new Material({
                context : context,
                strict : true,
                fabric : {
                    "id" : materialID
                }
            });
            var pixel = renderMaterial(material, context);
            expect(pixel).not.toEqualArray([0, 0, 0, 0]);
            destroyContext(context);
        }
    });

    it('builds a material from an existing material', function() {
        var context = createContext();
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

        var pixel1 = renderMaterial(material1, context);
        expect(pixel1).not.toEqualArray([0, 0, 0, 0]);
        var pixel2 = renderMaterial(material2, context);
        expect(pixel2).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('accesses material properties after construction', function() {
        var context = createContext();
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
        material.value.x = 1.0;
        material.first.repeat.x = 2.0;

        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('creates a material inside a material inside a material', function () {
        var context = createContext();
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
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('create a material using fromID', function () {
        var context = createContext();
        var material = Material.fromID(context, 'Color');
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('throws without context for material that uses textures', function() {
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
            var context = createContext();
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
            var context = createContext();
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
            var context = createContext();
            return new Material({
                context : context,
                strict : true,
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
            var context = createContext();
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
            var context = createContext();
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
            var context = createContext();
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
            var context = createContext();
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
            var context = createContext();
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "uniforms" : {
                        "texture" : "agi_defaultTexture",
                        "channels" : "rgb"
                    }
                },
                "components" : {
                    "diffuse" : "texture2D(texture, materialInput.st).rgb"
                }
            });
        }).toThrow();

        // If strict is false, unused uniform strings are ignored.
        var context = createContext();
        var material = new Material({
            context : context,
            strict : false,
            fabric : {
                "uniforms" : {
                    "texture" : "agi_defaultTexture",
                    "channels" : "rgb"
                },
                "components" : {
                    "diffuse" : "texture2D(texture, materialInput.st).rgb"
                }
            }
        });
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('throws with unused uniform', function() {
        expect(function() {
            var context = createContext();
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
        var context = createContext();
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
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('throws with unused material', function() {
        expect(function() {
            var context = createContext();
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
        var context = createContext();
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
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('throws with invalid image path to texture', function() {
        expect(function() {
            var context = createContext();
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "id" : "DiffuseMap",
                    "uniforms" : {
                        "texture" : "bad.png"
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid image path to cube map', function() {
        expect(function() {
            var context = createContext();
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    "id" : "Reflection",
                    "uniforms" : {
                        "cubeMap" : {
                            "positiveX" : "bad.png",
                            "negativeX" : "bad.png",
                            "positiveY" : "bad.png",
                            "negativeY" : "bad.png",
                            "positiveZ" : "bad.png",
                            "negativeZ" : "bad.png"
                        }
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid id sent to fromID', function() {
        expect(function() {
            var context = createContext();
            return Material.fromID(context, "Nothing");
        }).toThrow();
    });
});
