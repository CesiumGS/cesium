/*global defineSuite*/
defineSuite([
         'Scene/CompositePrimitive',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/BoundingSphere',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Matrix3',
         'Core/Matrix4',
         'Core/Occluder',
         'Renderer/TextureMinificationFilter',
         'Renderer/TextureMagnificationFilter',
         'Scene/BillboardCollection',
         'Scene/Camera',
         'Scene/CentralBody',
         'Scene/LabelCollection',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin',
         'Scene/Polygon',
         'Scene/PolylineCollection',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum'
     ], function(
         CompositePrimitive,
         createContext,
         destroyContext,
         sceneState,
         pick,
         BoundingSphere,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Matrix3,
         Matrix4,
         Occluder,
         TextureMinificationFilter,
         TextureMagnificationFilter,
         BillboardCollection,
         Camera,
         CentralBody,
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
        us.setView(camera.getViewMatrix());
        us.setProjection(camera.frustum.getProjectionMatrix());
        us.setSunPosition(new Cartesian3(-2.0, 0.0, 0.0));
    });

    afterEach(function() {
        primitives = primitives && primitives.destroy();
        us = undefined;
        camera = camera && camera.destroy();
    });

    function createLabels(position) {
        position = position || { x : -1.0, y : 0.0, z : 0.0 };
        var labels = new LabelCollection();
        labels.add({
            position : position,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            font : '1px sans-serif'
        });
        return labels;
    }

    function createPolygon(degree) {
        degree = (typeof degree !== 'undefined') ? degree : 50.0;
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
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

    it('gets default show', function() {
        expect(primitives.show).toEqual(true);
    });

    it('get throws if index is undefined', function() {
        expect(function() {
            primitives.get(undefined);
        }).toThrow();
    });

    it('has zero primitives when constructed', function() {
        expect(primitives.getLength()).toEqual(0);
    });

    it('adds a primitive with add()', function() {
        primitives.add(createLabels());
        expect(primitives.getLength()).toEqual(1);
    });

    it('removes the first primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.getLength()).toEqual(2);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.getLength()).toEqual(1);
        expect(primitives.get(0)).toBe(p1);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.getLength()).toEqual(0);
    });

    it('removes the last primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.getLength()).toEqual(2);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.getLength()).toEqual(1);
        expect(primitives.get(0)).toBe(p0);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.getLength()).toEqual(0);
    });

    it('removes a primitive twice', function() {
        var p0 = createLabels();
        primitives.add(p0);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.remove(p0)).toEqual(false);
    });

    it('removes null', function() {
        expect(primitives.remove()).toEqual(false);
    });

    it('removes all primitives', function() {
        primitives.add(createLabels());
        primitives.add(createLabels());
        primitives.add(createLabels());

        expect(primitives.getLength()).toEqual(3);

        primitives.removeAll();
        expect(primitives.getLength()).toEqual(0);
    });

    it('contains a primitive', function() {
        var labels = createLabels();
        primitives.add(labels);

        expect(primitives.contains(labels)).toEqual(true);
    });

    it('does not contain a primitive', function() {
        var labels0 = createLabels();
        var labels1 = createLabels();
        primitives.add(labels0);

        expect(primitives.contains(labels1)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(primitives.contains()).toEqual(false);
    });

    it('adds and removes a primitive in two composites', function() {
        var p = createLabels();

        primitives.add(p);
        primitives.destroyPrimitives = false;

        var otherPrimitives = new CompositePrimitive(context);
        otherPrimitives.add(p);
        otherPrimitives.destroyPrimitives = false;

        // In both composites
        expect(primitives.contains(p)).toEqual(true);
        expect(otherPrimitives.contains(p)).toEqual(true);

        // In one composite
        expect(primitives.remove(p)).toEqual(true);
        expect(primitives.contains(p)).toEqual(false);
        expect(otherPrimitives.contains(p)).toEqual(true);

        // In neither composite
        expect(otherPrimitives.remove(p)).toEqual(true);
        expect(primitives.contains(p)).toEqual(false);
        expect(otherPrimitives.contains(p)).toEqual(false);
        expect(primitives.remove(p)).toEqual(false);
        expect(otherPrimitives.remove(p)).toEqual(false);

        p.destroy();
        otherPrimitives.destroy();
    });

    it('does not remove from a second composite', function() {
        var p = createLabels();
        primitives.add(p);

        var otherPrimitives = new CompositePrimitive(context);

        expect(otherPrimitives.contains(p)).toEqual(false);
        expect(otherPrimitives.remove(p)).toEqual(false);
    });

    it('gets default destroyPrimitives', function() {
        expect(primitives.destroyPrimitives).toEqual(true);
    });

    it('setting a central body', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cb = new CentralBody(ellipsoid);
        primitives.setCentralBody(cb);

        expect(primitives.getCentralBody()).toBe(cb);
    });

    it('renders a primitive added with add()', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.add(createLabels());
        primitives.update(context, sceneState);
        primitives.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.show = false;
        primitives.add(createLabels());
        primitives.update(context, sceneState);
        primitives.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders a primitive in more than one composite', function() {
        var otherPrimitives = new CompositePrimitive(context);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var p = createLabels();
        primitives.add(p);
        otherPrimitives.add(p);
        otherPrimitives.destroyPrimitives = false;

        primitives.update(context, sceneState);
        primitives.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        // Render using other composite
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        otherPrimitives.update(context, sceneState);
        otherPrimitives.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        otherPrimitives.destroy();
    });

    it('renders child composites', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var children = new CompositePrimitive();
        children.add(createLabels());
        primitives.add(children);

        primitives.update(context, sceneState);
        primitives.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('picks a primitive added with add()', function() {
        var labels = createLabels();
        var l = labels.get(0);

        primitives.add(labels);
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(l);
    });

    it('does not pick', function() {
        var labels = createLabels();

        primitives.show = false;
        primitives.add(labels);
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('picks child composites', function() {
        var labels = createLabels();
        var l = labels.get(0);

        var children = new CompositePrimitive();
        children.add(labels);
        primitives.add(children);

        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(l);
    });

    it('picks a primitive added with render order (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with render order (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p1);
        primitives.add(p0);
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with bringForward (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.bringForward(p1); // Already on top
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with bringForward (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.bringForward(p0); // Moved to top
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with bringToFront (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.bringToFront(p1); // Already on top
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with bringToFront (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.bringToFront(p0); // Moved to top
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with sendBackward (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.sendBackward(p1); // Moved back
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with sendBackward (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.sendBackward(p0); // Already on bottom
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with sendToBack (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.sendToBack(p1); // Moved back
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with sendToBack (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.sendToBack(p0); // Already on bottom
        primitives.update(context, sceneState);

        var pickedObject = pick(context, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('renders a central body', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);
        primitives.setCentralBody(cb);

        primitives.update(context, sceneState);
        primitives.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('is not destroyed when first constructed', function() {
        expect(primitives.isDestroyed()).toEqual(false);
    });

    it('is destroyed after calling destroy()', function() {
        var p = new CompositePrimitive();
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('destroys its primitives', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys children', function() {
        var labels = new LabelCollection(context);

        var children = new CompositePrimitive();
        children.add(labels);

        primitives.add(children);
        expect(children.isDestroyed()).toEqual(false);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(children.isDestroyed()).toEqual(true);
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys primitive on remove', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.remove(labels);
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys primitive on removeAll', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.removeAll();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys primitive on setCentralBody', function() {
        var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);

        primitives.setCentralBody(cb);
        expect(cb.isDestroyed()).toEqual(false);

        primitives.setCentralBody(null);
        expect(cb.isDestroyed()).toEqual(true);
    });

    it('does not destroy its primitives', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('does not destroy primitive on remove', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.remove(labels);
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('does not destroy primitive on removeAll', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.removeAll();
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('does not destroy primitive on setCentralBody', function() {
        var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);

        primitives.destroyPrimitives = false;
        primitives.setCentralBody(cb);
        expect(cb.isDestroyed()).toEqual(false);

        primitives.setCentralBody(null);
        expect(cb.isDestroyed()).toEqual(false);

        cb.destroy();
        expect(cb.isDestroyed()).toEqual(true);
    });

    it('throws when add() without an primitive', function() {
        expect(function() {
            primitives.add();
        }).toThrow();
    });

    it('bringForward throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.bringForward(p);
        }).toThrow();
    });

    it('bringToFront throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.bringToFront(p);
        }).toThrow();
    });

    it('sendBackward throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.sendBackward(p);
        }).toThrow();
    });

    it('sendToBack throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.sendToBack(p);
        }).toThrow();
    });

    function verifyNoDraw() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.update(context, sceneState);
        var numRendered = primitives._renderList.length;
        primitives.render(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        return numRendered;
    }

    function verifyDraw() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.update(context, sceneState);
        var numRendered = primitives._renderList.length;
        primitives.render(context);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        return numRendered;
    }

    function testCullIn3D(primitive) {
        primitives.add(primitive);

        var savedCamera = sceneState.camera;
        sceneState.camera = camera;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var state = primitive.update(context, sceneState);
        var bv = state.boundingVolume;
        camera.position = bv.center.clone();
        camera.position = camera.position.normalize().multiplyByScalar(camera.position.magnitude() + 1.0);
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        sceneState.camera = savedCamera;
    }

    function testCullInColumbusView(primitive) {
        primitives.add(primitive);

        var savedCamera = sceneState.camera;
        sceneState.camera = camera;

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.COLUMBUS_VIEW;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var state = primitive.update(context, sceneState);
        var bv = state.boundingVolume;
        camera.position = bv.center.clone();
        camera.position.z += 1.0;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y;
        camera.right = camera.direction.cross(camera.up);

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        sceneState.mode = mode;
        sceneState.camera = savedCamera;
    }

    function testCullIn2D(primitive) {
        primitives.add(primitive);

        var savedCamera = sceneState.camera;
        sceneState.camera = camera;

        var orthoFrustum = new OrthographicFrustum();
        orthoFrustum.right = 1.0;
        orthoFrustum.left = -orthoFrustum.right;
        orthoFrustum.top = orthoFrustum.right;
        orthoFrustum.bottom = -orthoFrustum.top;
        orthoFrustum.near = camera.frustum.near;
        orthoFrustum.far = camera.frustum.far;
        camera.frustum = orthoFrustum;

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.SCENE2D;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var state = primitive.update(context, sceneState);
        var bv = state.boundingVolume;
        camera.position = new Cartesian3(bv.x + bv.width * 0.5, bv.y + bv.height * 0.5, 1.0);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y;
        camera.right = camera.direction.cross(camera.up);

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        // reposition camera so bounding volume is outside frustum.
        camera.position = camera.position.add(camera.right.multiplyByScalar(8000000000.0));

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        sceneState.mode = mode;
        sceneState.camera = savedCamera;
    }

    function testOcclusionCull(primitive) {
        primitives.add(primitive);

        var savedCamera = sceneState.camera;
        sceneState.camera = camera;

        // get bounding volume for primitive and reposition camera so its in the the frustum.
        var state = primitive.update(context, sceneState);
        var bv = state.boundingVolume;
        camera.position = bv.center.clone();
        camera.position = camera.position.normalize().multiplyByScalar(camera.position.magnitude() + 1.0);
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);


        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, bv.radius * 2.0), camera.position);
        sceneState.occluder = occluder;

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        // reposition camera so bounding volume on the other side of the ellipsoid.
        camera.position = camera.position.negate();
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);

        occluder.setCameraPosition(camera.position);

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        sceneState.camera = savedCamera;
        sceneState.occluder = undefined;
    }

    it('frustum culls polygon in 3D', function() {
        var polygon = createPolygon();
        testCullIn3D(polygon);
    });

    it('frustum culls polygon in Columbus view', function() {
        var polygon = createPolygon();
        testCullInColumbusView(polygon);
    });

    it('frustum culls polygon in 2D', function() {
        var polygon = createPolygon();
        testCullIn2D(polygon);
    });

    it('polygon occlusion', function() {
        var polygon = createPolygon(1.0);
        testOcclusionCull(polygon);
    });

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
        // This test doesn't use the testOcclusionCull function because the
        // bounding volume is view-dependent and the text isn't 1x1 pixels in
        // size. All of the "magic numbers" come from adding this label
        // collection to a Cesium app and looking for when it is/is not occluded.

        var labels = new LabelCollection();
        labels.add({
            position : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic.fromDegrees(-75.10, 39.57)),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        primitives.add(labels);

        camera.position = new Cartesian3(2414237.2401024024, -8854079.165742973, 7501568.895960614);
        camera.direction = camera.position.negate().normalize();

        var savedCamera = sceneState.camera;
        sceneState.camera = camera;

        var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, Ellipsoid.WGS84.getMinimumRadius()), camera.position);
        sceneState.occluder = occluder;

        var numRendered = verifyDraw();
        expect(numRendered).toEqual(1);

        camera.position = camera.position.negate();
        camera.direction = camera.direction.negate();

        occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, 536560539.60104907), camera.position);
        sceneState.occluder = occluder;

        numRendered = verifyNoDraw();
        expect(numRendered).toEqual(0);

        sceneState.camera = savedCamera;
        sceneState.occluder = undefined;
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

    it('billboards occlusion', function() {
        var billboards = createBillboard();
        testOcclusionCull(billboards);
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
});