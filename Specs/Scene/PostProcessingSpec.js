defineSuite([
        'Core/Cartesian3',
        'Core/defined',
        'Core/destroyObject',
        'Core/HeadingPitchRoll',
        'Core/Transforms',
        'Scene/Model',
        'Scene/PostProcessLibrary',
        'Renderer/Pass',
        'Renderer/RenderState',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], 'Scene/PostProcessing', function(
        Cartesian3,
        defined,
        destroyObject,
        HeadingPitchRoll,
        Transforms,
        Model,
        PostProcessLibrary,
        Pass,
        RenderState,
        createCanvas,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene({
            canvas : createCanvas(3, 3)
        });
        scene.postProcessCollection.fxaa.enabled = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.postProcessCollection.removeAll();
        scene.primitives.removeAll();
    });

    var ViewportPrimitive = function(fragmentShader) {
        this._fs = fragmentShader;
        this._command = undefined;
    };

    ViewportPrimitive.prototype.update = function(frameState) {
        if (!defined(this._command)) {
            this._command = frameState.context.createViewportQuadCommand(this._fs, {
                renderState : RenderState.fromCache(),
                pass : Pass.OPAQUE
            });
        }
        frameState.commandList.push(this._command);
    };

    ViewportPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    ViewportPrimitive.prototype.destroy = function() {
        if (defined(this._command)) {
            this._command.shaderProgram = this._command.shaderProgram && this._command.shaderProgram.destroy();
        }
        return destroyObject(this);
    };

    it('black and white', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(255);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(0);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });

        scene.postProcessCollection.add(PostProcessLibrary.createBlackAndWhiteStage());
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toEqual(rgba[0]);
            expect(rgba[2]).toEqual(rgba[0]);
            expect(rgba[3]).toEqual(255);

            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(rgba[0]);
                    expect(rgba[k + 1]).toEqual(rgba[1]);
                    expect(rgba[k + 2]).toEqual(rgba[2]);
                    expect(rgba[k + 3]).toEqual(rgba[3]);
                }
            }
        });
    });

    it('brightness', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = vec4(vec3(0.25), 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        var red;
        var green;
        var blue;
        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqualEpsilon(Math.floor(255 * 0.25), 1.0);
                    expect(rgba[k + 1]).toEqual(rgba[k]);
                    expect(rgba[k + 2]).toEqual(rgba[k]);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }

            red = rgba[0];
            green = rgba[1];
            blue = rgba[2];
        });

        scene.postProcessCollection.add(PostProcessLibrary.createBrightnessStage());
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(red);
            expect(rgba[1]).not.toEqual(green);
            expect(rgba[2]).not.toEqual(blue);
            expect(rgba[3]).toEqual(255);

            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(rgba[0]);
                    expect(rgba[k + 1]).toEqual(rgba[1]);
                    expect(rgba[k + 2]).toEqual(rgba[2]);
                    expect(rgba[k + 3]).toEqual(rgba[3]);
                }
            }
        });
    });

    it('eightBit', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = all(equal(floor(gl_FragCoord.xy), vec2(1.0, 1.0))) ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 1.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    if (i === 1 && j === 1) {
                        continue;
                    }
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(0);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(255);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });

        scene.postProcessCollection.add(PostProcessLibrary.createEightBitStage());
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);

            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(rgba[0]);
                    expect(rgba[k + 1]).toEqual(rgba[1]);
                    expect(rgba[k + 2]).toEqual(rgba[2]);
                    expect(rgba[k + 3]).toEqual(rgba[3]);
                }
            }
        });
    });

    it('night vision', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(255);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(0);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });

        scene.postProcessCollection.add(PostProcessLibrary.createNightVisionStage());
        expect(scene).toRenderAndCall(function(rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(0);
                    expect(rgba[k + 1]).toBeGreaterThan(0);
                    expect(rgba[k + 2]).toEqual(0);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });
    });

    it('texture overlay', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(255);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(0);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });

        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        var context = canvas.getContext('2d');
        context.fillStyle = '#0000FF';
        context.fillRect(0, 0, 1, 1);

        var textureOverlay = scene.postProcessCollection.add(PostProcessLibrary.createTextureOverlayStage());
        var uniforms = textureOverlay.uniforms;
        uniforms.alpha = 1.0;
        uniforms.texture = canvas.toDataURL();

        return pollToPromise(function() {
            scene.renderForSpecs();
            return scene.postProcessCollection.ready;
        }).then(function() {
            expect(scene).toRenderAndCall(function(rgba) {
                for (var i = 0; i < 3; ++i) {
                    for (var j = 0; j < 3; ++j) {
                        var k = i * 4 * 3 + 4 * j;
                        expect(rgba[k]).toEqual(0);
                        expect(rgba[k + 1]).toEqual(0);
                        expect(rgba[k + 2]).toEqual(255);
                        expect(rgba[k + 3]).toEqual(255);
                    }
                }
            });
        });
    });

    it('depth view', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(255);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(0);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });

        scene.postProcessCollection.add(PostProcessLibrary.createDepthViewStage());
        expect(scene).toRenderAndCall(function(rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(255);
                    expect(rgba[k + 1]).toEqual(255);
                    expect(rgba[k + 2]).toEqual(255);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }
        });
    });

    it('blur', function() {
        var fs =
            'void main() { \n' +
            '    gl_FragColor = all(equal(floor(gl_FragCoord.xy), vec2(1.0, 1.0))) ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 1.0, 1.0); \n' +
            '} \n';
        scene.primitives.add(new ViewportPrimitive(fs));

        expect(scene).toRenderAndCall(function (rgba) {
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    if (i === 1 && j === 1) {
                        continue;
                    }
                    var k = i * 4 * 3 + 4 * j;
                    expect(rgba[k]).toEqual(0);
                    expect(rgba[k + 1]).toEqual(0);
                    expect(rgba[k + 2]).toEqual(255);
                    expect(rgba[k + 3]).toEqual(255);
                }
            }

            expect(rgba[16]).toEqual(255);
            expect(rgba[17]).toEqual(0);
            expect(rgba[18]).toEqual(0);
            expect(rgba[19]).toEqual(255);
        });

        scene.postProcessCollection.add(PostProcessLibrary.createBlurStage());
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[16]).toBeGreaterThan(0);
            expect(rgba[17]).toEqual(0);
            expect(rgba[18]).toBeGreaterThan(0);
            expect(rgba[19]).toEqual(255);
        });
    });

    it('depth of field', function() {
        var origin = Cartesian3.fromDegrees(-123.0744619, 44.0503706, 100.0);
        var modelMatrix = Transforms.headingPitchRollToFixedFrame(origin, new HeadingPitchRoll());

        var model = scene.primitives.add(Model.fromGltf({
            url : './Data/Models/Box/CesiumBoxTest.gltf',
            modelMatrix : modelMatrix,
            scale : 40.0
        }));

        var ready = false;
        model.readyPromise.then(function() {
            ready = true;
        });

        var offset = new Cartesian3(-37.048378684557974, -24.852967044804245, 4.352023653686047);
        scene.camera.lookAt(origin, offset);

        return pollToPromise(function() {
            scene.render();
            return ready;
        }).then(function() {
            expect(scene).toRenderAndCall(function(rgba) {
                for (var i = 0; i < rgba.length; i += 4) {
                    expect(rgba[i]).toBeGreaterThan(0);
                    expect(rgba[i + 1]).toEqual(0);
                    expect(rgba[i + 2]).toEqual(0);
                    expect(rgba[i + 3]).toEqual(255);
                }

                scene.postProcessCollection.add(PostProcessLibrary.createDepthOfFieldStage());
                expect(scene).toRenderAndCall(function(rgba2) {
                    for (var i = 0; i < rgba.length; i += 4) {
                        expect(rgba2[i]).toBeGreaterThan(0);
                        expect(rgba2[i + 1]).toEqual(0);
                        expect(rgba2[i + 2]).toEqual(0);
                        expect(rgba2[i + 3]).toEqual(255);

                        expect(rgba2[i]).not.toEqual(rgba[i]);
                    }
                });
            });
        });
    });

}, 'WebGL');
