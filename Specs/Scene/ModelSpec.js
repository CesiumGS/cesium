/*global defineSuite*/
defineSuite([
        'Scene/Model',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/CesiumTerrainProvider',
        'Core/clone',
        'Core/combine',
        'Core/defaultValue',
        'Core/defined',
        'Core/defineProperties',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/FeatureDetection',
        'Core/HeadingPitchRange',
        'Core/JulianDate',
        'Core/loadArrayBuffer',
        'Core/loadJson',
        'Core/Math',
        'Core/Matrix4',
        'Core/Matrix3',
        'Core/PrimitiveType',
        'Core/Transforms',
        'Renderer/RenderState',
        'Renderer/ShaderSource',
        'Renderer/WebGLConstants',
        'Scene/HeightReference',
        'Scene/ModelAnimationLoop',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        Model,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CesiumTerrainProvider,
        clone,
        combine,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        Event,
        FeatureDetection,
        HeadingPitchRange,
        JulianDate,
        loadArrayBuffer,
        loadJson,
        CesiumMath,
        Matrix4,
        Matrix3,
        PrimitiveType,
        Transforms,
        RenderState,
        ShaderSource,
        WebGLConstants,
        HeightReference,
        ModelAnimationLoop,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var boxUrl = './Data/Models/Box/CesiumBoxTest.gltf';
    var boxNoTechniqueUrl = './Data/Models/Box/CesiumBoxTest-NoTechnique.gltf';
    var boxNoIndicesUrl = './Data/Models/Box-NoIndices/box-noindices.gltf';
    var texturedBoxUrl = './Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf';
    var texturedBoxSeparateUrl = './Data/Models/Box-Textured-Separate/CesiumTexturedBoxTest.gltf';
    var texturedBoxCustomUrl = './Data/Models/Box-Textured-Custom/CesiumTexturedBoxTest.gltf';
    var texturedBoxKhrBinaryUrl = './Data/Models/Box-Textured-Binary/CesiumTexturedBoxTest.glb';
    var boxRtcUrl = './Data/Models/Box-RTC/Box.gltf';
    var cesiumAirUrl = './Data/Models/CesiumAir/Cesium_Air.gltf';
    var cesiumAir_0_8Url = './Data/Models/CesiumAir/Cesium_Air_0_8.gltf';
    var animBoxesUrl = './Data/Models/anim-test-1-boxes/anim-test-1-boxes.gltf';
    var riggedFigureUrl = './Data/Models/rigged-figure-test/rigged-figure-test.gltf';
    var riggedSimpleUrl = './Data/Models/rigged-simple/rigged-simple.gltf';

    var boxConstantUrl = './Data/Models/MaterialsCommon/BoxConstant.gltf';
    var boxLambertUrl = './Data/Models/MaterialsCommon/BoxLambert.gltf';
    var boxBlinnUrl = './Data/Models/MaterialsCommon/BoxBlinn.gltf';
    var boxPhongUrl = './Data/Models/MaterialsCommon/BoxPhong.gltf';
    var boxNoLightUrl = './Data/Models/MaterialsCommon/BoxNoLight.gltf';
    var boxAmbientLightUrl = './Data/Models/MaterialsCommon/BoxAmbientLight.gltf';
    var boxDirectionalLightUrl = './Data/Models/MaterialsCommon/BoxDirectionalLight.gltf';
    var boxPointLightUrl = './Data/Models/MaterialsCommon/BoxPointLight.gltf';
    var boxSpotLightUrl = './Data/Models/MaterialsCommon/BoxSpotLight.gltf';
    var boxTransparentUrl = './Data/Models/MaterialsCommon/BoxTransparent.gltf';
    var boxColorUrl = './Data/Models/Box-Color/Box-Color.gltf';
    var boxQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/Box-Quantized.gltf';
    var boxColorQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/Box-Color-Quantized.gltf';
    var boxScalarQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/Box-Scalar-Quantized.gltf';
    var milkTruckQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/CesiumMilkTruck-Quantized.gltf';
    var milkTruckQuantizedMismatchUrl = './Data/Models/WEB3DQuantizedAttributes/CesiumMilkTruck-Mismatch-Quantized.gltf';
    var duckQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/Duck-Quantized.gltf';
    var riggedSimpleQuantizedUrl = './Data/Models/WEB3DQuantizedAttributes/RiggedSimple-Quantized.gltf';
    var CesiumManUrl = './Data/Models/MaterialsCommon/Cesium_Man.gltf';

    var texturedBoxModel;
    var cesiumAirModel;
    var animBoxesModel;
    var riggedFigureModel;

    var scene;
    var primitives;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;

        var modelPromises = [];
        modelPromises.push(loadModel(texturedBoxUrl).then(function(model) {
            texturedBoxModel = model;
        }));
        modelPromises.push(loadModel(cesiumAirUrl, {
            minimumPixelSize : 1,
            maximumScale : 200,
            asynchronous : false
        }).then(function(model) {
            cesiumAirModel = model;
        }));
        modelPromises.push(loadModel(animBoxesUrl, {
            scale : 2.0
        }).then(function(model) {
            animBoxesModel = model;
        }));
        modelPromises.push(loadModel(riggedFigureUrl).then(function(model) {
            riggedFigureModel = model;
        }));

        return when.all(modelPromises);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);
    });

    function addZoomTo(model) {
        model.zoomTo = function() {
            var camera = scene.camera;
            var center = Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cartesian3());
            var r = 4.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
            camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
        };
    }

    function loadModel(url, options) {
        options = combine(options, {
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            url : url,
            id : url,
            show : false
        });

        var model = primitives.add(Model.fromGltf(options));
        addZoomTo(model);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }, { timeout: 10000 }).then(function() {
            return model;
        });
    }

    function loadModelJson(gltf, options) {
        options = combine(options, {
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            gltf : gltf,
            show : false
        });

        var model = primitives.add(new Model(options));
        addZoomTo(model);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }, { timeout: 10000 }).then(function() {
            return model;
        });
    }

    function verifyRender(model) {
        expect(model.ready).toBe(true);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        model.show = true;
        model.zoomTo();
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        model.show = false;
        return pixelColor;
    }

    it('fromGltf throws without options', function() {
        expect(function() {
            Model.fromGltf();
        }).toThrowDeveloperError();
    });

    it('fromGltf throws without options.url', function() {
        expect(function() {
            Model.fromGltf({});
        }).toThrowDeveloperError();
    });

    it('sets model properties', function() {
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0));

       expect(texturedBoxModel.gltf).toBeDefined();
       expect(texturedBoxModel.basePath).toEqual('./Data/Models/Box-Textured/');
       expect(texturedBoxModel.show).toEqual(false);
       expect(texturedBoxModel.modelMatrix).toEqual(modelMatrix);
       expect(texturedBoxModel.scale).toEqual(1.0);
       expect(texturedBoxModel.minimumPixelSize).toEqual(0.0);
       expect(texturedBoxModel.maximumScale).toBeUndefined();
       expect(texturedBoxModel.id).toEqual(texturedBoxUrl);
       expect(texturedBoxModel.allowPicking).toEqual(true);
       expect(texturedBoxModel.activeAnimations).toBeDefined();
       expect(texturedBoxModel.ready).toEqual(true);
       expect(texturedBoxModel.asynchronous).toEqual(true);
       expect(texturedBoxModel.releaseGltfJson).toEqual(false);
       expect(texturedBoxModel.cacheKey).toEndWith('Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf');
       expect(texturedBoxModel.debugShowBoundingVolume).toEqual(false);
       expect(texturedBoxModel.debugWireframe).toEqual(false);
    });

    it('renders', function() {
        verifyRender(texturedBoxModel);
    });

    it('renders in CV', function() {
        scene.morphToColumbusView(0.0);
        verifyRender(texturedBoxModel);
    });

    it('renders in 2D', function() {
        scene.morphTo2D(0.0);
        verifyRender(texturedBoxModel);
    });

    it('renders in 2D over the IDL', function() {
        return when(loadModel(texturedBoxUrl)).then(function(model) {
            model.modelMatrix = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(180.0, 0.0, 100.0));
            scene.morphTo2D(0.0);
            verifyRender(model);
        });
    });

    it('resolves readyPromise', function() {
        return texturedBoxModel.readyPromise.then(function(model) {
            verifyRender(model);
        });
    });

    it('rejects readyPromise on error', function() {
        var invalidGltf = clone(texturedBoxModel.gltf, true);
        invalidGltf.shaders.CesiumTexturedBoxTest0FS.uri = 'invalid.glsl';

        var model = primitives.add(new Model({
            gltf : invalidGltf
        }));

        scene.renderForSpecs();

        return model.readyPromise.then(function(model) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(model.ready).toEqual(false);
            primitives.remove(model);
        });
    });

    it('renders from glTF', function() {
        // Simulate using procedural glTF as opposed to loading it from a file
        return loadModelJson(texturedBoxModel.gltf).then(function(model) {
            verifyRender(model);
            primitives.remove(model);
        });
    });

    it('Applies the right render state', function() {
        spyOn(RenderState, 'fromCache').and.callThrough();

        // Simulate using procedural glTF as opposed to loading it from a file
        return loadModelJson(texturedBoxModel.gltf).then(function(model) {
            var rs = {
                frontFace : WebGLConstants.CCW,
                cull : {
                    enabled : true,
                    face : WebGLConstants.BACK
                },
                lineWidth : 1.0,
                polygonOffset : {
                    enabled : false,
                    factor : 0.0,
                    units : 0.0
                },
                scissorTest : {
                    enabled : false,
                    rectangle : {
                        x : 0.0,
                        y : 0.0,
                        width : 0.0,
                        height : 0.0
                    }
                },
                depthRange : {
                    near : 0.0,
                    far : 1.0
                },
                depthTest : {
                    enabled : true,
                    func : WebGLConstants.LESS
                },
                colorMask : {
                    red : true,
                    green : true,
                    blue : true,
                    alpha : true
                },
                depthMask : true,
                blending : {
                    enabled : false,
                    color : {
                        red : 0.0,
                        green : 0.0,
                        blue : 0.0,
                        alpha : 0.0
                    },
                    equationRgb : WebGLConstants.FUNC_ADD,
                    equationAlpha : WebGLConstants.FUNC_ADD,
                    functionSourceRgb : WebGLConstants.ONE,
                    functionSourceAlpha : WebGLConstants.ONE,
                    functionDestinationRgb : WebGLConstants.ZERO,
                    functionDestinationAlpha : WebGLConstants.ZERO
                }
            };

            expect(RenderState.fromCache).toHaveBeenCalledWith(rs);
            primitives.remove(model);
        });
    });

    it('renders bounding volume', function() {
        texturedBoxModel.debugShowBoundingVolume = true;
        verifyRender(texturedBoxModel);
        texturedBoxModel.debugShowBoundingVolume = false;
    });

    it('renders in wireframe', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        texturedBoxModel.show = true;
        texturedBoxModel.debugWireframe = true;
        texturedBoxModel.zoomTo();
        scene.renderForSpecs();

        var commands = texturedBoxModel._nodeCommands;
        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            expect(commands[i].command.primitiveType).toEqual(PrimitiveType.LINES);
        }

        texturedBoxModel.show = false;
        texturedBoxModel.debugWireframe = false;
    });

    it('getNode throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getNode('gltf-node-name');
        }).toThrowDeveloperError();
    });

    it('getNode throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getNode();
        }).toThrowDeveloperError();
    });

    it('getNode returns undefined when node does not exist', function() {
        expect(texturedBoxModel.getNode('name-of-node-that-does-not-exist')).not.toBeDefined();
    });

    it('getNode returns a node', function() {
        var node = texturedBoxModel.getNode('Mesh');
        expect(node).toBeDefined();
        expect(node.name).toEqual('Mesh');
        expect(node.id).toEqual('Geometry-mesh002Node');
        expect(node.show).toEqual(true);

        // Change node transform and render
        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);
        node.matrix = Matrix4.fromUniformScale(1.01, new Matrix4());
        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(true);

        verifyRender(texturedBoxModel);

        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);

        node.matrix = Matrix4.fromUniformScale(1.0, new Matrix4());
    });

    it('getMesh throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getMesh('gltf-mesh-name');
        }).toThrowDeveloperError();
    });

    it('getMesh throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getMesh();
        }).toThrowDeveloperError();
    });

    it('getMesh returns undefined when mesh does not exist', function() {
        expect(texturedBoxModel.getMesh('name-of-mesh-that-does-not-exist')).not.toBeDefined();
    });

    it('getMesh returns a mesh', function() {
        var mesh = texturedBoxModel.getMesh('Mesh');
        expect(mesh).toBeDefined();
        expect(mesh.name).toEqual('Mesh');
        expect(mesh.id).toEqual('Geometry-mesh002');
        expect(mesh.materials[0].name).toEqual('Texture');
    });

    it('getMaterial throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getMaterial('gltf-material-name');
        }).toThrowDeveloperError();
    });

    it('getMaterial throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getMaterial();
        }).toThrowDeveloperError();
    });

    it('getMaterial returns undefined when mesh does not exist', function() {
        expect(texturedBoxModel.getMaterial('name-of-material-that-does-not-exist')).not.toBeDefined();
    });

    it('getMaterial returns a material', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(material).toBeDefined();
        expect(material.name).toEqual('Texture');
        expect(material.id).toEqual('Effect-Texture');
    });

    it('ModelMaterial.setValue throws when name is not provided', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(function() {
            material.setValue();
        }).toThrowDeveloperError();
    });

    it('ModelMaterial.setValue sets a scalar parameter', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        material.setValue('shininess', 12.34);
        expect(material.getValue('shininess')).toEqual(12.34);
    });

    it('ModelMaterial.setValue sets a Cartesian4 parameter', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        var specular = new Cartesian4(0.25, 0.5, 0.75, 1.0);
        material.setValue('specular', specular);
        expect(material.getValue('specular')).toEqual(specular);
    });

    it('ModelMaterial.getValue throws when name is not provided', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(function() {
            material.getValue();
        }).toThrowDeveloperError();
    });

    it('ModelMaterial.getValue returns undefined when parameter does not exist', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(material.getValue('name-of-parameter-that-does-not-exist')).not.toBeDefined();
    });

    it('boundingSphere throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.boundingSphere;
        }).toThrowDeveloperError();
    });

    it('boundingSphere returns the bounding sphere', function() {
        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, 0.0, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(0.866, CesiumMath.EPSILON3);
    });

    it('boundingSphere returns the bounding sphere when scale property is set', function() {
        var originalScale = texturedBoxModel.scale;
        texturedBoxModel.scale = 10;

        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, 0.0, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

        texturedBoxModel.scale = originalScale;
    });

    it('boundingSphere returns the bounding sphere when maximumScale is reached', function() {
        var originalScale = texturedBoxModel.scale;
        var originalMaximumScale = texturedBoxModel.maximumScale;
        texturedBoxModel.scale = 20;
        texturedBoxModel.maximumScale = 10;

        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, 0.0, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

        texturedBoxModel.scale = originalScale;
        texturedBoxModel.maximumScale = originalMaximumScale;
    });

    it('boundingSphere returns the bounding sphere when modelMatrix has non-uniform scale', function() {
        var originalMatrix = Matrix4.clone(texturedBoxModel.modelMatrix);
        Matrix4.multiplyByScale(texturedBoxModel.modelMatrix, new Cartesian3(2, 5, 10), texturedBoxModel.modelMatrix);

        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, 0.0, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

        texturedBoxModel.modelMatrix = originalMatrix;
    });

    it('destroys', function() {
        return loadModel(boxUrl).then(function(m) {
            expect(m.isDestroyed()).toEqual(false);
            primitives.remove(m);
            expect(m.isDestroyed()).toEqual(true);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('Throws because of invalid extension', function() {
        return loadJson(boxUrl).then(function(gltf) {
            gltf.extensionsUsed = ['NOT_supported_extension'];
            var model = primitives.add(new Model({
                gltf : gltf
            }));

            expect(function() {
                scene.renderForSpecs();
            }).toThrowRuntimeError();
            primitives.remove(model);
        });
    });

    it('Throws because of invalid extension', function() {
        return loadJson(boxUrl).then(function(gltf) {
            gltf.extensionsUsed = ['CESIUM_binary_glTF'];
            var model = primitives.add(new Model({
                gltf : gltf
            }));

            expect(function() {
                scene.renderForSpecs();
            }).toThrowRuntimeError();
            primitives.remove(model);
        });
    });

    it('loads a glTF v0.8 model', function() {
        return loadModel(cesiumAir_0_8Url, {
            minimumPixelSize : 1
        }).then(function(m) {
            // 0.8 models had a number version. Verify it is converted to a string.
            expect(m.gltf.asset.version).toEqual('0.8');

            // Verify that rotation is converted from
            // Axis-Angle (1,0,0,0) to Quaternion (0,0,0,1)
            var rotation = m.gltf.nodes['Geometry-mesh005Node'].rotation;
            expect(rotation).toEqual([0.0, 0.0, 0.0, 1.0]);

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF model that doesn\'t have a technique', function() {
        return loadModel(boxNoTechniqueUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF model that doesn\'t have indices', function() {
        return loadModel(boxNoIndicesUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('renders texturedBoxCustom (all uniform semantics)', function() {
        return loadModel(texturedBoxCustomUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('renders a model with the KHR_binary_glTF extension', function() {
        return loadModel(texturedBoxKhrBinaryUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a model with the KHR_binary_glTF extension as an ArrayBuffer using new Model', function() {
        return loadArrayBuffer(texturedBoxKhrBinaryUrl).then(function(arrayBuffer) {
            return loadModelJson(arrayBuffer).then(function(model) {
                verifyRender(model);
                primitives.remove(model);
            });
        });
    });

    it('loads a model with the KHR_binary_glTF extension as an Uint8Array using new Model', function() {
        return loadArrayBuffer(texturedBoxKhrBinaryUrl).then(function(arrayBuffer) {
            return loadModelJson(new Uint8Array(arrayBuffer)).then(function(model) {
                verifyRender(model);
                primitives.remove(model);
            });
        });
    });

    it('Throws because of an invalid Binary glTF header - magic', function() {
        var arrayBuffer = new ArrayBuffer(16);
        expect(function() {
            return new Model({
                gltf : arrayBuffer
            });
        }).toThrowDeveloperError();
    });

    it('Throws because of an invalid Binary glTF header - version', function() {
        var arrayBuffer = new ArrayBuffer(16);
        var bytes = new Uint8Array(arrayBuffer);
        bytes[0] = 'g'.charCodeAt(0);
        bytes[1] = 'l'.charCodeAt(0);
        bytes[2] = 'T'.charCodeAt(0);
        bytes[3] = 'F'.charCodeAt(0);

        expect(function() {
            return new Model({
                gltf : arrayBuffer
            });
        }).toThrowDeveloperError();
    });

    it('renders a model with the CESIUM_RTC extension', function() {
        return loadModel(boxRtcUrl, {
            modelMatrix : Matrix4.IDENTITY,
            minimumPixelSize : 1
        }).then(function(m) {
            var bs = m.boundingSphere;
            expect(bs.center.equalsEpsilon(new Cartesian3(6378137.0, 0.0, 0.0), CesiumMath.EPSILON14));
            var radius = Math.sqrt(0.5 * 0.5 * 3);
            expect(bs.radius).toEqualEpsilon(radius, CesiumMath.EPSILON14);

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('renders textured box with external resources: .glsl, .bin, and .png files', function() {
        return loadModel(texturedBoxSeparateUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads cesiumAir', function() {
        expect(cesiumAirModel.minimumPixelSize).toEqual(1);
        expect(cesiumAirModel.maximumScale).toEqual(200);
        expect(cesiumAirModel.asynchronous).toEqual(false);
    });

    it('renders cesiumAir (has translucency)', function() {
        verifyRender(cesiumAirModel);
    });

    it('renders cesiumAir with per-node show (root)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        var commands = cesiumAirModel._nodeCommands;
        var i;
        var length;

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        cesiumAirModel.getNode('Cesium_Air').show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        length = commands.length;
        for (i = 0; i < length; ++i) {
            expect(commands[i].show).toEqual(false);
        }

        cesiumAirModel.getNode('Cesium_Air').show = true;
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

        length = commands.length;
        for (i = 0; i < length; ++i) {
            expect(commands[i].show).toEqual(true);
        }

        cesiumAirModel.show = false;
    });

    it('renders cesiumAir with per-node show (non-root)', function() {
        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var commands = cesiumAirModel._nodeCommands;
        var i;
        var length;

        var commandsPropFalse = 0;
        var commandsPropTrue = 0;

        cesiumAirModel.getNode('Prop').show = false;
        scene.renderForSpecs();

        length = commands.length;
        for (i = 0; i < length; ++i) {
            commandsPropFalse += commands[i].show ? 1 : 0;
        }

        cesiumAirModel.getNode('Prop').show = true;
        scene.renderForSpecs();

        length = commands.length;
        for (i = 0; i < length; ++i) {
            commandsPropTrue += commands[i].show ? 1 : 0;
        }

        cesiumAirModel.show = false;

        // Prop node has one mesh with two primitives
        expect(commandsPropFalse).toEqual(commandsPropTrue - 2);
    });

    it('picks cesiumAir', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(cesiumAirModel);
        expect(pick.id).toEqual(cesiumAirUrl);
        expect(pick.node).toBeDefined();
        expect(pick.mesh).toBeDefined();

        cesiumAirModel.show = false;
    });

    it('cesiumAir is picked with a new pick id', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        var oldId = cesiumAirModel.id;
        cesiumAirModel.id = 'id';
        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(cesiumAirModel);
        expect(pick.id).toEqual('id');

        cesiumAirModel.id = oldId;
        cesiumAirModel.show = false;
    });

    it('cesiumAir is not picked (show === false)', function() {
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders animBoxes without animation', function() {
        verifyRender(animBoxesModel);
    });

    it('adds and removes all animations', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);

        var spyAdd = jasmine.createSpy('listener');
        animations.animationAdded.addEventListener(spyAdd);
        var a = animations.addAll();
        expect(animations.length).toEqual(2);
        expect(spyAdd.calls.count()).toEqual(2);
        expect(spyAdd.calls.argsFor(0)[0]).toBe(animBoxesModel);
        expect(spyAdd.calls.argsFor(0)[1]).toBe(a[0]);
        expect(spyAdd.calls.argsFor(1)[0]).toBe(animBoxesModel);
        expect(spyAdd.calls.argsFor(1)[1]).toBe(a[1]);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a[0])).toEqual(true);
        expect(animations.get(0)).toEqual(a[0]);
        expect(animations.contains(a[1])).toEqual(true);
        expect(animations.get(1)).toEqual(a[1]);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        animations.removeAll();
        expect(animations.length).toEqual(0);
        expect(spyRemove.calls.count()).toEqual(2);
        expect(spyRemove.calls.argsFor(0)[0]).toBe(animBoxesModel);
        expect(spyRemove.calls.argsFor(0)[1]).toBe(a[0]);
        expect(spyRemove.calls.argsFor(1)[0]).toBe(animBoxesModel);
        expect(spyRemove.calls.argsFor(1)[1]).toBe(a[1]);
        animations.animationRemoved.removeEventListener(spyRemove);
    });

    it('addAll throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.addAll();
        }).toThrowDeveloperError();
    });

    it('addAll throws when speedup is less than or equal to zero.', function() {
        expect(function() {
            return animBoxesModel.activeAnimations.addAll({
                speedup : 0.0
            });
        }).toThrowDeveloperError();
    });

    it('adds and removes an animation', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);

        var spyAdd = jasmine.createSpy('listener');
        animations.animationAdded.addEventListener(spyAdd);
        var a = animations.add({
            name : 'animation_1'
        });
        expect(a).toBeDefined();
        expect(a.name).toEqual('animation_1');
        expect(a.startTime).not.toBeDefined();
        expect(a.delay).toEqual(0.0);
        expect(a.stopTime).not.toBeDefined();
        expect(a.removeOnStop).toEqual(false);
        expect(a.speedup).toEqual(1.0);
        expect(a.reverse).toEqual(false);
        expect(a.loop).toEqual(ModelAnimationLoop.NONE);
        expect(a.start).toBeDefined();
        expect(a.update).toBeDefined();
        expect(a.stop).toBeDefined();
        expect(spyAdd).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a)).toEqual(true);
        expect(animations.get(0)).toEqual(a);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        expect(animations.remove(a)).toEqual(true);
        expect(animations.remove(a)).toEqual(false);
        expect(animations.remove()).toEqual(false);
        expect(animations.contains(a)).toEqual(false);
        expect(animations.length).toEqual(0);
        expect(spyRemove).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationRemoved.removeEventListener(spyRemove);
    });

    it('add throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.add({
                name : 'animation_1'
            });
        }).toThrowDeveloperError();
    });

    it('add throws when name is invalid.', function() {
        expect(function() {
            return animBoxesModel.activeAnimations.add({
                name : 'animation-does-not-exist'
            });
        }).toThrowDeveloperError();
    });

    it('add throws when speedup is less than or equal to zero.', function() {
        expect(function() {
            return animBoxesModel.activeAnimations.add({
                name : 'animation_1',
                speedup : 0.0
            });
        }).toThrowDeveloperError();
    });

    it('get throws without an index', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.get();
        }).toThrowDeveloperError();
    });

    it('contains(undefined) returns false', function() {
        expect(animBoxesModel.activeAnimations.contains(undefined)).toEqual(false);
    });

    it('raises animation start, update, and stop events when removeOnStop is true', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            removeOnStop : true
        });

        var spyStart = jasmine.createSpy('listener');
        a.start.addEventListener(spyStart);

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        var stopped = false;
        a.stop.addEventListener(function(model, animation) {
            stopped = true;
        });
        var spyStop = jasmine.createSpy('listener');
        a.stop.addEventListener(spyStop);

        animBoxesModel.show = true;

        return pollToPromise(function() {
            scene.renderForSpecs(time);
            time = JulianDate.addSeconds(time, 1.0, time, new JulianDate());
            return stopped;
        }, { timeout : 10000 }).then(function() {
            expect(spyStart).toHaveBeenCalledWith(animBoxesModel, a);

            expect(spyUpdate.calls.count()).toEqual(4);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(animBoxesModel);
            expect(spyUpdate.calls.argsFor(0)[1]).toBe(a);
            expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

            expect(spyStop).toHaveBeenCalledWith(animBoxesModel, a);
            expect(animations.length).toEqual(0);
            animBoxesModel.show = false;
        });
    });

    it('Animates with a delay', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));

        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            delay : 1.0
        });

        var spyStart = jasmine.createSpy('listener');
        a.start.addEventListener(spyStart);

        animBoxesModel.show = true;
        scene.renderForSpecs(time); // Does not fire start
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));

        expect(spyStart.calls.count()).toEqual(1);

        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with an explicit stopTime', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var stopTime = JulianDate.fromDate(new Date('January 1, 2014 12:00:01 UTC'));

        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            stopTime : stopTime
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate())); // Does not fire update

        expect(spyUpdate.calls.count()).toEqual(2);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with a speedup', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            speedup : 1.5
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));

        expect(spyUpdate.calls.count()).toEqual(3);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.5, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates in reverse', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            reverse : true
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 3.0, new JulianDate()));

        expect(spyUpdate.calls.count()).toEqual(4);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(3.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(2.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(1.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(0.708, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with REPEAT', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            loop : ModelAnimationLoop.REPEAT
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        for (var i = 0; i < 8; ++i) {
            scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
        }

        expect(spyUpdate.calls.count()).toEqual(8);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(0.291, CesiumMath.EPSILON3); // Repeat with duration of ~3.7
        expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(1.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(2.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(3.291, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with MIRRORED_REPEAT', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            loop : ModelAnimationLoop.MIRRORED_REPEAT
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        for (var i = 0; i < 8; ++i) {
            scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
        }

        expect(spyUpdate.calls.count()).toEqual(8);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(3.416, CesiumMath.EPSILON3); // Mirror repeat with duration of 3.6
        expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(2.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(1.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(0.416, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates and renders', function() {
        return loadModel(animBoxesUrl, {
            scale : 2.0
        }).then(function(m) {
            var node = m.getNode('inner_box');
            var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
            var animations = m.activeAnimations;
            var a = animations.add({
                name : 'animation_1',
                startTime : time
            });

            expect(node.matrix).toEqual(Matrix4.IDENTITY);
            var previousMatrix = Matrix4.clone(node.matrix);

            m.zoomTo();

            for (var i = 1; i < 4; ++i) {
                var t = JulianDate.addSeconds(time, i, new JulianDate());
                expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

                m.show = true;
                expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
                m.show = false;

                expect(node.matrix).not.toEqual(previousMatrix);
                previousMatrix = Matrix4.clone(node.matrix);
            }

            expect(animations.remove(a)).toEqual(true);
            primitives.remove(m);
        });
    });

    it('does not animate when there are no animations', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);
        expect(animations.update()).toEqual(false);
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders riggedFigure without animation', function() {
        verifyRender(riggedFigureModel);
    });

    it('renders riggedFigure with animation (skinning)', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = riggedFigureModel.activeAnimations;
        animations.addAll({
            startTime : time
        });

        riggedFigureModel.zoomTo();

        for (var i = 0; i < 6; ++i) {
            var t = JulianDate.addSeconds(time, 0.25 * i, new JulianDate());
            expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

            riggedFigureModel.show = true;
            expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
            riggedFigureModel.show = false;
        }

        animations.removeAll();
        riggedFigureModel.show = false;
    });

    it('renders riggedSimple', function() {
        return loadModel(riggedSimpleUrl).then(function(m) {
            expect(m).toBeDefined();
            verifyRender(m);
        });
    });

    it('should load a model where WebGL shader optimizer removes an attribute (linux)', function() {
        var url = './Data/Models/test-shader-optimize/test-shader-optimize.gltf';
        return loadModel(url).then(function(m) {
            expect(m).toBeDefined();
            primitives.remove(m);
        });
    });

    it('releaseGltfJson releases glTF JSON when constructed with fromGltf', function() {
        return loadModel(boxUrl, {
            releaseGltfJson : true
        }).then(function(m) {
            expect(m.releaseGltfJson).toEqual(true);
            expect(m.gltf).not.toBeDefined();

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('releaseGltfJson releases glTF JSON when constructed with Model constructor function', function() {
        return loadModelJson(texturedBoxModel.gltf, {
            releaseGltfJson : true,
            incrementallyLoadTextures : false,
            asynchronous : true
        }).then(function(m) {
            expect(m.releaseGltfJson).toEqual(true);
            expect(m.gltf).not.toBeDefined();

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('Models are cached with fromGltf (1/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();

        // Use a custom cache key to avoid conflicting with previous tests
        var promise = loadModel(boxUrl, {
            cacheKey : key
        });

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(false);

        // This is a cache hit, but the JSON request is still pending.
        // In the test below, the cache hit occurs after the request completes.
        var promise2 = loadModel(boxUrl, {
            cacheKey : key
        });

        expect(gltfCache[key].count).toEqual(2);

        return when.all([promise, promise2], function(models) {
            var m = models[0];
            var m2 = models[1];

            // Render scene to progressively load the model
            scene.renderForSpecs();

            // glTF JSON cache set ready once the JSON was downloaded
            expect(gltfCache[key].ready).toEqual(true);

            expect(modelRendererResourceCache[key]).toBeDefined();
            expect(modelRendererResourceCache[key].count).toEqual(2);
            expect(modelRendererResourceCache[key].ready).toEqual(true);

            verifyRender(m);
            verifyRender(m2);

            primitives.remove(m);
            expect(gltfCache[key].count).toEqual(1);
            expect(modelRendererResourceCache[key].count).toEqual(1);

            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();
        });
    });

    it('Models are cached with fromGltf (2/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        // Use a custom cache key to avoid conflicting with previous tests
        var promise = loadModel(boxUrl, {
            cacheKey : key
        });

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(false);

        return promise.then(function(m) {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            // Cache hit after JSON request completed.
            var m2;
            loadModel(boxUrl, {
                cacheKey : key
            }).then(function(model) {
                m2 = model;
            });

            expect(gltfCache[key].ready).toEqual(true);
            expect(gltfCache[key].count).toEqual(2);

            verifyRender(m);
            verifyRender(m2);

            primitives.remove(m);
            expect(gltfCache[key].count).toEqual(1);

            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
        });
    });

    it('Cache with a custom cacheKey the Model Constructor (1/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();

        var m = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            incrementallyLoadTextures : false,
            asynchronous : true
        }));
        addZoomTo(m);

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(true);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            expect(modelRendererResourceCache[key]).toBeDefined();
            expect(modelRendererResourceCache[key].count).toEqual(1);
            expect(modelRendererResourceCache[key].ready).toEqual(m.ready);

            return m.ready;
        }, { timeout : 10000 }).then(function() {
            verifyRender(m);

            primitives.remove(m);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();
        });
    });

    it('Cache with a custom cacheKey when using the Model Constructor (2/2)', function() {
        var key = 'a-cache-key';
        var key3 = 'another-cache-key';

        // This cache for these keys is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();
        expect(gltfCache[key3]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();
        expect(modelRendererResourceCache[key3]).not.toBeDefined();

        var m = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            asynchronous : true
        }));
        addZoomTo(m);

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(true);

        // Should be cache hit.  Not need to provide glTF.
        var m2 = primitives.add(new Model({
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            asynchronous : true
        }));
        addZoomTo(m2);

        expect(gltfCache[key].count).toEqual(2);

        // Should be cache miss.
        var m3 = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key3,
            asynchronous : true
        }));
        addZoomTo(m3);

        expect(gltfCache[key3]).toBeDefined();
        expect(gltfCache[key3].count).toEqual(1);
        expect(gltfCache[key3].ready).toEqual(true);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            if (m.ready && m2.ready && m3.ready) {
                expect(modelRendererResourceCache[key]).toBeDefined();
                expect(modelRendererResourceCache[key].count).toEqual(2);

                expect(modelRendererResourceCache[key3]).toBeDefined();
                expect(modelRendererResourceCache[key3].count).toEqual(1);

                return true;
            }

            return false;
        }, { timeout : 10000 }).then(function() {
            verifyRender(m);
            verifyRender(m2);
            verifyRender(m3);

            primitives.remove(m);
            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();

            primitives.remove(m3);
            expect(gltfCache[key3]).not.toBeDefined();
            expect(modelRendererResourceCache[key3]).not.toBeDefined();
        });
    });

    it('Loads with incrementallyLoadTextures set to true', function() {
        return loadModelJson(texturedBoxModel.gltf, {
            incrementallyLoadTextures : true
        }).then(function(m) {
            // Get the rendered color of the model before textures are loaded
            var loadedColor = verifyRender(m);

            pollToPromise(function() {
                // Render scene to progressively load textures
                scene.renderForSpecs();
                // Textures have finished loading
                return (m.pendingTextureLoads === 0);
            }, { timeout : 10000 }).then(function() {
                var finishedColor = verifyRender(m);
                expect(finishedColor).not.toEqual(loadedColor);
                primitives.remove(m);
            });
        });
    });

    it('Loads with incrementallyLoadTextures set to false', function() {
        return loadModelJson(texturedBoxModel.gltf, {
            incrementallyLoadTextures : false
        }).then(function(m) {
            // Get the rendered color of the model before textures are loaded
            var loadedColor = verifyRender(m);

            pollToPromise(function() {
                // Render scene to progressively load textures (they should already be loaded)
                scene.renderForSpecs();
                // Textures have finished loading
                return !defined(m._loadResources);
            }, { timeout : 10000 }).then(function() {
                var finishedColor = verifyRender(m);
                expect(finishedColor).toEqual(loadedColor);
                primitives.remove(m);
            });
        });
    });

    it('loads a glTF with KHR_materials_common using the constant lighting model', function() {
        return loadModel(boxConstantUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using the lambert lighting model', function() {
        return loadModel(boxLambertUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using the blinn lighting model', function() {
        return loadModel(boxBlinnUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using the phong lighting model', function() {
        return loadModel(boxPhongUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using a black ambient/directional light', function() {
        return loadModel(boxNoLightUrl).then(function(m) {
            // Verify that we render a black model because lighting is completely off
            expect(m.ready).toBe(true);
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
            m.show = true;
            m.zoomTo();
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
            m.show = false;

            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using an ambient light', function() {
        return loadModel(boxAmbientLightUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using a directional light', function() {
        return loadModel(boxDirectionalLightUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using a point light', function() {
        return loadModel(boxPointLightUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common using a spot light', function() {
        return loadModel(boxSpotLightUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common that has skinning', function() {
        return loadModel(CesiumManUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with KHR_materials_common that has transparency', function() {
        return loadModel(boxTransparentUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with WEB3D_quantized_attributes POSITION and NORMAL', function() {
        return loadModel(boxQuantizedUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with WEB3D_quantized_attributes POSITION and NORMAL where primitives with different accessors use the same shader', function() {
        return loadModel(milkTruckQuantizedUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with WEB3D_quantized_attributes POSITION, TEXCOORD and NORMAL where one primitive is quantized and the other is not, but both use the same shader', function() {
        return loadModel(milkTruckQuantizedMismatchUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with WEB3D_quantized_attributes TEXCOORD', function() {
        return loadModel(duckQuantizedUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads a glTF with WEB3D_quantized_attributes JOINT and WEIGHT', function() {
        return loadModel(riggedSimpleQuantizedUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    function testBoxSideColors(m) {
        var rotateX = Matrix3.fromRotationX(CesiumMath.toRadians(90.0));
        var rotateY = Matrix3.fromRotationY(CesiumMath.toRadians(90.0));
        var rotateZ = Matrix3.fromRotationZ(CesiumMath.toRadians(90.0));

        // Each side of the cube should be a different color
        var oldPixelColor = scene.renderForSpecs();
        expect(oldPixelColor).not.toEqual([0, 0, 0, 255]);
        for(var i = 0; i < 6; i++) {
            var rotate = rotateZ;
            if (i % 3 === 0) {
                rotate = rotateX;
            }
            else if ((i-1) % 3 === 0) {
                rotate = rotateY;
            }
            Matrix4.multiplyByMatrix3(m.modelMatrix, rotate, m.modelMatrix);

            var pixelColor = scene.renderForSpecs();
            expect(pixelColor).not.toEqual([0, 0, 0, 255]);
            expect(pixelColor).not.toEqual(oldPixelColor);
            oldPixelColor = pixelColor;
        }
    }

    it('loads a gltf with color attributes', function() {
         return loadModel(boxColorUrl).then(function(m) {
             expect(m.ready).toBe(true);
             expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
             m.show = true;
             m.zoomTo();
             testBoxSideColors(m);
             primitives.remove(m);
         });
    });

    it('loads a gltf with WEB3D_quantized_attributes COLOR', function() {
        return loadModel(boxColorQuantizedUrl).then(function(m) {
            expect(m.ready).toBe(true);
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
            m.show = true;
            m.zoomTo();
            testBoxSideColors(m);
            primitives.remove(m);
        });
    });

    it('loads a gltf with WEB3D_quantized_attributes SCALAR attribute', function() {
        return loadModel(boxScalarQuantizedUrl).then(function(m) {
            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('loads with custom vertex attributes, vertexShader, fragmentShader, and uniform map', function() {
        function vertexShaderLoaded(vs) {
            var renamedSource = ShaderSource.replaceMain(vs, 'czm_old_main');
            var newMain =
                'attribute vec4 a_color;\n' +
                'varying vec4 v_color;\n' +
                'void main()\n' +
                '{\n' +
                '    czm_old_main();\n' +
                '    v_color = a_color;\n' +
                '}';
            return renamedSource + '\n' + newMain;
        }

        function fragmentShaderLoaded(fs) {
            fs = 'uniform float u_value;\n' +
                 'varying vec4 v_color;\n' +
                 'void main()\n' +
                 '{\n' +
                 '    gl_FragColor = u_value * v_color;\n' +
                 '}';
            return fs;
        }

        function uniformMapLoaded(uniformMap) {
            return combine(uniformMap, {
                u_value : function() {
                    return 1.0;
                }
            });
        }

        var precreatedAttributes = {
            a_color : {
                index                  : 0, // updated in Model
                componentsPerAttribute : 4,
                value                  : [1.0, 1.0, 1.0, 1.0]
            }
        };

        var options = {
            precreatedAttributes : precreatedAttributes,
            vertexShaderLoaded : vertexShaderLoaded,
            fragmentShaderLoaded : fragmentShaderLoaded,
            uniformMapLoaded : uniformMapLoaded
        };

        return loadModelJson(texturedBoxModel.gltf, options).then(function(model) {
            var pixelColor = verifyRender(model);
            expect(pixelColor).toEqual([255, 255, 255, 255]);
            primitives.remove(model);
        });
    });

    it('loads with custom pickFragmentShader and pickUniformMap', function() {
        function pickFragmentShaderLoaded(fs) {
            return ShaderSource.createPickFragmentShaderSource(fs, 'uniform');
        }

        var pickId = scene.context.createPickId({
            custom : 'custom'
        });

        function pickUniformMapLoaded(uniformMap) {
            return combine(uniformMap, {
                czm_pickColor : function() {
                    return pickId.color;
                }
            });
        }

        var options = {
            pickFragmentShaderLoaded : pickFragmentShaderLoaded,
            pickUniformMapLoaded : pickUniformMapLoaded
        };

        return loadModelJson(texturedBoxModel.gltf, options).then(function(model) {
            model.show = true;
            var pick = scene.pick(new Cartesian2(0, 0));
            expect(pick.custom).toEqual('custom');
            primitives.remove(model);
        });
    });

    it('does not issue draw commands when ignoreCommands is true', function() {
        return loadModel(texturedBoxUrl, {
            ignoreCommands : true
        }).then(function(m) {
            expect(m.ready).toBe(true);
            m.show = true;

            m.zoomTo();
            m.update(scene.frameState);
            expect(scene.frameState.commandList.length).toEqual(0);

            m.show = false;
            primitives.remove(m);
        });
    });

    it('does not issue draw commands when the model is out of view and cull is true', function() {
        return loadModel(texturedBoxUrl, {
            cull : true
        }).then(function(m) {
            expect(m.ready).toBe(true);
            m.show = true;

            // Look at the model
            m.zoomTo();
            scene.renderForSpecs();
            expect(scene._frustumCommandsList.length).not.toEqual(0);

            // Move the model out of view
            m.modelMatrix = Matrix4.fromTranslation(new Cartesian3(100000.0, 0.0, 0.0));
            scene.renderForSpecs();
            expect(scene._frustumCommandsList.length).toEqual(0);

            m.show = false;
            primitives.remove(m);
        });
    });

    it('issues draw commands when the model is out of view and cull is false', function() {
        return loadModel(texturedBoxUrl, {
            cull : false
        }).then(function(m) {
            expect(m.ready).toBe(true);
            m.show = true;

            // Look at the model
            m.zoomTo();
            scene.renderForSpecs();
            expect(scene._frustumCommandsList.length).not.toEqual(0);

            // Move the model out of view
            m.modelMatrix = Matrix4.fromTranslation(new Cartesian3(10000000000.0, 0.0, 0.0));
            scene.renderForSpecs();
            expect(scene._frustumCommandsList.length).not.toEqual(0);

            m.show = false;
            primitives.remove(m);
        });
    });

    describe('height referenced model', function() {
        function createMockGlobe() {
            var globe = {
                callback : undefined,
                removedCallback : false,
                ellipsoid : Ellipsoid.WGS84,
                update : function() {},
                getHeight : function() {
                    return 0.0;
                },
                _surface : {},
                destroy : function() {}
            };

            globe.beginFrame = function() {
            };

            globe.endFrame = function() {
            };

            globe.terrainProviderChanged = new Event();
            defineProperties(globe, {
                terrainProvider : {
                    set : function(value) {
                        this.terrainProviderChanged.raiseEvent(value);
                    }
                }
            });

            globe._surface.updateHeight = function(position, callback) {
                globe.callback = callback;
                return function() {
                    globe.removedCallback = true;
                    globe.callback = undefined;
                };
            };

            return globe;
        }

        it('explicitly constructs a model with height reference', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                scene : scene
            }).then(function(model) {
                expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
                primitives.remove(model);
            });
        });

        it('set model height reference property', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                scene : scene
            }).then(function(model) {
                model.heightReference = HeightReference.CLAMP_TO_GROUND;
                expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
                primitives.remove(model);
            });
        });

        it('creating with a height reference creates a height update callback', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene
            }).then(function(model) {
                expect(scene.globe.callback).toBeDefined();
                primitives.remove(model);
            });
        });

        it('set height reference property creates a height update callback', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene,
                show : true
            }).then(function(model) {
                model.heightReference = HeightReference.CLAMP_TO_GROUND;
                expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
                scene.renderForSpecs();
                expect(scene.globe.callback).toBeDefined();
                primitives.remove(model);
            });
        });

        it('updates the callback when the height reference changes', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene,
                show : true
            }).then(function(model) {
                expect(scene.globe.callback).toBeDefined();

                model.heightReference = HeightReference.RELATIVE_TO_GROUND;
                scene.renderForSpecs();
                expect(scene.globe.removedCallback).toEqual(true);
                expect(scene.globe.callback).toBeDefined();

                scene.globe.removedCallback = false;
                model.heightReference = HeightReference.NONE;
                scene.renderForSpecs();
                expect(scene.globe.removedCallback).toEqual(true);
                expect(scene.globe.callback).not.toBeDefined();
                
                primitives.remove(model);
            });
        });

        it('changing the position updates the callback', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene,
                show : true
            }).then(function(model) {
                expect(scene.globe.callback).toBeDefined();

                var matrix = Matrix4.clone(model.modelMatrix);
                var position = Cartesian3.fromDegrees(-73.0, 40.0);
                matrix[12] = position.x;
                matrix[13] = position.y;
                matrix[14] = position.z;

                model.modelMatrix = matrix;
                scene.renderForSpecs();

                expect(scene.globe.removedCallback).toEqual(true);
                expect(scene.globe.callback).toBeDefined();

                primitives.remove(model);
            });
        });

        it('callback updates the position', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene,
                show : true
            }).then(function(model) {
                expect(scene.globe.callback).toBeDefined();
                scene.renderForSpecs();

                scene.globe.callback(Cartesian3.fromDegrees(-72.0, 40.0, 100.0));
                var matrix = model._clampedModelMatrix;
                var clampedPosition = new Cartesian3(matrix[12], matrix[13], matrix[14]);
                var cartographic = scene.globe.ellipsoid.cartesianToCartographic(clampedPosition);
                expect(cartographic.height).toEqualEpsilon(100.0, CesiumMath.EPSILON9);

                primitives.remove(model);
            });
        });

        it('changing the terrain provider', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                scene : scene
            }).then(function(model) {
                expect(model._heightChanged).toBe(false);

                var terrainProvider = new CesiumTerrainProvider({
                    url : 'made/up/url',
                    requestVertexNormals : true
                });

                scene.terrainProvider = terrainProvider;

                expect(model._heightChanged).toBe(true);
            });
        });

        it('height reference without a scene rejects', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                show : true
            }).otherwise(function(error) {
                expect(error.message).toEqual('Height reference is not supported without a scene.');
            });
        });

        it('changing height reference without a scene throws DeveloperError', function() {
            scene.globe = createMockGlobe();
            return loadModelJson(texturedBoxModel.gltf, {
                position : Cartesian3.fromDegrees(-72.0, 40.0),
                show : true
            }).then(function(model) {
                model.heightReference = HeightReference.CLAMP_TO_GROUND;

                expect(function () {
                    return scene.renderForSpecs();
                }).toThrowDeveloperError();
            });
        });
    });

}, 'WebGL');
