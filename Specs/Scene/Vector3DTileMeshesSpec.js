defineSuite([
        'Scene/Vector3DTileMeshes',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/combine',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/EllipsoidGeometry',
        'Core/GeometryInstance',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Transforms',
        'Core/TranslationRotationScale',
        'Core/VertexFormat',
        'Renderer/Pass',
        'Scene/Cesium3DTileBatchTable',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/createContext',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Vector3DTileMeshes,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        combine,
        destroyObject,
        Ellipsoid,
        EllipsoidGeometry,
        GeometryInstance,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Transforms,
        TranslationRotationScale,
        VertexFormat,
        Pass,
        Cesium3DTileBatchTable,
        PerInstanceColorAppearance,
        Primitive,
        createContext,
        createScene,
        pollToPromise) {
    'use strict';

    createMeshSpecs({});
    var c = createContext({ requestWebgl2 : true });
    // Don't repeat WebGL 1 tests when WebGL 2 is not supported
    if (c.webgl2) {
        createMeshSpecs({ requestWebgl2 : true });
    }
    c.destroyForSpecs();

    function createMeshSpecs(contextOptions) {
        var webglMessage = contextOptions.requestWebgl2 ? ': WebGL 2' : '';

        var scene;
        var rectangle;
        var depthPrimitive;
        var meshes;

        var ellipsoid = Ellipsoid.WGS84;

        beforeAll(function() {
            scene = createScene({ contextOptions : contextOptions });
        });

        afterAll(function() {
            scene.destroyForSpecs();
        });

        var mockTileset = {
            _statistics : {
                texturesByteLength : 0
            },
            _tileset : {
                _statistics : {
                    batchTableByteLength : 0
                }
            }
        };

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
            rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);

            var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0));
            var primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new RectangleGeometry({
                        ellipsoid : ellipsoid,
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
            depthPrimitive = new MockGlobePrimitive(primitive);
        });

        afterEach(function() {
            scene.primitives.removeAll();
            meshes = meshes && !meshes.isDestroyed() && meshes.destroy();
            depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
        });

        function loadMeshes(meshes) {
            var ready = false;
            meshes.readyPromise.then(function() {
                ready = true;
            });
            return pollToPromise(function() {
                meshes.update(scene.frameState);
                scene.frameState.commandList.length = 0;
                return ready;
            });
        }

        function createMesh(modelMatrix) {
            var ellipsoidGeometry = EllipsoidGeometry.createGeometry((new EllipsoidGeometry({
                radii : new Cartesian3(1.0, 1.0, 1.0),
                vertexFormat : VertexFormat.POSITION_ONLY
            })));

            var positions = ellipsoidGeometry.attributes.position.values;
            var indices = ellipsoidGeometry.indices;

            var positionsLength = positions.length;
            for (var j = 0; j < positionsLength; j += 3) {
                var position = Cartesian3.unpack(positions, j, new Cartesian3());
                Matrix4.multiplyByPoint(modelMatrix, position, position);
                Cartesian3.pack(position, positions, j);
            }

            return {
                positions : positions,
                indices : indices
            };
        }

        function combineMeshes(meshes) {
            var meshesLength = meshes.length;

            var indexOffsets = new Uint32Array(meshesLength);
            var indexCounts = new Uint32Array(meshesLength);

            var offset = 0;
            var positionCount = 0;

            var i;
            var j;
            var mesh;
            var byteLength = 0;
            for (i = 0; i < meshesLength; ++i) {
                mesh = meshes[i];
                byteLength += mesh.indices.byteLength;
                byteLength += mesh.positions.byteLength;

                indexOffsets[i] = offset;
                indexCounts[i] = mesh.indices.length;

                offset += indexCounts[i];
                positionCount += mesh.positions.length / 3;
            }

            var buffer = new ArrayBuffer(byteLength);

            var indicesLength = indexOffsets[indexOffsets.length - 1] + indexCounts[indexCounts.length - 1];
            var indicesView = new Uint16Array(buffer, 0, indicesLength);
            var positionsView = new Float32Array(buffer, indicesLength * Uint16Array.BYTES_PER_ELEMENT, positionCount * 3);

            var indexOffset = 0;
            var positionOffset = 0;
            positionCount = 0;

            for (i = 0; i < meshesLength; ++i) {
                mesh = meshes[i];

                var indices = mesh.indices;
                indicesLength = indices.length;
                for (j = 0; j < indicesLength; ++j) {
                    indicesView[indexOffset++] = indices[j] + positionCount;
                }

                var positions = mesh.positions;
                var positionsLength = positions.length;
                for (j = 0; j < positionsLength; ++j) {
                    positionsView[positionOffset++] = positions[j];
                }

                positionCount += positionsLength / 3;
            }

            return {
                buffer : buffer,
                indexOffsets : indexOffsets,
                indexCounts : indexCounts,
                indexBytesPerElement : Uint16Array.BYTES_PER_ELEMENT,
                positionCount : positionCount
            };
        }

        it('renders a mesh' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var options = combineMeshes([createMesh(Matrix4.fromUniformScale(1000000.0))]);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable
            })));
            return loadMeshes(meshes).then(function() {
                scene.camera.lookAtTransform(modelMatrix, new Cartesian3(0.0, 0.0, 10.0));
                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                meshes.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('renders multiple meshes' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var scale = 125000.0;
            var matrices = [Matrix4.multiply(Matrix4.fromTranslation(new Cartesian3(scale, 0.0, 0.0)), Matrix4.fromUniformScale(scale), new Matrix4()),
                            Matrix4.multiply(Matrix4.fromTranslation(new Cartesian3(-scale, 0.0, 0.0)), Matrix4.fromUniformScale(scale), new Matrix4())];
            var options = combineMeshes([createMesh(matrices[0]),
                                         createMesh(matrices[1])]);

            var bv = new BoundingSphere(center, 2.0 * scale);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0, 1]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable,
                boundingVolume : bv
            })));
            return loadMeshes(meshes).then(function() {
                for (var i = 0; i < matrices.length; ++i) {
                    var transform = Matrix4.multiply(modelMatrix, Matrix4.fromTranslation(Matrix4.getTranslation(matrices[i], new Cartesian3())), new Matrix4());
                    scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, 10.0));
                    expect(scene).toRender([255, 255, 255, 255]);

                    batchTable.setColor(i, Color.BLUE);
                    meshes.updateCommands(i, Color.BLUE);
                    batchTable.update(mockTileset, scene.frameState);
                    expect(scene).toRender([0, 0, 255, 255]);
                }
            });
        });

        it('renders multiple meshes after a re-batch' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var scale = 125000.0;
            var matrices = [Matrix4.multiply(Matrix4.fromTranslation(new Cartesian3(scale, 0.0, 0.0)), Matrix4.fromUniformScale(scale), new Matrix4()),
                            Matrix4.multiply(Matrix4.fromTranslation(new Cartesian3(-scale, 0.0, 0.0)), Matrix4.fromUniformScale(scale), new Matrix4())];
            var options = combineMeshes([createMesh(matrices[0]),
                                         createMesh(matrices[1])]);

            var bv = new BoundingSphere(center, 2.0 * scale);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0, 1]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable,
                boundingVolume : bv
            })));
            meshes.forceRebatch = true;
            return loadMeshes(meshes).then(function() {
                for (var i = 0; i < matrices.length; ++i) {
                    var transform = Matrix4.multiply(modelMatrix, Matrix4.fromTranslation(Matrix4.getTranslation(matrices[i], new Cartesian3())), new Matrix4());
                    scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, 10.0));
                    expect(scene).toRender([255, 255, 255, 255]);

                    batchTable.setColor(i, Color.BLUE);
                    meshes.updateCommands(i, Color.BLUE);
                    batchTable.update(mockTileset, scene.frameState);
                    expect(scene).toRender([0, 0, 255, 255]);
                }
            });
        });

        it('renders with inverted classification' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var radii = new Cartesian3(10.0, 10.0, 1000.0);
            var options = combineMeshes([createMesh(Matrix4.fromScale(radii))]);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable
            })));
            return loadMeshes(meshes).then(function() {
                scene.camera.lookAtTransform(modelMatrix, new Cartesian3(radii.x, 0.0, 1.0));

                expect(scene).toRender([255, 0, 0, 255]);

                scene.invertClassification = true;
                scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 1.0);

                expect(scene).toRender([64, 0, 0, 255]);

                scene.camera.lookAtTransform(modelMatrix, new Cartesian3(0.0, 0.0, 1.0));
                expect(scene).toRender([255, 255, 255, 255]);

                scene.invertClassification = false;
            });
        });

        it('renders wireframe' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var options = combineMeshes([createMesh(Matrix4.fromUniformScale(1000000.0))]);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable
            })));
            meshes.debugWireframe = true;
            return loadMeshes(meshes).then(function() {
                scene.camera.lookAtTransform(modelMatrix, new Cartesian3(0.0, 0.0, 10.0));
                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                meshes.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('picks meshes' + webglMessage, function() {
            var origin = Rectangle.center(rectangle);
            var center = ellipsoid.cartographicToCartesian(origin);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var options = combineMeshes([createMesh(Matrix4.fromUniformScale(1000000.0))]);

            meshes = scene.primitives.add(new Vector3DTileMeshes(combine(options, {
                byteOffset : 0,
                batchIds : new Uint16Array([0]),
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable
            })));
            return loadMeshes(meshes).then(function() {
                scene.camera.lookAtTransform(modelMatrix, new Cartesian3(0.0, 0.0, 10.0));

                var features = [];
                meshes.createFeatures(mockTileset, features);
                mockTileset.getFeature = function(index) {
                    return features[index];
                };

                scene.frameState.passes.pick = true;
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toPickAndCall(function(result) {
                    expect(result).toBe(features[0]);
                });

                mockTileset.getFeature = undefined;
            });
        });

        it('isDestroyed' + webglMessage, function() {
            meshes = new Vector3DTileMeshes({});
            expect(meshes.isDestroyed()).toEqual(false);
            meshes.destroy();
            expect(meshes.isDestroyed()).toEqual(true);
        });
    }
});
