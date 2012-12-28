/*global defineSuite*/
defineSuite([
         'Scene/ScreenSpaceCameraController',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/IntersectionTests',
         'Core/Math',
         'Core/Matrix4',
         'Core/Ray',
         'Scene/Camera',
         'Scene/CameraColumbusViewMode',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode',
         'ThirdParty/Tween'
     ], function(
         ScreenSpaceCameraController,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         GeographicProjection,
         IntersectionTests,
         CesiumMath,
         Matrix4,
         Ray,
         Camera,
         CameraColumbusViewMode,
         OrthographicFrustum,
         SceneMode,
         Tween) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var camera;
    var controller;

    // create a mock canvas object to add events to so they are callable.
    var MockCanvas = function() {
        this._callbacks = {
            keydown : [],
            mousemove : [],
            mouseup : [],
            mousedown : [],
            dblclick : [],
            mousewheel : [],
            touchstart : [],
            touchmove : [],
            touchend : []
        };
        this.disableRootEvents = true;
        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    MockCanvas.prototype.getBoundingClientRect = function() {
        return {
            left : 0,
            top : 0,
            width : 0,
            height : 0
        };
    };

    MockCanvas.prototype.addEventListener = function(name, callback, bubble) {
        if (name === 'DOMMouseScroll') {
            name = 'mousewheel';
        }

        if (this._callbacks[name]) {
            this._callbacks[name].push(callback);
        }
    };

    MockCanvas.prototype.removeEventListener = function(name, callback) {
        if (name === 'DOMMouseScroll') {
            name = 'mousewheel';
        }

        var callbacks = this._callbacks[name];
        var index = -1;
        for ( var i = 0; i < callbacks.length; i++) {
            if (callbacks[i] === callback) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    };

    function emptyStub() {
    }

    MockCanvas.prototype.fireEvents = function(name, args) {
        var callbacks = this._callbacks[name];
        if (!callbacks) {
            return;
        }

        args.preventDefault = emptyStub;
        for ( var i = 0; i < callbacks.length; i++) {
            if (callbacks[i]) {
                callbacks[i](args);
            }
        }
    };

    var MouseButtons = {
            LEFT : 0,
            MIDDLE : 1,
            RIGHT : 2
    };

    beforeEach(function() {
        canvas = new MockCanvas();
        camera = new Camera(canvas);
        controller = new ScreenSpaceCameraController(canvas, camera.controller);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
    });

    it('constructor throws without a canvas', function() {
        expect(function() {
            return new ScreenSpaceCameraController();
        }).toThrow();
    });

    it('constructor throws without a camera', function() {
        expect(function() {
            return new ScreenSpaceCameraController(new MockCanvas());
        }).toThrow();
    });

    it('get/set ellipsoid', function() {
        expect(controller.getEllipsoid()).toEqual(Ellipsoid.WGS84);
        controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        expect(controller.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    function moveMouse(button, startPosition, endPosition, shiftKey) {
        var args = {
            button : button,
            clientX : startPosition.x,
            clientY : startPosition.y,
            shiftKey : shiftKey
        };
        canvas.fireEvents('mousedown', args);
        args.clientX = endPosition.x;
        args.clientY = endPosition.y;
        canvas.fireEvents('mousemove', args);
        canvas.fireEvents('mouseup', args);
    }

    function updateController(frameState) {
        camera.controller.update(frameState.mode, frameState.scene2D);
        controller.update(frameState.mode);
    }

    function setUp2D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE2D,
            scene2D : {
                projection : projection
            }
        };
        var maxRadii = ellipsoid.getMaximumRadius();
        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        return frameState;
    }

    it('translate right in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeLessThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeGreaterThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeLessThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('zoom in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom out in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeLessThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom in 2D with wheel', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
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
        var position = camera.position.clone();
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
        var position = camera.position.clone();

        var factor = 1000000.0;
        camera.frustum.right *= factor;
        camera.frustum.left *= factor;
        camera.frustum.top *= factor;
        camera.frustum.bottom *= factor;

        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom with no mouse movement has no effect on the camera', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
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
        frustum.right = 10.05;
        frustum.left = -frustum.right;
        frustum.top = ratio * frustum.right;
        frustum.bottom = -frustum.top;

        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
    });

    it('rotate counter-clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotate clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
    });

    it('rotates counter-clockwise with mouse position at bottom of the screen', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(3 * canvas.clientWidth / 4, 3 * canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, 3 * canvas.clientHeight / 4);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('adds an animation to correct position or zoom in 2D', function() {
        Tween.removeAll();
        expect(Tween.getAll().length).toEqual(0);

        var frameState = setUp2D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(0, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(Tween.getAll().length).toEqual(1);
    });

    function setUpCV() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.COLUMBUS_VIEW,
            scene2D : {
                projection : projection
            }
        };

        var maxRadii = ellipsoid.getMaximumRadius();
        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        return frameState;
    }

    it('translate right in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeLessThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeGreaterThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeLessThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('looks in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition, true);
        updateController(frameState);
        expect(camera.position).toEqual(position);
        expect(camera.direction).not.toEqual(camera.position.negate().normalize());
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.up.cross(camera.right)).toEqualEpsilon(camera.direction, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zoom in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom out in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeLessThan(camera.position.z);
    });

    it('zoom in Columbus view with wheel', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();

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
        var position = camera.position.clone();

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

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position.normalize().dot(Cartesian3.UNIT_Z)).toBeGreaterThan(0.0);
        expect(camera.direction.dot(Cartesian3.UNIT_Z)).toBeLessThan(0.0);
        expect(camera.up.dot(Cartesian3.UNIT_Z)).toBeGreaterThan(0.0);
        expect(camera.right.dot(Cartesian3.UNIT_Z)).toBeLessThan(CesiumMath.EPSILON16);
    });

    it('rotates in Columus view locked mode', function() {
        var frameState = setUpCV();
        controller.columbusViewMode = CameraColumbusViewMode.LOCKED;

        var position = camera.position.clone();
        var startPosition = new Cartesian2(0, 0);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zooms in Columus view locked mode', function() {
        var frameState = setUpCV();
        controller.columbusViewMode = CameraColumbusViewMode.LOCKED;

        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom in Columbus view locked mode with wheel', function() {
        var frameState = setUpCV();
        controller.columbusViewMode = CameraColumbusViewMode.LOCKED;

        var position = camera.position.clone();

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('adds an animation to correct position or zoom in Columbus view', function() {
        Tween.removeAll();
        expect(Tween.getAll().length).toEqual(0);

        var frameState = setUpCV();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(0, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(4.0 * canvas.clientWidth, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(Tween.getAll().length).toEqual(1);
    });

    function setUp3D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE3D,
            scene2D : {
                projection : projection
            }
        };
        return frameState;
    }

    it('pans in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(3 * canvas.clientWidth / 8, 3 * canvas.clientHeight / 8);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('does not pan if mouse does not intersect the ellipsoid', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(0, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).toEqual(position);
    });

    it('pans in 3D with constrained axis', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(3 * canvas.clientWidth / 8, canvas.clientHeight / 2);
        camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('rotates in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(0, 0);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zoom in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.magnitude()).toBeGreaterThan(camera.position.magnitude());
    });

    it('zoom out in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
        updateController(frameState);
        expect(position.magnitude()).toBeLessThan(camera.position.magnitude());
    });

    it('zoom in 3D with wheel', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        canvas.fireEvents('mousewheel', {
            wheelDelta : 120
        });
        updateController(frameState);
        expect(position.magnitude()).toBeGreaterThan(camera.position.magnitude());
    });

    it('zoom out in 3D with wheel', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        canvas.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        updateController(frameState);
        expect(position.magnitude()).toBeLessThan(camera.position.magnitude());
    });

    it('tilts in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).not.toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);

        var ray = new Ray(camera.getPositionWC(), camera.getDirectionWC());
        var intersection = IntersectionTests.rayEllipsoid(ray, frameState.scene2D.projection.getEllipsoid());
        expect(intersection).toBeDefined();
    });

    it('tilts when the view direction does not intersect the ellipsoid', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        camera.controller.lookRight(CesiumMath.PI_OVER_TWO);
        var ray = new Ray(camera.getPositionWC(), camera.getDirectionWC());
        var intersection = IntersectionTests.rayEllipsoid(ray, frameState.scene2D.projection.getEllipsoid());
        expect(intersection).not.toBeDefined();

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).not.toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('does not tilt in the wrong direction', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, 3 * canvas.clientHeight / 4);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('looks in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition, true);
        updateController(frameState);
        expect(camera.position).toEqual(position);
        expect(camera.direction).not.toEqual(camera.position.negate().normalize());
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.up.cross(camera.right)).toEqualEpsilon(camera.direction, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('pans with constrained axis other than z-axis', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.getMaximumRadius(), 0.0);
        camera.direction = camera.position.normalize().negate();
        camera.up = Cartesian3.UNIT_X.clone();
        camera.right = camera.direction.cross(camera.up);

        var axis = Cartesian3.UNIT_X;
        camera.controller.constrainedAxis = axis;

        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(Cartesian3.dot(camera.position, axis)).toBeGreaterThan(0.0);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(axis.cross(camera.position).normalize(), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(camera.right.cross(camera.direction), CesiumMath.EPSILON15);
    });

    it('rotates with constrained axis', function() {
        var frameState = setUp3D();

        var axis = Cartesian3.UNIT_Z;
        camera.controller.constrainedAxis = axis;

        var startPosition = new Cartesian2(0.0, 0.0);
        var endPosition = new Cartesian2(0.0, canvas.clientHeight);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(camera.position).toEqualEpsilon(axis.multiplyByScalar(camera.position.magnitude()), CesiumMath.EPSILON9);
        expect(camera.direction).toEqualEpsilon(axis.negate(), CesiumMath.EPSILON15);
        expect(Cartesian3.dot(camera.up, axis)).toBeLessThan(CesiumMath.EPSILON2);
        expect(camera.right).toEqualEpsilon(camera.direction.cross(camera.up), CesiumMath.EPSILON15);
    });

    it('pans with constrained axis and is tilted', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.getMaximumRadius(), 0.0);
        camera.direction = camera.position.normalize().negate();
        camera.up = Cartesian3.UNIT_X.clone();
        camera.right = camera.direction.cross(camera.up);

        var axis = Cartesian3.UNIT_Z;
        camera.controller.constrainedAxis = axis;

        var startPosition = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.25);
        var endPosition = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.75);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(Cartesian3.dot(camera.position, axis)).toBeLessThan(CesiumMath.EPSILON2);
        expect(camera.direction).toEqualEpsilon(camera.position.normalize().negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(axis, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(camera.right.cross(camera.direction), CesiumMath.EPSILON15);
    });

    it('rotates with constrained axis and is tilted', function() {
        var frameState = setUp3D();
        camera.position = new Cartesian3(0.0, 2.0 * Ellipsoid.WGS84.getMaximumRadius(), 0.0);
        camera.direction = camera.position.normalize().negate();
        camera.up = Cartesian3.UNIT_X.clone();
        camera.right = camera.direction.cross(camera.up);

        var axis = Cartesian3.UNIT_Z;
        camera.controller.constrainedAxis = axis;

        var startPosition = new Cartesian2(0.0, 0.0);
        var endPosition = new Cartesian2(0.0, canvas.clientHeight);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);

        expect(Cartesian3.dot(camera.position, axis)).toBeLessThan(CesiumMath.EPSILON2);
        expect(camera.direction).toEqualEpsilon(camera.position.normalize().negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(axis, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(camera.right.cross(camera.direction), CesiumMath.EPSILON15);
    });

    it('is destroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});