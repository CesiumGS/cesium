/*global defineSuite*/
defineSuite([
        'Scene/ScreenSpaceCameraController',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/IntersectionTests',
        'Core/KeyboardEventModifier',
        'Core/Math',
        'Core/Matrix4',
        'Core/Ray',
        'Core/Transforms',
        'Scene/Camera',
        'Scene/CameraEventType',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/MockCanvas'
    ], function(
        ScreenSpaceCameraController,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        GeographicProjection,
        IntersectionTests,
        KeyboardEventModifier,
        CesiumMath,
        Matrix4,
        Ray,
        Transforms,
        Camera,
        CameraEventType,
        OrthographicFrustum,
        SceneMode,
        createCamera,
        MockCanvas) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var camera;
    var controller;

    var MouseButtons = MockCanvas.MouseButtons;

    beforeEach(function() {
        // create a mock canvas object to add events to so they are callable.
        canvas = new MockCanvas();

        var maxRadii = Ellipsoid.WGS84.maximumRadius;
        var position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0), new Cartesian3()), 2.5 * maxRadii, new Cartesian3());
        var direction = Cartesian3.normalize(Cartesian3.negate(position, new Cartesian3()), new Cartesian3());
        var right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z, new Cartesian3()), new Cartesian3());
        var up = Cartesian3.cross(right, direction, new Cartesian3());

        camera = createCamera({
            canvas : canvas,
            eye : position,
            target : Cartesian3.ZERO,
            up : up,
            near : 1.0,
            far : 500000000.0
        });
        controller = new ScreenSpaceCameraController(canvas, camera);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
    });

    it('constructor throws without a canvas', function() {
        expect(function() {
            return new ScreenSpaceCameraController();
        }).toThrowDeveloperError();
    });

    it('constructor throws without a camera', function() {
        expect(function() {
            return new ScreenSpaceCameraController(new MockCanvas());
        }).toThrowDeveloperError();
    });

    it('get/set ellipsoid', function() {
        expect(controller.ellipsoid).toEqual(Ellipsoid.WGS84);
        controller.ellipsoid = Ellipsoid.UNIT_SPHERE;
        expect(controller.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    function updateController(frameState) {
        camera.update(frameState.mode);
        controller.update(frameState.mode);
    }

    function setUp2D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE2D,
            mapProjection : projection
        };
        var maxRadii = ellipsoid.maximumRadius;
        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_X);

        return frameState;
    }

    it('translate right in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeLessThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeGreaterThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeLessThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate in rotated 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        camera.up = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('zoom in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom out in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeLessThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom in 2D with wheel', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom out in 2D with wheel', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;

        canvas.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeLessThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom with max zoom rate in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);

        var factor = 1000000.0;
        camera.frustum.right *= factor;
        camera.frustum.left *= factor;
        camera.frustum.top *= factor;
        camera.frustum.bottom *= factor;

        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom with no mouse movement has no effect on the camera', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
    });

    it('zoom in does not affect camera close to the surface', function() {
        var frameState = setUp2D();

        var frustum = camera.frustum;
        var ratio = frustum.top / frustum.right;
        frustum.right = (controller.minimumZoomDistance + 1.0) * 0.5;
        frustum.left = -frustum.right;
        frustum.top = ratio * frustum.right;
        frustum.bottom = -frustum.top;

        var position = Cartesian3.clone(camera.position);
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
    });

    it('zooms out with maximum distance in 2D', function() {
        var frameState = setUp2D();

        var frustum = camera.frustum;
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        var maxZoom = 10.0;
        controller.minimumZoomDistance = 0.0;
        controller.maximumZoomDistance = maxZoom;

        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(camera.frustum.right).toEqualEpsilon(maxZoom * 0.5, CesiumMath.EPSILON10);
        expect(camera.frustum.left).toEqual(-camera.frustum.right);
        expect(camera.frustum.top).toEqualEpsilon(maxZoom * 0.25, CesiumMath.EPSILON10);
        expect(camera.frustum.bottom).toEqual(-camera.frustum.top);
    });

    it('rotate counter-clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotate clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotates counter-clockwise with mouse position at bottom of the screen', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(3 * canvas.clientWidth / 4, 3 * canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, 3 * canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('adds an animation to correct position or zoom in 2D', function() {
        var frameState = setUp2D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(0, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(controller._tweens.length).toEqual(1);
    });

    function setUpCV() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.COLUMBUS_VIEW,
            mapProjection : projection
        };

        var maxRadii = ellipsoid.maximumRadius;
        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_X);

        return frameState;
    }

    it('translate right in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeLessThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeGreaterThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeLessThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('looks in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition, true);
        updateController(frameState);
        expect(camera.position).toEqual(position);
        expect(camera.direction).not.toEqual(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()));
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.up, camera.right, new Cartesian3())).toEqualEpsilon(camera.direction, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zoom in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom out in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeLessThan(camera.position.z);
    });

    it('zoom in Columbus view with wheel', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom out in Columbus view with wheel', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);

        canvas.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeLessThan(camera.position.z);
    });

    it('rotates in Columbus view', function() {
        var frameState = setUpCV();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(3 * canvas.clientWidth / 8, 3 * canvas.clientHeight / 8);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.dot(Cartesian3.normalize(camera.position, new Cartesian3()), Cartesian3.UNIT_Z)).toBeGreaterThan(0.0);
        expect(Cartesian3.dot(camera.direction, Cartesian3.UNIT_Z)).toBeLessThan(0.0);
        expect(Cartesian3.dot(camera.up, Cartesian3.UNIT_Z)).toBeGreaterThan(0.0);
        expect(Cartesian3.dot(camera.right, Cartesian3.UNIT_Z)).toBeLessThan(CesiumMath.EPSILON7);
    });

    it('rotates in Columus view with camera transform set', function() {
        var frameState = setUpCV();

        var origin = Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-72.0, 40.0));
        camera.transform = Transforms.eastNorthUpToFixedFrame(origin);

        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(0, 0);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
    });

    it('zooms in Columus view with camera transform set', function() {
        var frameState = setUpCV();

        var origin = Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-72.0, 40.0));
        camera.transform = Transforms.eastNorthUpToFixedFrame(origin);

        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom in Columbus view with camera transform set and with wheel', function() {
        var frameState = setUpCV();

        var origin = Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-72.0, 40.0));
        camera.transform = Transforms.eastNorthUpToFixedFrame(origin);

        var position = Cartesian3.clone(camera.position);

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('adds an animation to correct position or zoom in Columbus view', function() {
        var frameState = setUpCV();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(0, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(4.0 * canvas.clientWidth, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(controller._tweens.length).toEqual(1);
    });

    function setUp3D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE3D,
            mapProjection : projection
        };
        return frameState;
    }

    it('pans in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(3 * canvas.clientWidth / 8, 3 * canvas.clientHeight / 8);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('does not pan if mouse does not intersect the ellipsoid', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(0, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).toEqual(position);
    });

    it('pans in 3D with constrained axis', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(3 * canvas.clientWidth / 8, canvas.clientHeight / 2);
        camera.constrainedAxis = Cartesian3.clone(Cartesian3.UNIT_Z);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
    });

    it('rotates in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(0, 0);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zoom in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.magnitude(position)).toBeGreaterThan(Cartesian3.magnitude(camera.position));
    });

    it('zoom out in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.magnitude(position)).toBeLessThan(Cartesian3.magnitude(camera.position));
    });

    it('zooms out to maximum height in 3D', function() {
        var frameState = setUp3D();

        var positionCart = Ellipsoid.WGS84.cartesianToCartographic(camera.position);
        positionCart.height = 0.0;
        camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);

        var maxDist = 100.0;
        controller.minimumZoomDistance = 0.0;
        controller.maximumZoomDistance = maxDist;

        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight * 50);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);

        var height = Ellipsoid.WGS84.cartesianToCartographic(camera.position).height;
        expect(height).toEqualEpsilon(maxDist, CesiumMath.EPSILON2);
    });

    it('zoom in 3D with wheel', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(Cartesian3.magnitude(position)).toBeGreaterThan(Cartesian3.magnitude(camera.position));
    });

    it('zoom out in 3D with wheel', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);

        canvas.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        updateController(frameState);
        expect(Cartesian3.magnitude(position)).toBeLessThan(Cartesian3.magnitude(camera.position));
    });

    it('tilts in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).not.toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);

        var ray = new Ray(camera.positionWC, camera.directionWC);
        var intersection = IntersectionTests.rayEllipsoid(ray, frameState.mapProjection.ellipsoid);
        expect(intersection).toBeDefined();
    });

    it('tilts when the view direction does not intersect the ellipsoid', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        camera.lookRight(CesiumMath.PI_OVER_TWO);
        var ray = new Ray(camera.positionWC, camera.directionWC);
        var intersection = IntersectionTests.rayEllipsoid(ray, frameState.mapProjection.ellipsoid);
        expect(intersection).not.toBeDefined();

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).not.toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
    });

    it('does not tilt in the wrong direction', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, 3 * canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('tilts at the minimum zoom distance', function() {
        var frameState = setUp3D();

        var positionCart = Ellipsoid.WGS84.cartesianToCartographic(camera.position);
        positionCart.height = controller.minimumZoomDistance;
        camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);

        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);

        var height = Ellipsoid.WGS84.cartesianToCartographic(camera.position).height;
        expect(height).toBeLessThan(controller.minimumZoomDistance);
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
    });

    it('looks in 3D', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition, true);
        updateController(frameState);
        expect(camera.position).toEqual(position);
        expect(camera.direction).not.toEqual(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()));
        expect(Cartesian3.cross(camera.direction, camera.up, new Cartesian3())).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.up, camera.right, new Cartesian3())).toEqualEpsilon(camera.direction, CesiumMath.EPSILON15);
        expect(Cartesian3.cross(camera.right, camera.direction, new Cartesian3())).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('pans with constrained axis other than z-axis', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.maximumRadius, 0.0);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var axis = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.constrainedAxis = axis;

        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.dot(camera.position, axis)).toBeGreaterThan(0.0);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(Cartesian3.normalize(Cartesian3.cross(axis, camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(camera.up).toEqualEpsilon(Cartesian3.cross(camera.right, camera.direction, new Cartesian3()), CesiumMath.EPSILON14);
    });

    it('rotates with constrained axis', function() {
        var frameState = setUp3D();

        var axis = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.constrainedAxis = axis;

        var startPosition = new Cartesian2(0.0, 0.0);
        var endPosition = new Cartesian2(0.0, canvas.clientHeight);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position.z).toEqualEpsilon(Cartesian3.magnitude(camera.position), CesiumMath.EPSILON1);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(axis, new Cartesian3()), CesiumMath.EPSILON4);
        expect(Cartesian3.dot(camera.up, axis)).toBeLessThan(CesiumMath.EPSILON2);
        expect(camera.right).toEqualEpsilon(Cartesian3.cross(camera.direction, camera.up, new Cartesian3()), CesiumMath.EPSILON4);
    });

    it('pans with constrained axis and is tilted', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.maximumRadius, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var axis = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.constrainedAxis = axis;

        var startPosition = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.25);
        var endPosition = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.75);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(Cartesian3.dot(camera.position, axis)).toBeLessThan(CesiumMath.EPSILON2);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(axis, CesiumMath.EPSILON14);
        expect(camera.up).toEqualEpsilon(Cartesian3.cross(camera.right, camera.direction, new Cartesian3()), CesiumMath.EPSILON14);
    });

    it('rotates with constrained axis and is tilted', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.maximumRadius, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var axis = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.constrainedAxis = axis;

        var startPosition = new Cartesian2(0.0, 0.0);
        var endPosition = new Cartesian2(0.0, canvas.clientHeight);

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(Cartesian3.dot(Cartesian3.normalize(camera.position, new Cartesian3()), axis)).toEqualEpsilon(1.0, CesiumMath.EPSILON2);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON4);
        expect(camera.up).toEqualEpsilon(Cartesian3.cross(camera.right, camera.direction, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('controller does not modify the camera after re-enabling motion', function() {
        var frameState = setUp3D();
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        var startPosition = new Cartesian2(0.0, 0.0);
        var endPosition = new Cartesian2(canvas.clientWidth, canvas.clientHeight);

        controller.enableRotate = false;
        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);

        controller.enableRotate = true;
        updateController(frameState);

        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);
    });

    it('can set input type to undefined', function() {
        var frameState = setUp3D();
        controller.zoomEventTypes = undefined;

        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).toEqual(position);
    });

    it('can change default input', function() {
        var frameState = setUp3D();
        controller.translateEventTypes = undefined;
        controller.rotateEventTypes = undefined;
        controller.tiltEventTypes = undefined;
        controller.lookEventTypes = undefined;

        var position = Cartesian3.clone(camera.position);
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        controller.zoomEventTypes = CameraEventType.LEFT_DRAG;
        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.magnitude(camera.position)).toBeLessThan(Cartesian3.magnitude(position));

        position = Cartesian3.clone(camera.position);
        controller.zoomEventTypes = {
            eventType : CameraEventType.LEFT_DRAG,
            modifier : KeyboardEventModifier.SHIFT
        };
        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, endPosition, startPosition, true);
        updateController(frameState);
        expect(Cartesian3.magnitude(camera.position)).toBeGreaterThan(Cartesian3.magnitude(position));

        position = Cartesian3.clone(camera.position);
        controller.zoomEventTypes = [
            CameraEventType.MIDDLE_DRAG,
            {
                eventType : CameraEventType.LEFT_DRAG,
                modifier : KeyboardEventModifier.SHIFT
            }
        ];
        MockCanvas.moveMouse(canvas, MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.magnitude(camera.position)).toBeLessThan(Cartesian3.magnitude(position));

        position = Cartesian3.clone(camera.position);
        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, endPosition, startPosition, true);
        updateController(frameState);
        expect(Cartesian3.magnitude(camera.position)).toBeGreaterThan(Cartesian3.magnitude(position));
    });

    it('is destroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});
