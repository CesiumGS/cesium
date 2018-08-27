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
        'Scene/ClassificationType',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
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
        ClassificationType,
        PerInstanceColorAppearance,
        Primitive,
        createScene,
        pollToPromise,
        addDefaults,
        parseGlb,
        updateVersion) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var batchedModel = './Data/Models/Classification/batched.glb';
    var quantizedModel = './Data/Models/Classification/batchedQuantization.glb';

    function setCamera(longitude, latitude) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    function loadModel(model) {
        return Resource.fetchArrayBuffer(model).then(function(arrayBuffer) {
            var gltf = new Uint8Array(arrayBuffer);
            gltf = parseGlb(gltf);
            updateVersion(gltf);
            addDefaults(gltf);
            return gltf;
        });
    }

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
        this.pass = Pass.CESIUM_3D_TILE;
    }

    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this.pass;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    beforeEach(function() {
        setCamera(centerLongitude, centerLatitude);

        var offset = CesiumMath.toRadians(0.01);
        var rectangle = new Rectangle(centerLongitude - offset, centerLatitude - offset, centerLongitude + offset, centerLatitude + offset);

        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 0.0, 1.0));
        var primitive = new Primitive({
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
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        scene.primitives.add(new MockGlobePrimitive(primitive));
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('renders batched model', function() {
        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);

        return Resource.fetchArrayBuffer(batchedModel).then(function(arrayBuffer) {
            var model = scene.primitives.add(new ClassificationModel({
                gltf : arrayBuffer,
                classificationType : ClassificationType.CESIUM_3D_TILE,
                modelMatrix : Matrix4.fromTranslation(translation)
            }));

            var ready  = false;
            model.readyPromise.then(function() {
                ready = true;
            });

            return pollToPromise(function() {
                scene.renderForSpecs();
                return ready;
            }).then(function() {
                model.show = false;
                expect(scene).toRender([0, 0, 0, 255]);
                model.show = true;
                expect(scene).toRenderAndCall(function(rgba) {
                    expect(rgba).not.toEqual([0, 0, 0, 255]);
                });
            });
        });
    });

    it('renders batched model with quantization', function() {
        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);

        return Resource.fetchArrayBuffer(quantizedModel).then(function(arrayBuffer) {
            var model = scene.primitives.add(new ClassificationModel({
                gltf : arrayBuffer,
                classificationType : ClassificationType.CESIUM_3D_TILE,
                modelMatrix : Matrix4.fromTranslation(translation)
            }));

            var ready  = false;
            model.readyPromise.then(function() {
                ready = true;
            });

            return pollToPromise(function() {
                scene.renderForSpecs();
                return ready;
            }).then(function() {
                model.show = false;
                expect(scene).toRender([0, 0, 0, 255]);
                model.show = true;
                expect(scene).toRenderAndCall(function(rgba) {
                    expect(rgba).not.toEqual([0, 0, 0, 255]);
                });
            });
        });
    });

    it('throws with invalid number of nodes', function() {
        return loadModel(batchedModel).then(function(gltf) {
            gltf.nodes.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf: gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with invalid number of meshes', function() {
        return loadModel(batchedModel).then(function(gltf) {
            gltf.meshes.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with invalid number of primitives', function() {
        return loadModel(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives.push({});
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with position semantic', function() {
        return loadModel(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives[0].attributes.POSITION = undefined;
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

    it('throws with batch id semantic', function() {
        return loadModel(batchedModel).then(function(gltf) {
            gltf.meshes[0].primitives[0].attributes._BATCHID = undefined;
            expect(function() {
                return new ClassificationModel({
                    gltf : gltf
                });
            }).toThrowRuntimeError();
        });
    });

}, 'WebGL');
