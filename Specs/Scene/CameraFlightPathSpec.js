/*global defineSuite*/
defineSuite([
        'Scene/CameraFlightPath',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Math',
        'Core/Rectangle',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        CameraFlightPath,
        Cartesian3,
        Cartographic,
        CesiumMath,
        Rectangle,
        OrthographicFrustum,
        SceneMode,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        destroyScene(scene);
    });

    function createOrthographicFrustum() {
        var current = scene.camera.frustum;
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
            CameraFlightPath.createTween(undefined, {
                destination : new Cartesian3(1e9, 1e9, 1e9)
            });
        }).toThrowDeveloperError();
    });

    it('create animation throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createTween(scene, {});
        }).toThrowDeveloperError();
    });

    it('create animation throws with just up and no direction', function() {
        expect(function() {
            CameraFlightPath.createTween(scene, {
                destination : Cartesian3.ZERO,
                up : Cartesian3.UNIT_Z
            });
        }).toThrowDeveloperError();
    });

    it('create animation throws with just direction and no up', function() {
        expect(function() {
            CameraFlightPath.createTween(scene, {
                destination : Cartesian3.ZERO,
                direction : Cartesian3.UNIT_X
            });
        }).toThrowDeveloperError();
    });

    it('create animation with rectangle throws without a scene', function() {
        expect(function() {
            CameraFlightPath.createTweenRectangle(undefined, {
                destination : new Cartographic(0.0, 0.0, 1e6)
            });
        }).toThrowDeveloperError();
    });

    it('create animation with rectangle throws without a destination', function() {
        expect(function() {
            CameraFlightPath.createTweenRectangle(scene, {});
        }).toThrowDeveloperError();
    });

    it('creates an animation', function() {
        var destination = new Cartesian3(1e9, 1e9, 1e9);
        var duration = 5.0;
        var complete = function() {
        };
        var cancel = function() {
        };

        var flight = CameraFlightPath.createTween(scene, {
            destination : destination,
            duration : duration,
            complete : complete,
            cancel: cancel
        });

        expect(flight.duration).toEqual(duration);
        expect(typeof flight.complete).toEqual('function');
        expect(typeof flight.cancel).toEqual('function');
        expect(typeof flight.update).toEqual('function');
        expect(flight.startObject).toBeDefined();
        expect(flight.stopObject).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('creates an animation with rectangle', function() {
        var destination = new Rectangle(-1, -1, 1, 1);
        var duration = 5.0;
        var complete = function() {
        };
        var cancel = function() {
        };

        var flight = CameraFlightPath.createTweenRectangle(scene, {
            destination : destination,
            duration : duration,
            complete : complete,
            cancel: cancel
        });

        expect(flight.duration).toEqual(duration);
        expect(typeof flight.complete).toEqual('function');
        expect(typeof flight.cancel).toEqual('function');
        expect(typeof flight.update).toEqual('function');
        expect(flight.startObject).toBeDefined();
        expect(flight.stopObject).toBeDefined();
        expect(flight.easingFunction).toBeDefined();
    });

    it('creates an animation in 3d', function() {
        var camera = scene.camera;

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition, new Cartesian3());
        var endDirection = Cartesian3.negate(startDirection, new Cartesian3());
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var duration = 5.0;
        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.update({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in 3d with rectangle', function() {
        var camera = scene.camera;

        var startPosition = Cartesian3.fromDegrees(CesiumMath.PI, 0, 20, scene.mapProjection.ellipsoid);
        camera.position = startPosition;
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition, new Cartesian3());
        var endCartographic = scene.mapProjection.ellipsoid.cartesianToCartographic(endPosition);
        var rectangle = new Rectangle(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = Cartesian3.negate(startDirection, new Cartesian3());
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var duration = 5.0;
        var flight = CameraFlightPath.createTweenRectangle(scene, {
            destination : rectangle,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.update({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, 1);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in Columbus view', function() {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var projection = scene.mapProjection;
        var destination = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0), new Cartesian3());
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(destination));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var duration = 5.0;
        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);

        flight.update({ time : duration });
        expect(camera.position).toEqualEpsilon(destination, CesiumMath.EPSILON4);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

    it('creates an animation in Columbus view with rectangle', function() {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        var camera = scene.camera;
        camera._mode = SceneMode.COLUMBUS_VIEW;

        var startPosition = scene.mapProjection.project(new Cartographic(0.0, 0.0, 20.0));
        camera.position = startPosition;
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endCartographic = Cartographic.fromDegrees(-75.0, 42.0, 20.0);
        var rectangle = new Rectangle(endCartographic.longitude - 0.01, endCartographic.latitude - 0.01, endCartographic.longitude + 0.01, endCartographic.latitude + 0.01);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var endPosition = camera.getRectangleCameraCoordinates(rectangle);

        var duration = 5.0;
        var flight = CameraFlightPath.createTweenRectangle(scene, {
            destination : rectangle,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON6);

        flight.update({ time : duration });
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON6);
    });

    it('creates an animation in 2D', function() {
        scene.mode = SceneMode.SCENE2D;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var projection = scene.mapProjection;
        var destination = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0), new Cartesian3());
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(destination));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var duration = 5.0;
        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(startHeight);

        flight.update({ time : duration });
        expect(camera.position.x).toEqualEpsilon(destination.x, CesiumMath.EPSILON8);
        expect(camera.position.y).toEqualEpsilon(destination.y, CesiumMath.EPSILON8);
        expect(camera.position.z).toEqualEpsilon(startPosition.z, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON8);
        expect(camera.frustum.right - camera.frustum.left).toEqualEpsilon(destination.z, CesiumMath.EPSILON8);
    });

    it('creates an animation in 2D with rectangle', function() {
        scene.mode = SceneMode.SCENE2D;
        var camera = scene.camera;
        camera._mode = SceneMode.SCENE2D;

        camera.position = new Cartesian3(CesiumMath.PI, 0.0, 20.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        camera.frustum = createOrthographicFrustum();

        var startHeight = camera.frustum.right - camera.frustum.left;
        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 0.0), new Cartesian3());
        var endCartographic = scene.mapProjection.unproject(endPosition);
        var rectangle = new Rectangle(endCartographic.longitude - 0.0000019, endCartographic.latitude - 0.0000019, endCartographic.longitude + 0.0000019, endCartographic.latitude + 0.0000019);
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var duration = 5.0;
        var flight = CameraFlightPath.createTweenRectangle(scene, {
            destination : rectangle,
            direction : endDirection,
            up : endUp,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(startPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(startDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(startUp, CesiumMath.EPSILON12);
        expect(camera.frustum.right - camera.frustum.left).toEqual(startHeight);

        flight.update({ time : duration });
        expect(camera.position.x).toEqualEpsilon(endPosition.x, CesiumMath.EPSILON8);
        expect(camera.position.y).toEqualEpsilon(endPosition.y, CesiumMath.EPSILON8);
        expect(camera.position.z).toEqualEpsilon(startPosition.z, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON8);
    });

    it('creates a path where the start and end points only differ in height', function() {
        var camera = scene.camera;
        var start = Cartesian3.clone(camera.position);
        var mag = Cartesian3.magnitude(start);
        var end = Cartesian3.multiplyByScalar(Cartesian3.normalize(start, new Cartesian3()), mag - 1000000.0, new Cartesian3());

        var duration = 3.0;
        var flight = CameraFlightPath.createTween(scene, {
            destination : end,
            duration : duration
        });

        flight.update({ time : 0.0 });
        expect(camera.position).toEqualEpsilon(start, CesiumMath.EPSILON12);

        flight.update({ time : duration });
        expect(camera.position).toEqualEpsilon(end, CesiumMath.EPSILON12);
    });

    it('does not create a path to the same point', function() {
        var camera = scene.camera;
        camera.position = new Cartesian3(7000000.0, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.normalize(Cartesian3.cross(camera.direction, camera.up, new Cartesian3()), new Cartesian3());

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var duration = 3.0;
        var flight = CameraFlightPath.createTween(scene, {
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
        var duration = 0.0;
        var complete = function() {
            return true;
        };

        var flight = CameraFlightPath.createTween(scene, {
            destination : destination,
            duration : duration,
            complete : complete
        });

        expect(flight.duration).toEqual(duration);
        expect(flight.complete).not.toEqual(complete);
        expect(flight.update).toBeUndefined();
        expect(scene.camera.position).not.toEqual(destination);
        flight.complete();
        expect(scene.camera.position).toEqual(destination);
    });

    it('duration is 0 when destination is the same as camera position in 2D', function() {
        scene.mode = SceneMode.SCENE2D;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        camera.frustum = createOrthographicFrustum();
        var frustum = camera.frustum;
        var destination = Cartesian3.clone(camera.position);
        destination.z = Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom);

        var projection = scene.mapProjection;
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(destination));

        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition
        });

        expect(flight.duration).toEqual(0.0);
    });

    it('duration is 0 when destination is the same as camera position in 3D', function() {
        scene.mode = SceneMode.SCENE3D;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        camera.frustum = createOrthographicFrustum();

        var flight = CameraFlightPath.createTween(scene, {
            destination : camera.position
        });

        expect(flight.duration).toEqual(0.0);
    });

    it('duration is 0 when destination is the same as camera position in CV', function() {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var projection = scene.mapProjection;
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(camera.position));

        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition
        });

        expect(flight.duration).toEqual(0.0);
    });

    it('creates an animation in 2D 0 duration', function() {
        scene.mode = SceneMode.SCENE2D;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        camera.frustum = createOrthographicFrustum();

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var projection = scene.mapProjection;
        var destination = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0), new Cartesian3());
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(destination));
        var endDirection = Cartesian3.clone(startDirection);
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : 0.0
        });

        expect(typeof flight.complete).toEqual('function');
        flight.complete();
        expect(camera.position.x).toEqualEpsilon(destination.x, CesiumMath.EPSILON8);
        expect(camera.position.y).toEqualEpsilon(destination.y, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON8);
        expect(camera.frustum.right - camera.frustum.left).toEqualEpsilon(destination.z, CesiumMath.EPSILON8);
    });

    it('creates an animation in Columbus view 0 duration', function() {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        var camera = scene.camera;

        camera.position = new Cartesian3(0.0, 0.0, 1000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var startPosition = Cartesian3.clone(camera.position);

        var projection = scene.mapProjection;
        var destination = Cartesian3.add(startPosition, new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0), new Cartesian3());
        var endPosition = projection.ellipsoid.cartographicToCartesian(projection.unproject(destination));

        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            duration : 0.0
        });

        expect(typeof flight.complete).toEqual('function');
        flight.complete();
        expect(camera.position).toEqualEpsilon(destination, CesiumMath.EPSILON8);
    });

    it('creates an animation in 3d 0 duration', function() {
        var camera = scene.camera;

        var startPosition = Cartesian3.clone(camera.position);
        var startDirection = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPosition = Cartesian3.negate(startPosition, new Cartesian3());
        var endDirection = Cartesian3.negate(startDirection, new Cartesian3());
        var endUp = Cartesian3.negate(startUp, new Cartesian3());

        var flight = CameraFlightPath.createTween(scene, {
            destination : endPosition,
            direction : endDirection,
            up : endUp,
            duration : 0.0
        });

        expect(typeof flight.complete).toEqual('function');
        flight.complete();
        expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
        expect(camera.direction).toEqualEpsilon(endDirection, CesiumMath.EPSILON12);
        expect(camera.up).toEqualEpsilon(endUp, CesiumMath.EPSILON12);
    });

},'WebGL');
