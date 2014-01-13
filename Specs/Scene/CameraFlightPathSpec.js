/*global defineSuite*/
defineSuite([
         'Scene/CameraFlightPath',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Extent',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function (
         CameraFlightPath,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Extent,
         OrthographicFrustum,
         SceneMode,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var frameState;

    beforeEach(function() {
        scene = createScene();
        frameState = scene.getFrameState();
    });

    afterEach(function() {
        destroyScene(scene);
    });

    function createOrthographicFrustum() {
        var current = frameState.camera.frustum;
        var f = new OrthographicFrustum();
        f.near = current.near;
        f.far = current.far;

        var tanTheta = Math.tan(0.5 * current.fovy);
        f.top = f.near * tanTheta;
        f.bottom = -f.top;
        f.right = current.aspectRatio * f.top;
        f.left = -f.right;

        return f;
    }

    it('create animation throws without a scene', function() {
        expect(function() {
            CameraFlightPath.createAnimation(undefined, {
                destination : new Cartesian3(1e9, 1e9, 1e9)
            });
        }).toThrow();
    });

    it('create animation throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimation(scene, {});
        }).toThrow();
    });

    it('create animation throws with just up and no direction', function() {
        expect(function() {
            CameraFlightPath.createAnimation(scene, {
                destination : Cartesian3.ZERO,
                up : Cartesian3.UNIT_Z
            });
        }).toThrow();
    });

    it('create animation throws with just direction and no up', function() {
        expect(function() {
            CameraFlightPath.createAnimation(scene, {
                destination : Cartesian3.ZERO,
                direction : Cartesian3.UNIT_X
            });
        }).toThrow();
    });

    it('create animation with cartographic throws without a scene', function() {
        expect(function() {
            CameraFlightPath.createAnimationCartographic(undefined, {
                destination : new Cartographic(0.0, 0.0, 1e6)
            });
        }).toThrow();
    });

    it('create animation with cartographic throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimationCartographic(scene, {});
        }).toThrow();
    });

    it('create animation with extent throws without a scene', function() {
        expect(function() {
            CameraFlightPath.createAnimationExtent(undefined, {
                destination : new Cartographic(0.0, 0.0, 1e6)
            });
        }).toThrow();
    });

    it('create animation with extent throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimationExtent(scene, {});
        }).toThrow();
    });

    it('creates an animation', function() {
        var destination = new Cartesian3(1e9, 1e9, 1e9);
        var duration = 5000.0;
        var onComplete = function() {
            return true;
        };
        var onCancel = function() {
            return true;
        };

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : destination,
            duration : duration,
            onComplete : onComplete,
            onCancel: onCancel
        });

        expect(flight.duration).toEqual(duration);
        expect(typeof flight.onComplete).toEqual('function');
        expect(typeof flight.onCancel).toEqual('function');
        expect(typeof flight.onUpdate).toEqual('function');
        expect(flight.startValue).toBeDefined();
        expect(flight.stopValue).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('creates an animation with cartographic', function() {
        var destination = new Cartographic(0.0, 0.0, 1e6);
        var duration = 5000.0;
        var onComplete = function() {
            return true;
        };
        var onCancel = function() {
            return true;
        };

        var flight = CameraFlightPath.createAnimationCartographic(scene, {
            destination : destination,
            duration : duration,
            onComplete : onComplete,
            onCancel: onCancel
        });

        expect(flight.duration).toEqual(duration);
        expect(typeof flight.onComplete).toEqual('function');
        expect(typeof flight.onCancel).toEqual('function');
        expect(typeof flight.onUpdate).toEqual('function');
        expect(flight.startValue).toBeDefined();
        expect(flight.stopValue).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('creates an animation with extent', function() {
        var destination = new Extent(-1, -1, 1, 1);
        var duration = 5000.0;
        var onComplete = function() {
            return true;
        };
        var onCancel = function() {
            return true;
        };

        var flight = CameraFlightPath.createAnimationExtent(scene, {
            destination : destination,
            duration : duration,
            onComplete : onComplete,
            onCancel: onCancel
        });

        expect(flight.duration).toEqual(duration);
        expect(typeof flight.onComplete).toEqual('function');
        expect(typeof flight.onCancel).toEqual('function');
        expect(typeof flight.onUpdate).toEqual('function');
        expect(flight.startValue).toBeDefined();
        expect(flight.stopValue).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('createAnimation throws if mode is morphing', function() {
        expect( function() {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Cartesian3(1e9, 1e9, 1e9);
            CameraFlightPath.createAnimation(scene, {
                destination : destination
            });
        }).toThrow();
    });

    it('createAnimationCartographic throws if mode is morphing', function() {
        expect(function () {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Cartesian3(1e9, 1e9, 1e9);
            CameraFlightPath.createAnimationCartographic(scene, {
                destination : destination
            });
        }).toThrow();
    });

    it('createAnimationExtent throws if mode is morphing', function() {
        expect(function() {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Extent(-1, -1, 1, 1);
            CameraFlightPath.createAnimationExtent(scene, {
                destination : destination
            });
        }).toThrow();
    });

    it('creates an animation in 3d', function() {
        var camera = frameState.camera;

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition);
        var endDirection = Cartesian3.negate(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in 3d with cartographic', function() {
        var camera = frameState.camera;

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition);
        var endCartographic = frameState.scene2D.projection.getEllipsoid().cartesianToCartographic(endPosition);
        var endDirection = Cartesian3.negate(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(scene, {
            destination : endCartographic,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON4);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in 3d with extent', function() {
        var camera = frameState.camera;

        var startPosition = frameState.scene2D.projection.getEllipsoid().cartographicToCartesian(new Cartographic(CesiumMath.PI, 0, 20));
        camera.position = startPosition;
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition);
        var endCartographic = frameState.scene2D.projection.getEllipsoid().cartesianToCartographic(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = Cartesian3.negate(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(scene, {
            destination : extent,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, 1);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in Columbus view', function() {
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in Columbus view with cartographic', function() {
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(scene, {
            destination : endCartographic,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON4);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in Columbus view with extent', function() {
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var camera = frameState.camera;
        camera.controller._mode = SceneMode.COLUMBUS_VIEW;

        var startPosition = frameState.scene2D.projection.getEllipsoid().cartographicToCartesian(new Cartographic(CesiumMath.PI, 0, 20));
        camera.position = startPosition;
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);

        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 20.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(scene, {
            destination : extent,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, 1);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in 2D', function() {
        frameState.mode = SceneMode.SCENE2D;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(startHeight);

        flight.onUpdate({ time : duration });
        expect(camera.position.x).toEqualEpsilon(endPosition.x, CesiumMath.EPSILON12);
        expect(camera.position.y).toEqualEpsilon(endPosition.y, CesiumMath.EPSILON12);
        expect(camera.position.z).toEqualEpsilon(startPosition.z, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(endPosition.z);
    });

    it('creates an animation in 2D with cartographic', function() {
        frameState.mode = SceneMode.SCENE2D;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(scene, {
            destination : endCartographic,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(startHeight);

        flight.onUpdate({ time : duration });
        expect(camera.position.x).toEqualEpsilon(endPosition.x, CesiumMath.EPSILON12);
        expect(camera.position.y).toEqualEpsilon(endPosition.y, CesiumMath.EPSILON12);
        expect(camera.position.z).toEqualEpsilon(startPosition.z, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(endPosition.z);
    });

    it('creates an animation in 2D with extent', function() {
        frameState.mode = SceneMode.SCENE2D;
        var camera = frameState.camera;
        camera.controller._mode = SceneMode.SCENE2D;

        camera.position = new Cartesian3(CesiumMath.PI, 0.0, 20.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 0.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(scene, {
            destination : extent,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(startHeight);

        flight.onUpdate({ time : duration });
        expect(camera.position.x).toEqualEpsilon(endPosition.x, CesiumMath.EPSILON12);
        expect(camera.position.y).toEqualEpsilon(endPosition.y, CesiumMath.EPSILON12);
        expect(camera.position.z).toEqualEpsilon(startPosition.z, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates a path where the start and end points only differ in height', function() {
        var camera = frameState.camera;
        var start = Cartesian3.clone(camera.position);
        var end = Ellipsoid.WGS84.cartesianToCartographic(start);
        end.height -= 1000000.0;

        var duration = 3000.0;
        var flight = CameraFlightPath.createAnimationCartographic(scene, {
            destination : end,
            duration : duration
        });

        flight.onUpdate({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(start, CesiumMath.EPSILON12);

        var expected = Ellipsoid.WGS84.cartographicToCartesian(end);
        flight.onUpdate({ time : duration });
        expect(camera.position).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('does not create a path to the same point', function() {
        var camera = frameState.camera;
        camera.position = new Cartesian3(7000000.0, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position));
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.normalize(Cartesian3.cross(camera.direction, camera.up));

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var duration = 3000.0;
        var flight = CameraFlightPath.createAnimation(scene, {
            destination : startPosition,
            direction : startDirection,
            up : startUp,
            duration : duration
        });

        expect(flight.duration).toEqual(0);
        expect(camera.position).toEqual(startPosition);
        expect(camera.direction).toEqual(startDirection);
        expect(camera.up).toEqual(startUp);
    });

    it('creates an animation with 0 duration', function() {
        var destination = new Cartesian3(1e9, 1e9, 1e9);
        var duration = 0;
        var onComplete = function() {
            return true;
        };

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : destination,
            duration : duration,
            onComplete : onComplete
        });

        expect(flight.duration).toEqual(duration);
        expect(flight.onComplete).not.toEqual(onComplete);
        expect(flight.onUpdate).toBeUndefined();
        expect(frameState.camera.position).not.toEqual(destination);
        flight.onComplete();
        expect(frameState.camera.position).toEqual(destination);
    });

    it('duration is 0 when destination is the same as camera position in 2D', function() {
        frameState.mode = SceneMode.SCENE2D;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();
        var frustum = camera.frustum;
        var destination = Cartesian3.clone(camera.position);
        destination.z = Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom);

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : destination
        });

        expect(flight.duration).toEqual(0);
    });

    it('duration is 0 when destination is the same as camera position in 3D', function() {
        frameState.mode = SceneMode.SCENE3D;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : camera.position
        });

        expect(flight.duration).toEqual(0);
    });

    it('duration is 0 when destination is the same as camera position in CV', function() {
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : camera.position
        });

        expect(flight.duration).toEqual(0);
    });

    it('creates an animation in 2D 0 duration', function() {
        frameState.mode = SceneMode.SCENE2D;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);
        camera.frustum = createOrthographicFrustum();

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : 0
        });

        expect(typeof flight.onComplete).toEqual('function');
        flight.onComplete();
        expect(camera.position.x).toEqualEpsilon(endPosition.x, CesiumMath.EPSILON12);
        expect(camera.position.y).toEqualEpsilon(endPosition.y, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(endPosition.z);
    });

    it('creates an animation in Columbus view 0 duration', function() {
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var camera = frameState.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up);

        var startPosition = Cartesian3.clone(camera.position);
        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            duration : 0
        });

        expect(typeof flight.onComplete).toEqual('function');
        flight.onComplete();
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
    });

    it('creates an animation in 3d 0 duration', function() {
        var camera = frameState.camera;

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition);
        var endDirection = Cartesian3.negate(startDirection);
        var endUp = Cartesian3.negate(startUp);

        var flight = CameraFlightPath.createAnimation(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : 0
        });

        expect(typeof flight.onComplete).toEqual('function');
        flight.onComplete();
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

},'WebGL');
