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
         'Specs/createFrameState'
     ], function (
         CameraFlightPath,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Extent,
         OrthographicFrustum,
         SceneMode,
         createFrameState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var frameState;

    beforeEach(function() {
        frameState = createFrameState();
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

    it('create animation throws without a frameState', function() {
        expect(function() {
            CameraFlightPath.createAnimation(undefined, {
                destination : new Cartesian3(1e9, 1e9, 1e9)
            });
        }).toThrow();
    });

    it('create animation throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimation(frameState, {});
        }).toThrow();
    });

    it('create animation with cartographic throws without a frameState', function() {
        expect(function() {
            CameraFlightPath.createAnimationCartographic(undefined, {
                destination : new Cartographic(0.0, 0.0, 1e6)
            });
        }).toThrow();
    });

    it('create animation with cartographic throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimationCartographic(frameState, {});
        }).toThrow();
    });

    it('create animation with extent throws without a frameState', function() {
        expect(function() {
            CameraFlightPath.createAnimationExtent(undefined, {
                destination : new Cartographic(0.0, 0.0, 1e6)
            });
        }).toThrow();
    });

    it('create animation with extent throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createAnimationExtent(frameState, {});
        }).toThrow();
    });

    it('creates an animation', function() {
        var destination = new Cartesian3(1e9, 1e9, 1e9);
        var duration = 5000.0;
        var onComplete = function() {
            return true;
        };

        var flight = CameraFlightPath.createAnimation(frameState, {
            destination : destination,
            duration : duration,
            onComplete : onComplete
        });

        expect(flight.duration).toEqual(duration);
        expect(flight.onComplete).toEqual(onComplete);
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

        var flight = CameraFlightPath.createAnimationCartographic(frameState, {
            destination : destination,
            duration : duration,
            onComplete : onComplete
        });

        expect(flight.duration).toEqual(duration);
        expect(flight.onComplete).toEqual(onComplete);
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

        var flight = CameraFlightPath.createAnimationExtent(frameState, {
            destination : destination,
            duration : duration,
            onComplete : onComplete
        });

        expect(flight.duration).toEqual(duration);
        expect(flight.onComplete).toEqual(onComplete);
        expect(typeof flight.onUpdate).toEqual('function');
        expect(flight.startValue).toBeDefined();
        expect(flight.stopValue).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('createAnimation throws if mode is morphing', function() {
        expect( function() {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Cartesian3(1e9, 1e9, 1e9);
            CameraFlightPath.createAnimation(frameState, {
                destination : destination
            });
        }).toThrow();
    });

    it('createAnimationCartographic throws if mode is morphing', function() {
        expect(function () {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Cartesian3(1e9, 1e9, 1e9);
            CameraFlightPath.createAnimationCartographic(frameState, {
                destination : destination
            });
        }).toThrow();
    });

    it('createAnimationExtent throws if mode is morphing', function() {
        expect(function() {
            frameState.mode = SceneMode.MORPHING;
            var destination = new Extent(-1, -1, 1, 1);
            CameraFlightPath.createAnimationExtent(frameState, {
                destination : destination
            });
        }).toThrow();
    });

    it('creates an animation in 3d', function() {
        var camera = frameState.camera;

        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.negate();
        var endDirection = startDirection.negate();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(frameState, {
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

        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.negate();
        var endCartographic = frameState.scene2D.projection.getEllipsoid().cartesianToCartographic(endPosition);
        var endDirection = startDirection.negate();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(frameState, {
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
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.negate();
        var endCartographic = frameState.scene2D.projection.getEllipsoid().cartesianToCartographic(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = startDirection.negate();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);

        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);

        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);

        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 20.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimation(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationCartographic(frameState, {
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = camera.direction.cross(camera.up);
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPosition = startPosition.add(new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 0.0));
        var endCartographic = frameState.scene2D.projection.unproject(endPosition);
        var extent = new Extent(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = startDirection.clone();
        var endUp = startUp.negate();

        var duration = 5000.0;
        var flight = CameraFlightPath.createAnimationExtent(frameState, {
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
        var start = camera.position.clone();
        var end = Ellipsoid.WGS84.cartesianToCartographic(start);
        end.height -= 1000000.0;

        var duration = 3000.0;
        var flight = CameraFlightPath.createAnimationCartographic(frameState, {
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
        camera.direction = camera.position.normalize().negate();
        camera.up = Cartesian3.UNIT_Z.clone();
        camera.right = camera.direction.cross(camera.up).normalize();

        var startPosition = camera.position.clone();
        var startDirection = camera.direction.clone();
        var startUp = camera.up.clone();

        var duration = 3000.0;
        var flight = CameraFlightPath.createAnimation(frameState, {
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
});