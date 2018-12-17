defineSuite([
        'Scene/ClassificationModel',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/HeadingPitchRange',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Resource',
        'Core/Transforms',
        'Renderer/Pass',
        'Renderer/RenderState',
        'Scene/ClassificationType',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Scene/StencilConstants',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/GltfPipeline/addDefaults',
        'ThirdParty/GltfPipeline/parseGlb',
        'ThirdParty/GltfPipeline/updateVersion'
    ], function(
        ClassificationModel,
        Cartesian3,
        Cartographic,
        Color,
        ColorGeometryInstanceAttribute,
        destroyObject,
        Ellipsoid,
        GeometryInstance,
        HeadingPitchRange,
        CesiumMath,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Resource,
        Transforms,
        Pass,
        RenderState,
        ClassificationType,
        PerInstanceColorAppearance,
        Primitive,
        StencilConstants,
        createScene,
        pollToPromise,
        addDefaults,
        parseGlb,
        updateVersion) {
    'use strict';

    var scene;
    var modelMatrix;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var batchedModel = './Data/Models/Classification/batched.glb';
    var quantizedModel = './Data/Models/Classification/batchedQuantization.glb';

    function setCamera(longitude, latitude, offset) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
        scene.camera.moveUp(offset);
    }

    function viewCenter() {
        setCamera(centerLongitude, centerLatitude, 0.0);
    }

    function viewGlobePrimitive() {
        setCamera(centerLongitude, centerLatitude, 0.5);
    }

    function view3DTilesPrimitive() {
        setCamera(centerLongitude, centerLatitude, -0.5);
    }

    function MockPrimitive(rectangle, pass) {
        var renderState;
        if (pass === Pass.CESIUM_3D_TILE) {
            renderState = RenderState.fromCache({
                stencilTest : StencilConstants.setCesium3DTileBit(),
                stencilMask : StencilConstants.CESIUM_3D_TILE_MASK,
                depthTest : {
                    enabled : true
                }
            });
        }
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 0.0, 1.0));
        this._primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : Ellipsoid.WGS84,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true,
                renderState : renderState
            }),
            asynchronous : false
        });

        this.pass = pass;
    }

    MockPrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this.pass;
        }
    };

    MockPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockPrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    beforeAll(function() {
        scene = createScene();

        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);
        modelMatrix = Matrix4.fromTranslation(translation);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        var offset = CesiumMath.toRadians(0.01);
        var rectangle1 = new Rectangle(centerLongitude - offset, centerLatitude, centerLongitude + offset, centerLatitude + offset);
        var rectangle2 = new Rectangle(centerLongitude - offset, centerLatitude - offset, centerLongitude + offset, centerLatitude);

        // wrap rectangle primitive so it gets executed during the globe pass or 3D Tiles pass to lay down depth
        scene.primitives.add(new MockPrimitive(rectangle1, Pass.GLOBE));
        scene.primitives.add(new MockPrimitive(rectangle2, Pass.CESIUM_3D_TILE));

        viewCenter();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function expectRender(scene, model) {
        model.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        model.show = true;
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
        });
    }

    function expectRenderBlank(scene, model) {
        model.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        model.show = true;
        expect(scene).toRender([0, 0, 0, 255]);
    }

    function loadGltf(model) {
        return Resource.fetchArrayBuffer(model).then(function(arrayBuffer) {
            var gltf = new Uint8Array(arrayBuffer);
            gltf = parseGlb(gltf);
            updateVersion(gltf);
            addDefaults(gltf);
            return gltf;
        });
    }

    function loadClassificationModel(url, classificationType) {
        return Resource.fetchArrayBuffer(url).then(function(arrayBuffer) {
            var model = scene.primitives.add(new ClassificationModel({
                gltf : arrayBuffer,
                classificationType : classificationType,
                modelMatrix : modelMatrix
            }));

            var ready  = false;
            model.readyPromise.then(function() {
                ready = true;
            });

            return pollToPromise(function() {
                scene.renderForSpecs();
                return ready;
            }).then(function() {
                return model;
            });
        });
    }

    it('classifies 3D Tiles', function() {
        return loadClassificationModel(batchedModel, ClassificationType.CESIUM_3D_TILE).then(function(model) {
            view3DTilesPrimitive();
            expectRender(scene, model);
            viewGlobePrimitive();
            expectRenderBlank(scene, model);
        });
    });

    it('classifies globe', function() {
        return loadClassificationModel(batchedModel, ClassificationType.TERRAIN).then(function(model) {
            view3DTilesPrimitive();
            expectRenderBlank(scene, model);
            viewGlobePrimitive();
            expectRender(scene, model);
        });
    });

    it('classifies both 3D Tiles and globe', function() {
        return loadClassificationModel(batchedModel, ClassificationType.BOTH).then(function(model) {
            view3DTilesPrimitive();
            expectRender(scene, model);
            viewGlobePrimitive();
            expectRender(scene, model);
        });
    });

    it('renders batched model', function() {
        return loadClassificationModel(batchedModel, ClassificationType.BOTH).then(function(model) {
            view3DTilesPrimitive();
            expectRender(scene, model);
        });
    });

    it('renders batched model with quantization', function() {
        return loadClassificationModel(quantizedModel, ClassificationType.BOTH).then(function(model) {
            view3DTilesPrimitive();
            expectRender(scene, model);
        });
    });

    it('throws with invalid number of nodes', function() {
        return loadGltf(batchedModel).then(function(gltf) {
            gltf.nodes.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf: gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with invalid number of meshes', function() {
        return loadGltf(batchedModel).then(function(gltf) {
            gltf.meshes.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with invalid number of primitives', function() {
        return loadGltf(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with position semantic', function() {
        return loadGltf(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives[0].attributes.POSITION = undefined;
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with batch id semantic', function() {
        return loadGltf(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives[0].attributes._BATCHID = undefined;
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

}, 'WebGL');
