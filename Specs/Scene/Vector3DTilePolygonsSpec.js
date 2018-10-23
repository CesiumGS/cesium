defineSuite([
        'Scene/Vector3DTilePolygons',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/combine',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Transforms',
        'Renderer/Pass',
        'Scene/Cesium3DTileBatchTable',
        'Scene/ColorBlendMode',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/createContext',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Vector3DTilePolygons,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        combine,
        destroyObject,
        Ellipsoid,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Transforms,
        Pass,
        Cesium3DTileBatchTable,
        ColorBlendMode,
        PerInstanceColorAppearance,
        Primitive,
        createContext,
        createScene,
        pollToPromise) {
    'use strict';

    createPolygonSpecs({});
    var c = createContext({ requestWebgl2 : true });
    // Don't repeat WebGL 1 tests when WebGL 2 is not supported
    if (c.webgl2) {
        createPolygonSpecs({ requestWebgl2 : true });
    }
    c.destroyForSpecs();

    function createPolygonSpecs(contextOptions) {
        var webglMessage = contextOptions.requestWebgl2 ? ': WebGL 2' : '';

        var scene;
        var rectangle;
        var depthPrimitive;
        var polygons;

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
            tileset : {
                _statistics : {
                    batchTableByteLength : 0
                },
                colorBlendMode : ColorBlendMode.HIGHLIGHT
            },
            getFeature : function(id) { return { batchId : id }; }
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
            rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);

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
            polygons = polygons && !polygons.isDestroyed() && polygons.destroy();
            depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
        });

        function loadPolygons(polygons) {
            var ready = false;
            polygons.readyPromise.then(function() {
                ready = true;
            });
            return pollToPromise(function() {
                polygons.update(scene.frameState);
                scene.frameState.commandList.length = 0;
                return ready;
            });
        }

        function zigZag(value) {
            return ((value << 1) ^ (value >> 15)) & 0xFFFF;
        }

        var maxShort = 32767;

        function encodePositions(rectangle, positions) {
            var length = positions.length;
            var buffer = new Uint16Array(length * 2);

            var lastU = 0;
            var lastV = 0;

            for (var i = 0; i < length; ++i) {
                var position = positions[i];

                var u = (position.longitude - rectangle.west) / rectangle.width;
                var v = (position.latitude - rectangle.south) / rectangle.height;

                u = CesiumMath.clamp(u, 0.0, 1.0);
                v = CesiumMath.clamp(v, 0.0, 1.0);

                u = Math.floor(u * maxShort);
                v = Math.floor(v * maxShort);

                buffer[i] = zigZag(u - lastU);
                buffer[i + length] = zigZag(v - lastV);

                lastU = u;
                lastV = v;
            }

            return buffer;
        }

        function createPolygon(rectangle) {
            var cartographicPositions = [
                Rectangle.northwest(rectangle),
                Rectangle.southwest(rectangle),
                Rectangle.southeast(rectangle),
                Rectangle.northeast(rectangle)
            ];
            return {
                positions : encodePositions(rectangle, cartographicPositions),
                indices : new Uint16Array([0, 1, 2, 0, 2, 3]),
                counts : new Uint32Array([4]),
                indexCounts : new Uint32Array([6])
            };
        }

        it('renders a single polygon' + webglMessage, function() {
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var polygonOptions = createPolygon(rectangle);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons(combine(polygonOptions, {
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0]),
                isCartographic : true
            })));
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                polygons.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('renders multiple polygons' + webglMessage, function() {
            var rectangle1 = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var rectangle2 = Rectangle.fromDegrees(1.0, -1.0, 2.0, 1.0);
            var cartographicPositions = [
                Rectangle.northwest(rectangle1),
                Rectangle.southwest(rectangle1),
                Rectangle.southeast(rectangle1),
                Rectangle.northeast(rectangle1),
                Rectangle.northwest(rectangle2),
                Rectangle.southwest(rectangle2),
                Rectangle.southeast(rectangle2),
                Rectangle.northeast(rectangle2)
            ];
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 2.0, 1.0);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons({
                positions : encodePositions(rectangle, cartographicPositions),
                indices : new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
                counts : new Uint32Array([4, 4]),
                indexCounts : new Uint32Array([6, 6]),
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0, 1]),
                isCartographic : true
            }));
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle1
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                polygons.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);

                scene.camera.setView({
                    destination : rectangle2
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(1, Color.BLUE);
                polygons.updateCommands(1, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('renders multiple polygons after re-batch' + webglMessage, function() {
            var rectangle1 = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var rectangle2 = Rectangle.fromDegrees(1.0, -1.0, 2.0, 1.0);
            var cartographicPositions = [
                Rectangle.northwest(rectangle1),
                Rectangle.southwest(rectangle1),
                Rectangle.southeast(rectangle1),
                Rectangle.northeast(rectangle1),
                Rectangle.northwest(rectangle2),
                Rectangle.southwest(rectangle2),
                Rectangle.southeast(rectangle2),
                Rectangle.northeast(rectangle2)
            ];
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 2.0, 1.0);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons({
                positions : encodePositions(rectangle, cartographicPositions),
                indices : new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
                counts : new Uint32Array([4, 4]),
                indexCounts : new Uint32Array([6, 6]),
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0, 1]),
                isCartographic : true
            }));
            polygons.forceRebatch = true;
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle1
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                polygons.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);

                scene.camera.setView({
                    destination : rectangle2
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(1, Color.BLUE);
                polygons.updateCommands(1, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('renders multiple polygons with different minimum and maximum heights' + webglMessage, function() {
            var rectangle1 = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var rectangle2 = Rectangle.fromDegrees(1.0, -1.0, 2.0, 1.0);
            var cartographicPositions = [
                Rectangle.northwest(rectangle1),
                Rectangle.southwest(rectangle1),
                Rectangle.southeast(rectangle1),
                Rectangle.northeast(rectangle1),
                Rectangle.northwest(rectangle2),
                Rectangle.southwest(rectangle2),
                Rectangle.southeast(rectangle2),
                Rectangle.northeast(rectangle2)
            ];
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 2.0, 1.0);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons({
                positions : encodePositions(rectangle, cartographicPositions),
                indices : new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
                counts : new Uint32Array([4, 4]),
                indexCounts : new Uint32Array([6, 6]),
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                polygonMinimumHeights : new Float32Array([-10000.0, 10.0]),
                polygonMaximumHeights : new Float32Array([10000.0, 100.0]),
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0, 1]),
                isCartographic : true
            }));
            polygons.forceRebatch = true;
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle1
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                polygons.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);

                scene.camera.setView({
                    destination : rectangle2
                });

                expect(scene).toRender([255, 0, 0, 255]);
            });
        });

        it('renders with inverted classification' + webglMessage, function() {
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var polygonOptions = createPolygon(rectangle);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons(combine(polygonOptions, {
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0]),
                isCartographic : true
            })));
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : Rectangle.fromDegrees(-2.0, -1.0, -1.0, 1.0)
                });

                expect(scene).toRender([255, 0, 0, 255]);

                scene.invertClassification = true;
                scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 1.0);

                expect(scene).toRender([64, 0, 0, 255]);

                scene.camera.setView({
                    destination : rectangle
                });
                expect(scene).toRender([255, 255, 255, 255]);

                scene.invertClassification = false;
            });
        });

        it('renders wireframe' + webglMessage, function() {
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var polygonOptions = createPolygon(rectangle);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
            batchTable.update(mockTileset, scene.frameState);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons(combine(polygonOptions, {
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0]),
                isCartographic : true
            })));
            polygons.debugWireframe = true;
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle
                });

                expect(scene).toRender([255, 255, 255, 255]);

                batchTable.setColor(0, Color.BLUE);
                polygons.updateCommands(0, Color.BLUE);
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });

        it('picks polygons' + webglMessage, function() {
            var rectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
            var polygonOptions = createPolygon(rectangle);

            var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

            scene.primitives.add(depthPrimitive);

            var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));
            polygons = scene.primitives.add(new Vector3DTilePolygons(combine(polygonOptions, {
                minimumHeight : -10000.0,
                maximumHeight : 10000.0,
                center : center,
                rectangle : rectangle,
                boundingVolume : new BoundingSphere(center, 10000.0),
                batchTable : batchTable,
                batchIds : new Uint32Array([0]),
                isCartographic : true
            })));
            polygons.debugWireframe = true;
            return loadPolygons(polygons).then(function() {
                scene.camera.setView({
                    destination : rectangle
                });

                var features = [];
                polygons.createFeatures(mockTileset, features);

                var getFeature = mockTileset.getFeature;
                mockTileset.getFeature = function(index) {
                    return features[index];
                };

                scene.frameState.passes.pick = true;
                batchTable.update(mockTileset, scene.frameState);
                expect(scene).toPickAndCall(function(result) {
                    expect(result).toBe(features[0]);
                });

                mockTileset.getFeature = getFeature;
            });
        });

        it('isDestroyed' + webglMessage, function() {
            polygons = new Vector3DTilePolygons({});
            expect(polygons.isDestroyed()).toEqual(false);
            polygons.destroy();
            expect(polygons.isDestroyed()).toEqual(true);
        });
    }

}, 'WebGL');
