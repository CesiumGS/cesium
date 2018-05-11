defineSuite([
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/defaultValue',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/PerspectiveFrustum',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Resource',
        'Core/Transforms',
        'Scene/BillboardCollection',
        'Scene/Globe',
        'Scene/HorizontalOrigin',
        'Scene/LabelCollection',
        'Scene/Material',
        'Scene/PerInstanceColorAppearance',
        'Scene/PolylineCollection',
        'Scene/Primitive',
        'Scene/SceneMode',
        'Scene/VerticalOrigin',
        'Specs/createScene'
    ], 'Scene/PrimitiveCulling', function(
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        GeometryInstance,
        CesiumMath,
        PerspectiveFrustum,
        Rectangle,
        RectangleGeometry,
        Resource,
        Transforms,
        BillboardCollection,
        Globe,
        HorizontalOrigin,
        LabelCollection,
        Material,
        PerInstanceColorAppearance,
        PolylineCollection,
        Primitive,
        SceneMode,
        VerticalOrigin,
        createScene) {
    'use strict';

    var scene;
    var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -93.0, 37.0);
    var primitive;
    var greenImage;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;

        return Resource.fetchImage('./Data/Images/Green.png').then(function(image) {
            greenImage = image;
        });
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);

        var camera = scene.camera;
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        primitive = primitive && primitive.destroy();
    });

    function testCull(primitive) {
        scene.camera.setView({
            destination : rectangle
        });

        expect(scene).toRender([0, 0, 0, 255]);
        scene.primitives.add(primitive);

        expect(scene).notToRender([0, 0, 0, 255]);

        if (scene.mode !== SceneMode.SCENE2D) {
            // move the camera through the rectangle so that is behind the view frustum
            scene.camera.moveForward(100000000.0);
            expect(scene).toRender([0, 0, 0, 255]);
        }
    }

    function testCullIn3D(primitive) {
        scene.mode = SceneMode.SCENE3D;
        testCull(primitive);
    }

    function testCullInColumbusView(primitive) {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        testCull(primitive);
    }

    function testCullIn2D(primitive) {
        scene.mode = SceneMode.SCENE2D;
        testCull(primitive);
    }

    function testOcclusionCull(primitive) {
        scene.mode = SceneMode.SCENE3D;
        scene.camera.setView({
            destination : rectangle
        });

        expect(scene).toRender([0, 0, 0, 255]);
        scene.primitives.add(primitive);

        expect(scene).notToRender([0, 0, 0, 255]);

        // create the globe; it should occlude the primitive
        scene.globe = new Globe();

        expect(scene).toRender([0, 0, 0, 255]);

        scene.globe = undefined;
    }

    function createPrimitive(height) {
        height = defaultValue(height, 0);
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : rectangle,
                    vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                    height : height
                }),
                attributes : {
                    color : ColorGeometryInstanceAttribute.fromColor(Color.RED)
                }
            }),
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });
        return primitive;
    }

    it('frustum culls polygon in 3D', function() {
        primitive = createPrimitive();
        testCullIn3D(primitive);
    });

    it('frustum culls polygon in Columbus view', function() {
        primitive = createPrimitive();
        testCullInColumbusView(primitive);
    });

    it('frustum culls polygon in 2D', function() {
        primitive = createPrimitive();
        testCullIn2D(primitive);
    });

    it('polygon occlusion', function() {
        primitive = createPrimitive(-1000000.0);
        testOcclusionCull(primitive);
    });

    function createLabels(height) {
        height = defaultValue(height, 0);
        var labels = new LabelCollection();
        var center = Cartesian3.fromDegrees(-96.5, 33.5, height);
        labels.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
        labels.add({
            position : Cartesian3.ZERO,
            text : 'X',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        return labels;
    }

    it('frustum culls labels in 3D', function() {
        primitive = createLabels();
        testCullIn3D(primitive);
    });

    it('frustum culls labels in Columbus view', function() {
        primitive = createLabels();
        testCullInColumbusView(primitive);
    });

    it('frustum culls labels in 2D', function() {
        primitive = createLabels();
        testCullIn2D(primitive);
    });

    it('label occlusion', function() {
        primitive = createLabels(-1000000.0);
        testOcclusionCull(primitive);
    });

    function createBillboard(height) {
        height = defaultValue(height, 0);
        var billboards = new BillboardCollection();
        billboards.add({
            position : Cartesian3.fromDegrees(-96.5, 33.5, height),
            image : greenImage
        });
        return billboards;
    }

    it('frustum culls billboards in 3D', function() {
        primitive = createBillboard();
        testCullIn3D(primitive);
    });

    it('frustum culls billboards in Columbus view', function() {
        primitive = createBillboard();
        testCullInColumbusView(primitive);
    });

    it('frustum culls billboards in 2D', function() {
        primitive = createBillboard();
        testCullIn2D(primitive);
    });

    it('billboard occlusion', function() {
        primitive = createBillboard(-1000000.0);
        testOcclusionCull(primitive);
    });

    function createPolylines(height) {
        height = defaultValue(height, 0);
        var material = Material.fromType('Color');
        material.translucent = false;

        var polylines = new PolylineCollection();
        polylines.add({
            positions : Cartesian3.fromDegreesArrayHeights([
                -100.0, 30.0, height,
                -93.0, 37.0, height
            ]),
            material : material
        });
        return polylines;
    }

    it('frustum culls polylines in 3D', function() {
        primitive = createPolylines();
        testCullIn3D(primitive);
    });

    it('frustum culls polylines in Columbus view', function() {
        primitive = createPolylines();
        testCullInColumbusView(primitive);
    });

    it('frustum culls polylines in 2D', function() {
        primitive = createPolylines();
        testCullIn2D(primitive);
    });

    it('polyline occlusion', function() {
        primitive = createPolylines(-1000000.0);
        testOcclusionCull(primitive);
    });
}, 'WebGL');
