/*global defineSuite*/
defineSuite([
        'Scene/Material',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/Math',
        'Renderer/ClearCommand',
        'Scene/Polygon',
        'Scene/PolylineCollection',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/render'
    ], function(
        Material,
        Cartesian3,
        Color,
        Ellipsoid,
        CesiumMath,
        ClearCommand,
        Polygon,
        PolylineCollection,
        createCamera,
        createContext,
        createFrameState,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var polygon;
    var polylines;
    var polyline;
    var us;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        us = context.uniformState;
        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(1.02, 0.0, 0.0)
        })));

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.positions = Cartesian3.fromDegreesArray([
            -50.0, -50.0,
            50.0, -50.0,
            50.0, 50.0,
            -50.0, 50.0
        ], ellipsoid);
        polygon.asynchronous = false;

        polylines = new PolylineCollection();
        polyline = polylines.add({
            positions : Cartesian3.fromDegreesArray([
                -50.0, 0.0,
                50.0, 0.0
            ], ellipsoid),
            width : 5.0
        });
    });

    afterEach(function() {
        polygon = polygon && polygon.destroy();
        polylines = polylines && polylines.destroy();
        us = undefined;
    });

    function renderMaterial(material) {
        polygon.material = material;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polygon);
        return context.readPixels();
    }

    function renderPolylineMaterial(material) {
        polyline.material = material;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        return context.readPixels();
    }

    function verifyMaterial(type) {
        var material = new Material({
            strict : true,
            fabric : {
                type : type
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    }

    function verifyPolylineMaterial(type) {
        var material = new Material({
            strict : true,
            fabric : {
                type : type
            }
        });
        var pixel = renderPolylineMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    }

    it('draws Color built-in material', function() {
        verifyMaterial('Color');
    });

    it('draws Image built-in material', function() {
        verifyMaterial('Image');
    });

    it('draws DiffuseMap built-in material', function() {
        verifyMaterial('DiffuseMap');
    });

    it('draws AlphaMap built-in material', function() {
        verifyMaterial('AlphaMap');
    });

    it('draws SpecularMap built-in material', function() {
        verifyMaterial('SpecularMap');
    });

    it('draws EmissionMap built-in material', function() {
        verifyMaterial('EmissionMap');
    });

    it('draws BumpMap built-in material', function() {
        verifyMaterial('BumpMap');
    });

    it('draws NormalMap built-in material', function() {
        verifyMaterial('NormalMap');
    });

    it('draws Grid built-in material', function() {
        verifyMaterial('Grid');
    });

    it('draws Stripe built-in material', function() {
        verifyMaterial('Stripe');
    });

    it('draws Checkerboard built-in material', function() {
        verifyMaterial('Checkerboard');
    });

    it('draws Dot built-in material', function() {
        verifyMaterial('Dot');
    });

    it('draws Water built-in material', function() {
        verifyMaterial('Water');
    });

    it('draws RimLighting built-in material', function() {
        verifyMaterial('RimLighting');
    });

    it('draws Fade built-in material', function() {
        verifyMaterial('Fade');
    });

    it('draws PolylineArrow built-in material', function() {
        verifyPolylineMaterial('PolylineArrow');
    });

    it('draws PolylineGlow built-in material', function() {
        verifyPolylineMaterial('PolylineGlow');
    });

    it('draws PolylineOutline built-in material', function() {
        verifyPolylineMaterial('PolylineOutline');
    });

    it('gets the material type', function() {
        var material = new Material({
            strict : true,
            fabric : {
                type : 'Color'
            }
        });
        expect(material.type).toEqual('Color');
    });

    it('creates opaque/translucent materials', function() {
        var material = new Material({
            translucent : true,
            strict : true,
            fabric : {
                type : 'Color'
            }
        });
        expect(material.isTranslucent()).toEqual(true);

        material = new Material({
            translucent : false,
            strict : true,
            fabric : {
                type : 'Color'
            }
        });
        expect(material.isTranslucent()).toEqual(false);
    });

    it('creates a new material type and builds off of it', function() {
        var material1 = new Material({
            strict : true,
            fabric : {
                type : 'New',
                components : {
                    diffuse : 'vec3(0.0, 0.0, 0.0)'
                }
            }
        });

        var material2 = new Material({
            strict : true,
            fabric : {
                materials : {
                    first : {
                        type : 'New'
                    }
                },
                components : {
                    diffuse : 'first.diffuse'
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
            strict : true,
            fabric : {
                materials : {
                    first : {
                        type : 'DiffuseMap'
                    }
                },
                uniforms : {
                    value : {
                        x : 0.0,
                        y : 0.0,
                        z : 0.0
                    }
                },
                components : {
                    diffuse : 'value + first.diffuse'
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
            strict : true,
            fabric : {
                materials : {
                    first : {
                        materials : {
                            second : {
                                components : {
                                    diffuse : 'vec3(0.0, 0.0, 0.0)'
                                }
                            }
                        },
                        components : {
                            diffuse : 'second.diffuse'
                        }
                    }
                },
                components : {
                    diffuse : 'first.diffuse'
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material with an image uniform', function () {
        var material = new Material({
            strict : true,
            fabric : {
                type : 'DiffuseMap',
                uniforms : {
                    image :  './Data/Images/Blue.png'
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material with a cube map uniform', function() {
        var material = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    cubeMap : {
                        positiveX : './Data/Images/Blue.png',
                        negativeX : './Data/Images/Blue.png',
                        positiveY : './Data/Images/Blue.png',
                        negativeY : './Data/Images/Blue.png',
                        positiveZ : './Data/Images/Blue.png',
                        negativeZ : './Data/Images/Blue.png'
                    }
                },
                source : 'uniform samplerCube cubeMap;\n' +
                    'czm_material czm_getMaterial(czm_materialInput materialInput)\n' +
                    '{\n' +
                    '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                    '    material.diffuse = textureCube(cubeMap, vec3(1.0)).xyz;\n' +
                    '    return material;\n' +
                    '}\n'
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('does not crash if source uniform is formatted differently', function() {
        var material = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    cubeMap : {
                        positiveX : './Data/Images/Blue.png',
                        negativeX : './Data/Images/Blue.png',
                        positiveY : './Data/Images/Blue.png',
                        negativeY : './Data/Images/Blue.png',
                        positiveZ : './Data/Images/Blue.png',
                        negativeZ : './Data/Images/Blue.png'
                    }
                },
                source : 'uniform   samplerCube   cubeMap  ;\r\n' +
                    'czm_material czm_getMaterial(czm_materialInput materialInput)\r\n' +
                    '{\r\n' +
                    '    czm_material material = czm_getDefaultMaterial(materialInput);\r\n' +
                    '    material.diffuse = textureCube(cubeMap, vec3(1.0)).xyz;\r\n' +
                    '    return material;\r\n' +
                    '}'
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material with a boolean uniform', function () {
        var material = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    value : true
                },
                components : {
                    diffuse : 'float(value) * vec3(1.0)'
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create a material with a matrix uniform', function () {
        var material1 = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    value : [0.5, 0.5, 0.5, 0.5]
                },
                components : {
                    diffuse : 'vec3(value[0][0], value[0][1], value[1][0])',
                    alpha : 'value[1][1]'
                }
            }
        });
        var pixel = renderMaterial(material1);
        expect(pixel).not.toEqual([0, 0, 0, 0]);

        var material2 = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    value : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
                },
                components : {
                    diffuse : 'vec3(value[0][0], value[0][1], value[1][0])',
                    alpha : 'value[2][2]'
                }
            }
        });
        pixel = renderMaterial(material2);
        expect(pixel).not.toEqual([0, 0, 0, 0]);

        var material3 = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    value : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
                },
                components : {
                    diffuse : 'vec3(value[0][0], value[0][1], value[1][0])',
                    alpha : 'value[3][3]'
                }
            }
        });
        pixel = renderMaterial(material3);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('creates a material using unusual uniform and material names', function () {
        var material = new Material({
            strict : true,
            fabric : {
                uniforms : {
                    i : 0.5
                },
                materials : {
                    d : {
                        type : 'Color'
                    },
                    diffuse : {
                        type : 'Color'
                    }
                },
                components : {
                    diffuse : '(d.diffuse + diffuse.diffuse)*i',
                    specular : 'i'
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create a material using fromType', function () {
        var material = Material.fromType('Color');
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create material using fromType and overide default uniforms', function() {
        var material1 = Material.fromType('Color', {
            color : new Color(0.0, 1.0, 0.0, 1.0)
        });

        var pixel = renderMaterial(material1);
        expect(pixel).toEqual([0, 255, 0, 255]);
    });

    it('create multiple materials from the same type', function() {
        var material1 = Material.fromType('Color', {
            color : new Color(0.0, 1.0, 0.0, 1.0)
        });

        var material2 = Material.fromType('Color', {
            color : new Color(0.0, 0.0, 1.0, 1.0)
        });

        expect(material1.shaderSource).toEqual(material2.shaderSource);

        var pixel = renderMaterial(material2);
        expect(pixel).toEqual([0, 0, 255, 255]);

        pixel = renderMaterial(material1);
        expect(pixel).toEqual([0, 255, 0, 255]);
    });

    it('create material with sub-materials of the same type', function() {
        var material = new Material({
            fabric : {
                materials : {
                    color1 : {
                        type : 'Color',
                        uniforms : {
                            color : new Color(0.0, 1.0, 0.0, 1.0)
                        }
                    },
                    color2 : {
                        type : 'Color',
                        uniforms : {
                            color : new Color(0.0, 0.0, 1.0, 1.0)
                        }
                    }
                },
                components : {
                    diffuse : 'color1.diffuse + color2.diffuse'
                }
            }
        });

        var pixel = renderMaterial(material);
        expect(pixel).toEqual([0, 255, 255, 255]);
    });

    it('throws with source and components in same template', function () {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    components : {
                        diffuse : 'vec3(0.0, 0.0, 0.0)'
                    },
                    source : 'czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n' +
                             'czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                             'return material;\n}\n'
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    type : 'DiffuseMap',
                    components : {
                        diffuse : 'vec3(0.0, 0.0, 0.0)'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('throws with duplicate names in materials and uniforms', function () {
        expect(function() {
            return new Material({
                strict : false,
                fabric : {
                    uniforms : {
                        first : 0.0,
                        second : 0.0
                    },
                    materials : {
                        second : {}
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('throws with invalid template type', function() {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    invalid : 3.0
                }
            });
        }).toThrowDeveloperError();
    });

    it('throws with invalid component type', function () {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    components : {
                        difuse : 'vec3(0.0, 0.0, 0.0)'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('throws with invalid uniform type', function() {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    uniforms : {
                        value : {
                            x : 0.0,
                            y : 0.0,
                            z : 0.0,
                            w : 0.0,
                            t : 0.0
                        }
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    uniforms : {
                        value : [0.0, 0.0, 0.0, 0.0, 0.0]
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('throws with unused channels', function() {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    uniforms : {
                        nonexistant : 'rgb'
                    }
                }
            });
        }).toThrowDeveloperError();

        // If strict is false, unused uniform strings are ignored.
        var material = new Material({
            strict : false,
            fabric : {
                uniforms : {
                    nonexistant : 'rgb'
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws with unused uniform', function() {
        expect(function() {
            return new Material({
                strict : true,
                fabric : {
                    uniforms : {
                        first : {
                            x : 0.0,
                            y : 0.0,
                            z : 0.0
                        }
                    }
                }
            });
        }).toThrowDeveloperError();

        // If strict is false, unused uniforms are ignored.
        var material = new Material({
            strict : false,
            fabric : {
                uniforms : {
                    first : {
                        x : 0.0,
                        y : 0.0,
                        z : 0.0
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
                strict : true,
                fabric : {
                    materials : {
                        first : {
                            type : 'DiffuseMap'
                        }
                    }
                }
            });
        }).toThrowDeveloperError();

        // If strict is false, unused materials are ignored.
        var material = new Material({
            strict : false,
            fabric : {
                materials : {
                    first : {
                        type : 'DiffuseMap'
                    }
                }
            }
        });
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('throws with invalid type sent to fromType', function() {
        expect(function() {
            return Material.fromType('Nothing');
        }).toThrowDeveloperError();
    });

    it('destroys material with texture', function() {
        var material = Material.fromType(Material.DiffuseMapType);
        material.uniforms.image = './Data/Images/Green.png';
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
    });

    it('destroys sub-materials', function() {
        var material = new Material({
            strict : true,
            fabric : {
                materials : {
                    diffuseMap : {
                        type : 'DiffuseMap'
                    }
                },
                uniforms : {
                    value : {
                        x : 0.0,
                        y : 0.0,
                        z : 0.0
                    }
                },
                components : {
                    diffuse : 'value + diffuseMap.diffuse'
                }
            }
        });
        material.materials.diffuseMap.uniforms.image = './Data/Images/Green.png';

        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);

        var diffuseMap = material.materials.diffuseMap;
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
        expect(diffuseMap.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
