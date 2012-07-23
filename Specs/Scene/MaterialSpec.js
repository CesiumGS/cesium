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
        var materialTypes = ['ColorMaterial', 'DiffuseMapMaterial', 'AlphaMapMaterial', 'ImageMaterial',
            'SpecularMapMaterial', 'EmissionMapMaterial', 'BumpMapMaterial', 'NormalMapMaterial','ReflectionMaterial',
            'RefractionMaterial', 'FresnelMaterial', 'BrickMaterial', 'WoodMaterial', 'AsphaltMaterial', 'CementMaterial',
            'GrassMaterial', 'HorizontalStripeMaterial', 'VerticalStripeMaterial', 'CheckerboardMaterial','DotMaterial',
            'TieDyeMaterial', 'FacetMaterial', 'BlobMaterial'];
        for (var i = 0; i < materialTypes.length; i++) {
            var materialID = materialTypes[i];
            var context = createContext();
            var material = new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'id' : materialID
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
            'context' : context,
            'strict' : true,
            'fabric' : {
                'id' : 'NewMaterial',
                'components' : {
                    'diffuse' : 'vec3(0.0, 0.0, 0.0)'
                }
            }
        });

        var material2 = new Material({
            'context' : context,
            'strict' : true,
            'fabric' : {
                'materials' : {
                    'first' : {
                        'id' : 'NewMaterial'
                    }
                },
                'components' : {
                    'diffuse' : 'first.diffuse'
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
            'context' : context,
            'strict' : true,
            'fabric' : {
                'materials' : {
                    'first' : {
                        'id' : 'DiffuseMapMaterial'
                    }
                },
                'uniforms' : {
                    'value' : {
                        'x' : 0.0,
                        'y' : 0.0,
                        'z' : 0.0
                    }
                },
                'components' : {
                    'diffuse' : 'value + first.diffuse'
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
            'context' : context,
            'strict' : true,
            'fabric' : {
                'materials' : {
                    'first' : {
                        'materials' : {
                            'second' : {
                                'components' : {
                                    'diffuse' : 'vec3(0.0, 0.0, 0.0)'
                                }
                            }
                        },
                        'components' : {
                            'diffuse' : 'second.diffuse'
                        }
                    }
                },
                'components' : {
                    'diffuse' : 'first.diffuse'
                }
            }
        });
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });

    it('throws without context for material that uses textures', function() {
        expect(function() {
            return new Material({
                'context' : undefined,
                'fabric' : {
                    'id' : 'DiffuseMapMaterial'
                }
            });
        }).toThrow();
    });

    it('throws with source and components in same template', function () {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'components' : {
                        'diffuse' : 'vec3(0.0, 0.0, 0.0)'
                    },
                    'source' : 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n' +
                               'agi_material material = agi_getDefaultMaterial(materialInput);\n' +
                               'return material;\n}\n'
                }
            });
        }).toThrow();

        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'id' : 'DiffuseMapMaterial',
                    'components' : {
                        'diffuse' : 'vec3(0.0, 0.0, 0.0)'
                    }
                }
            });
        }).toThrow();
    });

    it('throws with duplicate names in materials and uniforms', function () {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'first' : 0.0,
                        'second' : 0.0
                    },
                    'materials' : {
                        'second' : {}
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid component type', function () {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'components' : {
                        'difuse' : 'vec3(0.0, 0.0, 0.0)'
                    }
                }
            });
        }).toThrow();
    });

    it('throws with invalid uniform type', function() {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'uniform' : {
                            'x' : 0.0,
                            'y' : 0.0,
                            'z' : 0.0,
                            'w' : 0.0,
                            't' : 0.0
                        }
                    }
                }
            });
        }).toThrow();

        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'uniform' : [0.0, 0.0, 0.0, 0.0, 0.0]
                    }
                }
            });
        }).toThrow();

        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'uniform' : {
                            'img1' : 'badpath',
                            'img2' : 'badpath',
                            'img3' : 'badpath',
                            'img4' : 'badpath',
                            'img5' : 'badpath',
                            'img6' : 'badpath'
                        }
                    }
                }
            });
        }).toThrow();
    });

    it('throws with unused uniform string', function() {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'texture' : 'agi_defaultTexture',
                        'channels' : 'rgb'
                    }
                },
                'components' : {
                    'diffuse' : 'texture2D(texture, materialInput.st).rgb'
                }
            });
        }).toThrow();

        // If strict is false, unused uniform strings are ignored.
        var context = createContext();
        var material = new Material({
            'context' : context,
            'strict' : false,
            'fabric' : {
                'uniforms' : {
                    'texture' : 'agi_defaultTexture',
                    'channels' : 'rgb'
                },
                'components' : {
                    'diffuse' : 'texture2D(texture, materialInput.st).rgb'
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
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'uniforms' : {
                        'first' : {
                            'x' : 0.0,
                            'y' : 0.0,
                            'z' : 0.0
                        }
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused uniforms are ignored.
        var context = createContext();
        var material = new Material({
            'context' : context,
            'strict' : false,
            'fabric' : {
                'uniforms' : {
                    'first' : {
                        'x' : 0.0,
                        'y' : 0.0,
                        'z' : 0.0
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
                'context' : context,
                'strict' : true,
                'fabric' : {
                    'materials' : {
                        'first' : {
                            'id' : 'DiffuseMapMaterial'
                        }
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused materials are ignored.
        var context = createContext();
        var material = new Material({
            'context' : context,
            'strict' : false,
            'fabric' : {
                'materials' : {
                    'first' : {
                        'id' : 'DiffuseMapMaterial'
                    }
                }
            }
        });
        var pixel = renderMaterial(material, context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
