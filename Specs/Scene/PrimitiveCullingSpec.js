/*global defineSuite*/
defineSuite([
         'Scene/CompositePrimitive',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/render',
         'Core/BoundingSphere',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Occluder',
         'Renderer/TextureMinificationFilter',
         'Renderer/TextureMagnificationFilter',
         'Scene/BillboardCollection',
         'Scene/Camera',
         'Scene/LabelCollection',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin',
         'Scene/Polygon',
         'Scene/PolylineCollection',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum'
     ], 'Scene/PrimitiveCulling', function(
         CompositePrimitive,
         createContext,
         destroyContext,
         createFrameState,
         frameState,
         render,
         BoundingSphere,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Occluder,
         TextureMinificationFilter,
         TextureMagnificationFilter,
         BillboardCollection,
         Camera,
         LabelCollection,
         HorizontalOrigin,
         VerticalOrigin,
         Polygon,
         PolylineCollection,
         SceneMode,
         OrthographicFrustum) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var primitives;
    var us;
    var camera;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        primitives = new CompositePrimitive();

        camera = new Camera(context.getCanvas());
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.up = Cartesian3.UNIT_Z;
        camera.direction = camera.position.normalize().negate();
        camera.frustum.near = 0.01;
        camera.frustum.far = 10.0;
        camera.frustum.fovy = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;

        us = context.getUniformState();
        us.update(createFrameState(camera));
    });

    afterEach(function() {
        primitives = primitives && primitives.destroy();
        us = undefined;
    });

    function verifyNoDraw() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var numRendered = render(context, frameState, primitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        return numRendered;
    }

    function verifyDraw() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var numRendered = render(context, frameState, primitives);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        return numRendered;
    }

    function testCullIn3D(primitive) {
        primitives.add(primitive);

        var savedVolume = frameState.cullingVolume;
        var savedCamera = frameState.camera;

        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var commandList = [];
        primitive.update(context, frameState, commandList);
        var bv = commandList[0].colorList[0].boundingVolume;
        camera.position = bv.center.clone();
        camera.position = camera.position.normalize().multiplyByScalar(camera.position.magnitude() + 1.0);
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = verifyDraw();
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        frameState.camera = savedCamera;
        frameState.cullingVolume = savedVolume;
    }

    function testCullInColumbusView(primitive) {
        primitives.add(primitive);

        var savedVolume = frameState.cullingVolume;
        var savedCamera = frameState.camera;
        var savedMode = frameState.mode;

        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);
        frameState.mode = SceneMode.COLUMBUS_VIEW;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var commandList = [];
        primitive.update(context, frameState, commandList);
        var bv = commandList[0].colorList[0].boundingVolume;
        camera.position = bv.center.clone();
        camera.position.z += 1.0;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y;
        camera.right = camera.direction.cross(camera.up);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = verifyDraw();
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        frameState.mode = savedMode;
        frameState.camera = savedCamera;
        frameState.cullingVolume = savedVolume;
    }

    function testCullIn2D(primitive) {
        primitives.add(primitive);

        var mode = frameState.mode;
        frameState.mode = SceneMode.SCENE2D;

        var savedCamera = frameState.camera;
        frameState.camera = camera;

        var savedVolume = frameState.cullingVolume;
        var orthoFrustum = new OrthographicFrustum();
        orthoFrustum.right = 1.0;
        orthoFrustum.left = -orthoFrustum.right;
        orthoFrustum.top = orthoFrustum.right;
        orthoFrustum.bottom = -orthoFrustum.top;
        orthoFrustum.near = camera.frustum.near;
        orthoFrustum.far = camera.frustum.far;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var commandList = [];
        primitive.update(context, frameState, commandList);
        var bv = commandList[0].colorList[0].boundingVolume;
        camera.position = bv.center.clone();
        camera.position.z += 1.0;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y;
        camera.right = camera.direction.cross(camera.up);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = verifyDraw();
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        frameState.mode = mode;
        frameState.camera = savedCamera;
        frameState.cullingVolume = savedVolume;
    }

    function testOcclusionCull(primitive) {
        primitives.add(primitive);

        var savedCamera = frameState.camera;
        frameState.camera = camera;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var commandList = [];
        primitive.update(context, frameState, commandList);
        var bv = commandList[0].colorList[0].boundingVolume;
        camera.position = bv.center.clone();
        camera.position = camera.position.normalize().multiplyByScalar(camera.position.magnitude() + 1.0);
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);

        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, bv.radius * 2.0), camera.position);
        frameState.occluder = occluder;

        var numRendered = verifyDraw();
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume on the other side of the ellipsoid.
        camera.position = camera.position.negate();
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);

        occluder.setCameraPosition(camera.position);

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        frameState.camera = savedCamera;
        frameState.occluder = undefined;
    }

    // This function is used instead of the testOcclusionCull function for billboards/labels because the
    // bounding volume is view-dependent. All of the "magic numbers" come from adding a billboard/label
    // collection to a Cesium app and looking for when it is/is not occluded.
    function testBillboardOcclusion(billboard) {
        primitives.add(billboard);

        camera.position = new Cartesian3(2414237.2401024024, -8854079.165742973, 7501568.895960614);
        camera.direction = camera.position.negate().normalize();

        var savedCamera = frameState.camera;
        frameState.camera = camera;

        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, Ellipsoid.WGS84.minimumRadius), camera.position);
        frameState.occluder = occluder;

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        camera.position = camera.position.negate();
        camera.direction = camera.direction.negate();

        occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, 536560539.60104907), camera.position);
        frameState.occluder = occluder;

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        frameState.camera = savedCamera;
        frameState.occluder = undefined;
    }

    function createPolygon(degree, ellipsoid) {
        degree = (typeof degree !== 'undefined') ? degree : 50.0;
        ellipsoid = ellipsoid || Ellipsoid.UNIT_SPHERE;
        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-degree, -degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees( degree, -degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees( degree,  degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-degree,  degree, 0.0))
                             ]);
        return polygon;
    }

    it('frustum culls polygon in 3D', function() {
        var polygon = createPolygon(10.0, Ellipsoid.WGS84);
        testCullIn3D(polygon);
    });

    it('frustum culls polygon in Columbus view', function() {
        var polygon = createPolygon(10.0, Ellipsoid.WGS84);
        testCullInColumbusView(polygon);
    });

    it('frustum culls polygon in 2D', function() {
        var polygon = createPolygon(10.0, Ellipsoid.WGS84);
        testCullIn2D(polygon);
    });

    it('polygon occlusion', function() {
        var polygon = createPolygon(1.0);
        testOcclusionCull(polygon);
    });

    function createLabels(position) {
        position = position || { x : -1.0, y : 0.0, z : 0.0 };
        var labels = new LabelCollection();
        labels.add({
            position : position,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        return labels;
    }

    it('frustum culls labels in 3D', function() {
        var labels = createLabels();
        testCullIn3D(labels);
    });

    it('frustum culls labels in Columbus view', function() {
        var labels = createLabels();
        testCullInColumbusView(labels);
    });

    it('frustum culls labels in 2D', function() {
        var labels = createLabels();
        testCullIn2D(labels);
    });

    it('label occlusion', function() {
        var labels = new LabelCollection();
        labels.add({
            position : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic.fromDegrees(-75.10, 39.57)),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        testBillboardOcclusion(labels);
    });

    var greenImage;

    it('initialize billboard image for culling tests', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        waitsFor(function() {
            return greenImage.complete;
        }, 'Load .png file(s) for billboard collection culling tests.', 3000);
    });

    function createBillboard() {
        var atlas = context.createTextureAtlas({images : [greenImage], borderWidthInPixels : 1, initialSize : new Cartesian2(3, 3)});

        // ANGLE Workaround
        atlas.getTexture().setSampler(context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        }));

        var billboards = new BillboardCollection();
        billboards.setTextureAtlas(atlas);
        billboards.add({
            position : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic.fromDegrees(-75.10, 39.57)),
            imageIndex : 0
        });

        return billboards;
    }

    it('frustum culls billboards in 3D', function() {
        var billboards = createBillboard();
        testCullIn3D(billboards);
    });

    it('frustum culls billboards in Columbus view', function() {
        var billboards = createBillboard();
        testCullInColumbusView(billboards);
    });

    it('frustum culls billboards in 2D', function() {
        var billboards = createBillboard();
        testCullIn2D(billboards);
    });

    it('billboard occlusion', function() {
        var billboards = createBillboard();
        testBillboardOcclusion(billboards);
    });

    function createPolylines() {
        var polylines = new PolylineCollection();
        polylines.add({positions:Ellipsoid.WGS84.cartographicArrayToCartesianArray([
            new Cartographic.fromDegrees(-75.10, 39.57),
            new Cartographic.fromDegrees(-80.12, 25.46)
        ])});
        return polylines;
    }

    it('frustum culls polylines in 3D', function() {
        var polylines = createPolylines();
        testCullIn3D(polylines);
    });

    it('frustum culls polylines in Columbus view', function() {
        var polylines = createPolylines();
        testCullInColumbusView(polylines);
    });

    it('frustum culls polylines in 2D', function() {
        var polylines = createPolylines();
        testCullIn2D(polylines);
    });

    it('polyline occlusion', function() {
        var polylines = createPolylines();
        testOcclusionCull(polylines);
    });
}, 'WebGL');