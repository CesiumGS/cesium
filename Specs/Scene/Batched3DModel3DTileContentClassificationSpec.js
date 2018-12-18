defineSuite([
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
        'Core/Transforms',
        'Renderer/Pass',
        'Renderer/RenderState',
        'Scene/Batched3DModel3DTileContent',
        'Scene/ClassificationType',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Scene/StencilConstants',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], 'Scene/Batched3DModel3DTileContentClassification', function(
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
        Transforms,
        Pass,
        RenderState,
        Batched3DModel3DTileContent,
        ClassificationType,
        PerInstanceColorAppearance,
        Primitive,
        StencilConstants,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var modelMatrix;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json';

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

        this._pass = pass;
    }

    MockPrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this._pass;
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

    it('classifies 3D Tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.CESIUM_3D_TILE,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            view3DTilesPrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            viewGlobePrimitive();
            Cesium3DTilesTester.expectRenderBlank(scene, tileset);
        });
    });

    it('classifies globe', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.TERRAIN,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            view3DTilesPrimitive();
            Cesium3DTilesTester.expectRenderBlank(scene, tileset);
            viewGlobePrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('classifies both 3D Tiles and globe', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            view3DTilesPrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            viewGlobePrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            view3DTilesPrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with binary batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableBinaryUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            view3DTilesPrimitive();
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

}, 'WebGL');
