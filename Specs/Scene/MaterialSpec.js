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
        var materialTypes = ['ColorMaterial', 'DiffuseMapMaterial', 'AlphaMapMaterial', 'DiffuseAlphaMapMaterial',
            'SpecularMapMaterial', 'EmissionMapMaterial', 'BumpMapMaterial', 'NormalMapMaterial','ReflectionMaterial',
            'RefractionMaterial', 'FresnelMaterial', 'BrickMaterial', 'WoodMaterial', 'AsphaltMaterial', 'CementMaterial',
            'GrassMaterial', 'HorizontalStripeMaterial', 'VerticalStripeMaterial', 'CheckerboardMaterial','DotMaterial',
            'TieDyeMaterial', 'FacetMaterial', 'BlobMaterial'];
        for (var i = 0; i < materialTypes.length; i++) {
            var materialID = materialTypes[i];
            var context = createContext();
            var material = new Material({
                'context' : context,
                'template' : {
                    'id' : materialID
                }
            });
            var pixel = renderMaterial(material, context);
            expect(pixel).not.toEqualArray([0, 0, 0, 0]);
            destroyContext(context);
        }
    });

    // make some composite materials

    it('throws without context', function() {
        expect(function() {
            return new Material();
        }).toThrow();
    });

    it('throws with source and components in same template', function () {
        expect(function() {
            var context = createContext();
            return new Material({
                'context' : context,
                'strict' : true,
                'template' : {
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
                'template' : {
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
                'template' : {
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
                'template' : {
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
                'template' : {
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
                'template' : {
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
                'template' : {
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
                'template' : {
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
            'template' : {
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
                'template' : {
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
            'template' : {
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
                'template' : {
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
            'template' : {
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
