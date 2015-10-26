/*global defineSuite*/
defineSuite([
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/loadImage',
        'Core/Math',
        'Core/Occluder',
        'Core/PolygonGeometry',
        'Renderer/Sampler',
        'Renderer/TextureMagnificationFilter',
        'Renderer/TextureMinificationFilter',
        'Scene/BillboardCollection',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/HorizontalOrigin',
        'Scene/LabelCollection',
        'Scene/Material',
        'Scene/OrthographicFrustum',
        'Scene/PolylineCollection',
        'Scene/Primitive',
        'Scene/PrimitiveCollection',
        'Scene/SceneMode',
        'Scene/TextureAtlas',
        'Scene/VerticalOrigin',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/render'
    ], 'Scene/PrimitiveCulling', function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        defaultValue,
        Ellipsoid,
        GeometryInstance,
        loadImage,
        CesiumMath,
        Occluder,
        PolygonGeometry,
        Sampler,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        BillboardCollection,
        EllipsoidSurfaceAppearance,
        HorizontalOrigin,
        LabelCollection,
        Material,
        OrthographicFrustum,
        PolylineCollection,
        Primitive,
        PrimitiveCollection,
        SceneMode,
        TextureAtlas,
        VerticalOrigin,
        createCamera,
        createContext,
        createFrameState,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;
    var primitives;
    var us;
    var camera;
    var greenImage;

    beforeAll(function() {
        context = createContext();

        return loadImage('./Data/Images/Green.png').then(function(image) {
            greenImage = image;
        });
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        primitives = new PrimitiveCollection();

        camera = createCamera();

        frameState = createFrameState(context, camera);
        us = context.uniformState;
        us.update(frameState);
    });

    afterEach(function() {
        primitives = primitives && primitives.destroy();
        us = undefined;
    });

    function testCullIn3D(primitive) {
        primitives.add(primitive);

        var savedVolume = frameState.cullingVolume;
        var savedCamera = frameState.camera;

        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        primitive.update(frameState);
        var commandList = frameState.commandList;
        var bv = commandList[0].boundingVolume;
        camera.position = Cartesian3.clone(bv.center);
        camera.position = Cartesian3.multiplyByScalar(Cartesian3.normalize(camera.position, new Cartesian3()), Cartesian3.magnitude(camera.position) + 1.0, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.cross(camera.right, camera.direction, new Cartesian3());
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = render(frameState, primitives);
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        Cartesian3.add(camera.position, Cartesian3.multiplyByScalar(camera.right, 8000000000.0, new Cartesian3()), camera.position);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = render(frameState, primitives);
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
        primitive.update(frameState);
        var commandList = frameState.commandList;
        var bv = commandList[0].boundingVolume;
        camera.position = Cartesian3.clone(bv.center);
        camera.position.z += 1.0;
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = render(frameState, primitives);
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        Cartesian3.add(camera.position, Cartesian3.multiplyByScalar(camera.right, 8000000000.0, new Cartesian3()), camera.position);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = render(frameState, primitives);
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
        primitive.update(frameState);
        var commandList = frameState.commandList;
        var bv = commandList[0].boundingVolume;
        camera.position = Cartesian3.clone(bv.center);
        camera.position.z += 1.0;
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = render(frameState, primitives);
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume is outside frustum.
        Cartesian3.add(camera.position, Cartesian3.multiplyByScalar(camera.right, 8000000000.0, new Cartesian3()), camera.position);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = render(frameState, primitives);
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
        primitive.update(frameState);
        var commandList = frameState.commandList;
        var bv = commandList[0].boundingVolume;
        camera.position = Cartesian3.clone(bv.center);
        camera.position = Cartesian3.multiplyByScalar(Cartesian3.normalize(camera.position, new Cartesian3()), Cartesian3.magnitude(camera.position) + 1.0, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.cross(camera.right, camera.direction, new Cartesian3());

        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, bv.radius * 2.0), camera.position);
        frameState.occluder = occluder;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        var numRendered = render(frameState, primitives);
        expect(numRendered).toBeGreaterThan(0);

        // reposition camera so bounding volume on the other side of the ellipsoid.
        camera.position = Cartesian3.negate(camera.position, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.cross(camera.right, camera.direction, new Cartesian3());

        occluder.cameraPosition = camera.position;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        numRendered = render(frameState, primitives);
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
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());

        var savedCamera = frameState.camera;
        frameState.camera = camera;

        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, Ellipsoid.WGS84.minimumRadius), camera.position);
        frameState.occluder = occluder;

        var numRendered = render(frameState, primitives);
        expect(numRendered).toEqual(1);

        camera.position  = Cartesian3.negate(camera.position, new Cartesian3());
        camera.direction = Cartesian3.negate(camera.direction, new Cartesian3());

        occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, 536560539.60104907), camera.position);
        frameState.occluder = occluder;

        numRendered = render(frameState, primitives);
        expect(numRendered).toEqual(0);

        frameState.camera = savedCamera;
        frameState.occluder = undefined;
    }

    function createPolygon(degree, ellipsoid) {
        degree = defaultValue(degree, 50.0);
        var polygon = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: PolygonGeometry.fromPositions({
                    positions: Cartesian3.fromDegreesArray([
                        -degree, -degree,
                        degree, -degree,
                        degree, degree,
                        -degree, degree
                    ]),
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid: ellipsoid,
                    granularity: CesiumMath.toRadians(20.0)
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            }),
            asynchronous: false
        });
        polygon.appearance.material.translucent = false;

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
        position = defaultValue(position, {
            x : -1.0,
            y : 0.0,
            z : 0.0
        });
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
            position : Cartesian3.fromDegrees(-75.10, 39.57),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        testBillboardOcclusion(labels);
    });

    function createBillboard() {
        var atlas = new TextureAtlas({
            context : context,
            borderWidthInPixels : 1,
            initialSize : new Cartesian2(3, 3)
        });

        // ANGLE Workaround
        atlas.texture.sampler = new Sampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });

        var billboards = new BillboardCollection();
        billboards.textureAtlas = atlas;
        billboards.add({
            position : Cartesian3.fromDegrees(-75.10, 39.57),
            image : greenImage
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
        var material = Material.fromType('Color');
        material.translucent = false;

        var polylines = new PolylineCollection();
        polylines.add({
            positions : Cartesian3.fromDegreesArray([
                -75.10, 39.57,
                -80.12, 25.46
            ]),
            material : material
        });
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
