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
        'Scene/Batched3DModel3DTileContent',
        'Scene/ClassificationType',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
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
        Batched3DModel3DTileContent,
        ClassificationType,
        PerInstanceColorAppearance,
        Primitive,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json';

    function setCamera(longitude, latitude) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
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

    it('renders with batch table', function() {
        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);

        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.CESIUM_3D_TILE,
            modelMatrix : Matrix4.fromTranslation(translation)
        }).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with binary batch table', function() {
        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);

        return Cesium3DTilesTester.loadTileset(scene, withBatchTableBinaryUrl, {
            classificationType : ClassificationType.CESIUM_3D_TILE,
            modelMatrix : Matrix4.fromTranslation(translation)
        }).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

}, 'WebGL');
