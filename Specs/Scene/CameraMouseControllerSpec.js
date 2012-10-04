/*global defineSuite*/
defineSuite([
         'Scene/CameraMouseController',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Math',
         'Core/Matrix4',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode'
     ], function(
         CameraMouseController,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         EquidistantCylindricalProjection,
         CesiumMath,
         Matrix4,
         Camera,
         OrthographicFrustum,
         SceneMode) {
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
        controller = new CameraMouseController(canvas, camera);
    });

    it('constructor throws without a canvas', function() {
        expect(function() {
            return new CameraMouseController();
        }).toThrow();
    });

    it('constructor throws without a camera', function() {
        expect(function() {
            return new CameraMouseController(new MockCanvas());
        }).toThrow();
    });

    it('get/set ellipsoid', function() {
        expect(controller.getEllipsoid()).toEqual(Ellipsoid.WGS84);
        controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        expect(controller.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it('update throws when mode is 2D and frustum is not orthographic', function() {
        var frameState = {
            mode : SceneMode.SCENE2D,
            scene2D : {
                projection : new EquidistantCylindricalProjection()
            }
        };
        expect(function() {
            controller.update(frameState);
        }).toThrow();
    });

    function moveMouse(button, startPosition, endPosition) {
        canvas.fireEvents('mousedown', {
            button : button,
            clientX : startPosition.x,
            clientY : startPosition.y
        });
        canvas.fireEvents('mousemove', {
            button : button,
            clientX : endPosition.x,
            clientY : endPosition.y
        });
        canvas.fireEvents('mouseup', {
            button : button,
            clientX : endPosition.x,
            clientY : endPosition.y
        });
    }

    function updateController(frameState) {
        camera.controller.update(frameState);
        controller.update(frameState);
    }

    function setUp2D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new EquidistantCylindricalProjection(ellipsoid);
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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

    it('rotate counter-clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position;
        var startPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotate clockwise in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 4, canvas.clientHeight / 2);

        moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
        updateController(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);

        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    function setUpCV() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new EquidistantCylindricalProjection(ellipsoid);
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;
        var startPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 4);
        var endPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        updateController(frameState);
        expect(position.y).toBeLessThan(camera.position.y);
        expect(position.x).toEqual(camera.position.x);
        expect(position.z).toEqual(camera.position.z);
    });

    it('zoom in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position;
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
        var position = camera.position;
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
        var position = camera.position;

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
        var position = camera.position;

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
});