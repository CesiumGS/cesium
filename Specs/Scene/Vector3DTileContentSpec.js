/*global defineSuite*/
defineSuite([
        'Scene/Vector3DTileContent',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/destroyObject',
        'Core/GeometryInstance',
        'Core/HeadingPitchRange',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Renderer/Pass',
        'Scene/Cesium3DTileStyle',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Vector3DTileContent,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        destroyObject,
        GeometryInstance,
        HeadingPitchRange,
        Rectangle,
        RectangleGeometry,
        Pass,
        Cesium3DTileStyle,
        PerInstanceColorAppearance,
        Primitive,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var vectorPolygonUrl = './Data/Cesium3DTiles/Vector/VectorPolygon';
    var vectorPolygonQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPolygonQuantized';
    var vectorPolylineUrl = './Data/Cesium3DTiles/Vector/VectorPolyline';
    var vectorPolylineQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPolylineQuantized';
    var vectorPolygonWithPropertiesUrl = './Data/Cesium3DTiles/Vector/VectorPolygonWithProperties';
    var vectorPointUrl = './Data/Cesium3DTiles/Vector/VectorPoint';
    var vectorPointQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPointQuantized';

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
    }

    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = Pass.GLOBE;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    var scene;
    var depthColor;
    var depthPrimitive;

    beforeAll(function() {
        // vector tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        var center = Cartesian3.fromDegrees(-76.5, 39.5);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 3500.0));
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        scene.primitives.removeAll();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    function addDepthRender() {
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 0.0, 1.0));
        depthColor = depthColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : Rectangle.fromDegrees(-77.0, 39.0, -76.0, 40.0)
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
            asynchronous : false,
            allowPicking : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = scene.groundPrimitives.add(new MockGlobePrimitive(primitive));
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if featureTableJsonByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJsonByteLength : 0
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the feature table does not contain POLYGONS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYLINES_LENGTH : 0,
                POINTS_LENGTH : 0
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the feature table does not contain POLYLINES_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 0,
                POINTS_LENGTH : 0
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the feature table does not contain POINTS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 0,
                POLYLINES_LENGTH : 0
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 1,
                POLYLINES_LENGTH : 0,
                QUANTIZED_VOLUME_OFFSET : [0.0, 0.0, 0.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_OFFSET', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 1,
                POLYLINES_LENGTH : 0,
                QUANTIZED_VOLUME_SCALE : [1.0, 1.0, 1.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, vectorPolygonQuantizedUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('vctr');
    });

    it('renders polygons', function() {
        addDepthRender();
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders quantized polygons', function() {
        addDepthRender();
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders polygons with properties', function() {
        addDepthRender();
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonWithPropertiesUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders polylines', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolylineUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders quantized polylines', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolylineQuantizedUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders points', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPointUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders quantized points', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPointQuantizedUrl).then(function (tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, vectorPolygonQuantizedUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, vectorPolygonQuantizedUrl);
    });

}, 'WebGL');
