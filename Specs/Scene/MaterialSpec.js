/*global defineSuite*/
defineSuite([
        'Scene/Material',
        'Scene/Polygon',
        'Scene/PolylineCollection',
        'Specs/createContext',
        'Specs/destroyContext',
        'Specs/createCamera',
        'Specs/createFrameState',
        'Specs/frameState',
        'Specs/render',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/Matrix4',
        'Core/Math',
        'Core/JulianDate'
    ], function(
        Material,
        Polygon,
        PolylineCollection,
        createContext,
        destroyContext,
        createCamera,
        createFrameState,
        frameState,
        render,
        Cartesian3,
        Cartographic,
        Color,
        Ellipsoid,
        Matrix4,
        CesiumMath,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var polygon;
    var polylines;
    var polyline;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        us = context.getUniformState();
        us.update(createFrameState(createCamera(context, new Cartesian3(1.02, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z)));

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
        ]);

        polylines = new PolylineCollection();
        polyline = polylines.add({
            positions : [
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 0.0, 0.0)),
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees( 50.0, 0.0, 0.0))
            ],
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

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polygon);
        return context.readPixels();
    }

    function renderPolylineMaterial(material) {
        polyline.setMaterial(material);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        return context.readPixels();
    }

    function verifyMaterial(type) {
        var material = new Material({
            context : context,
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
            context : context,
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

    it('draws Reflection built-in material', function() {
        verifyMaterial('Reflection');
    });

    it('draws Refraction built-in material', function() {
        verifyMaterial('Refraction');
    });

    it('draws Fresnel built-in material', function() {
        verifyMaterial('Fresnel');
    });

    it('draws Brick built-in material', function() {
        verifyMaterial('Brick');
    });

    it('draws Wood built-in material', function() {
        verifyMaterial('Wood');
    });

    it('draws Asphalt built-in material', function() {
        verifyMaterial('Asphalt');
    });

    it('draws Cement built-in material', function() {
        verifyMaterial('Cement');
    });

    it('draws Grass built-in material', function() {
        verifyMaterial('Grass');
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

    it('draws TieDye built-in material', function() {
        verifyMaterial('TieDye');
    });

    it('draws Facet built-in material', function() {
        verifyMaterial('Facet');
    });

    it('draws Water built-in material', function() {
        verifyMaterial('Water');
    });

    it('draws Blob built-in material', function() {
        verifyMaterial('Blob');
    });

    it('draws RimLighting built-in material', function() {
        verifyMaterial('RimLighting');
    });

    it('draws Erosion built-in material', function() {
        verifyMaterial('Erosion');
    });

    it('draws Fade built-in material', function() {
        verifyMaterial('Fade');
    });

    it('draws PolylineArrow built-in material', function() {
        verifyPolylineMaterial('PolylineArrow');
    });

    it('draws PolylineOutline built-in material', function() {
        verifyPolylineMaterial('PolylineOutline');
    });

    it('gets the material type', function() {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                type : 'Color'
            }
        });
        expect(material.type).toEqual('Color');
    });

    it('creates a new material type and builds off of it', function() {
        var material1 = new Material({
            context : context,
            strict : true,
            fabric : {
                type : 'New',
                components : {
                    diffuse : 'vec3(0.0, 0.0, 0.0)'
                }
            }
        });

        var material2 = new Material({
            context : context,
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
            context : context,
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
            context : context,
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
            context : context,
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

    it('creates a material with a cube map uniform' , function () {
        var material = new Material({
            context : context,
            strict : true,
            fabric : {
                type : 'Reflection',
                uniforms : {
                    cubeMap : {
                        positiveX : './Data/Images/Blue.png',
                        negativeX : './Data/Images/Blue.png',
                        positiveY : './Data/Images/Blue.png',
                        negativeY : './Data/Images/Blue.png',
                        positiveZ : './Data/Images/Blue.png',
                        negativeZ : './Data/Images/Blue.png'
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
            context : context,
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
            context : context,
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
            context : context,
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
            context : context,
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
        var material = Material.fromType(context, 'Color');
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
    });

    it('create multiple materials from the same type', function() {
        var material1 = Material.fromType(context, 'Color');
        material1.uniforms.color = new Color(0.0, 1.0, 0.0, 1.0);

        var material2 = Material.fromType(context, 'Color');
        material2.uniforms.color = new Color(0.0, 0.0, 1.0, 1.0);

        expect(material1.shaderSource).toEqual(material2.shaderSource);

        var pixel = renderMaterial(material2);
        expect(pixel).toEqual([0, 0, 255, 255]);

        pixel = renderMaterial(material1);
        expect(pixel).toEqual([0, 255, 0, 255]);
    });

    it('create material with sub-materials of the same type', function() {
        var material = new Material({
            context : context,
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

    it('throws without context for material that uses images', function() {
        expect(function() {
            return new Material({
                context : undefined,
                fabric : {
                    type : 'DiffuseMap'
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
                    components : {
                        diffuse : 'vec3(0.0, 0.0, 0.0)'
                    },
                    source : 'czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n' +
                             'czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                             'return material;\n}\n'
                }
            });
        }).toThrow();

        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    type : 'DiffuseMap',
                    components : {
                        diffuse : 'vec3(0.0, 0.0, 0.0)'
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
                    uniforms : {
                        first : 0.0,
                        second : 0.0
                    },
                    materials : {
                        second : {}
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
                    invalid : 3.0
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
                    components : {
                        difuse : 'vec3(0.0, 0.0, 0.0)'
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
        }).toThrow();

        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    uniforms : {
                        value : [0.0, 0.0, 0.0, 0.0, 0.0]
                    }
                }
            });
        }).toThrow();
    });

    it('throws with unused channels', function() {
        expect(function() {
            return new Material({
                context : context,
                strict : true,
                fabric : {
                    uniforms : {
                        nonexistant : 'rgb'
                    }
                }
            });
        }).toThrow();

        // If strict is false, unused uniform strings are ignored.
        var material = new Material({
            context : context,
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
                context : context,
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
        }).toThrow();

        // If strict is false, unused uniforms are ignored.
        var material = new Material({
            context : context,
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
                context : context,
                strict : true,
                fabric : {
                    materials : {
                        first : {
                            type : 'DiffuseMap'
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

    it('throws with invalid uniform set after creation', function() {
        expect(function() {
            var material = new Material({
                context : context,
                strict : true,
                fabric : {
                    uniforms : {
                        value : 0.5
                    },
                    components : {
                        diffuse : 'vec3(value)'
                    }
                }
            });
            material.uniforms.value = {x : 0.5, y : 0.5};
            renderMaterial(material);
        }).toThrow();
    });

    it('throws with invalid type sent to fromType', function() {
        expect(function() {
            return Material.fromType(context, 'Nothing');
        }).toThrow();
    });

    it('destroys material with texture', function() {
        var material = Material.fromType(context, Material.DiffuseMapType);
        material.uniforms.image = './Data/Images/Green.png';
        var pixel = renderMaterial(material);
        expect(pixel).not.toEqual([0, 0, 0, 0]);
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
    });

    it('destroys sub-materials', function() {
        var material = new Material({
            context : context,
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
