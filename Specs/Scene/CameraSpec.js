/*global defineSuite*/
defineSuite([
        'Scene/Camera',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Cartographic',
        'Core/defaultValue',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/HeadingPitchRange',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/Transforms',
        'Core/WebMercatorProjection',
        'Scene/CameraFlightPath',
        'Scene/MapMode2D',
        'Scene/OrthographicFrustum',
        'Scene/OrthographicOffCenterFrustum',
        'Scene/PerspectiveFrustum',
        'Scene/SceneMode',
        'Scene/TweenCollection'
    ], function(
        Camera,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defaultValue,
        Ellipsoid,
        GeographicProjection,
        HeadingPitchRange,
        CesiumMath,
        Matrix3,
        Matrix4,
        Rectangle,
        Transforms,
        WebMercatorProjection,
        CameraFlightPath,
        MapMode2D,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        PerspectiveFrustum,
        SceneMode,
        TweenCollection) {
    'use strict';

    var scene;
    var camera;

    var position;
    var up;
    var dir;
    var right;

    var moveAmount = 3.0;
    var turnAmount = CesiumMath.PI_OVER_TWO;
    var rotateAmount = CesiumMath.PI_OVER_TWO;
    var zoomAmount = 1.0;

    function FakeScene(projection) {
        this.canvas = {
            clientWidth: 512,
            clientHeight: 384
        };
        this.drawingBufferWidth = 1024;
        this.drawingBufferHeight = 768;
        this.mapProjection = defaultValue(projection, new GeographicProjection());
        this.tweens = new TweenCollection();
        this.screenSpaceCameraController = {
            minimumZoomDistance: 0,
            maximumZoomDistance: 5906376272000.0  // distance from the Sun to Pluto in meters.
        };
        this.camera = undefined;
        this.context = {
            drawingBufferWidth : 1024,
            drawingBufferHeight : 768
        };
        this.mapMode2D = MapMode2D.INFINITE_2D;
    }

    beforeEach(function() {
        position = Cartesian3.clone(Cartesian3.UNIT_Z);
        up = Cartesian3.clone(Cartesian3.UNIT_Y);
        dir = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        right = Cartesian3.cross(dir, up, new Cartesian3());

        scene = new FakeScene();

        camera = new Camera(scene);
        camera.position = Cartesian3.clone(position);
        camera.up = Cartesian3.clone(up);
        camera.direction = Cartesian3.clone(dir);
        camera.right = Cartesian3.clone(right);

        camera.minimumZoomDistance = 0.0;

        scene.camera = camera;
        scene.mapMode2D = MapMode2D.INFINITE_2D;
    });

    it('constructor throws an exception when there is no canvas', function() {
        expect(function() {
            return new Camera();
        }).toThrowDeveloperError();
    });

    it('get view matrix', function() {
        var viewMatrix = camera.viewMatrix;
        var position = camera.position;
        var up = camera.up;
        var dir = camera.direction;
        var right = camera.right;
        var rotation = new Matrix4(right.x, right.y, right.z, 0.0,
                                      up.x,    up.y,    up.z, 0.0,
                                    -dir.x,  -dir.y,  -dir.z, 0.0,
                                       0.0,     0.0,     0.0, 1.0);
        var translation = new Matrix4(1.0, 0.0, 0.0, -position.x,
                                      0.0, 1.0, 0.0, -position.y,
                                      0.0, 0.0, 1.0, -position.z,
                                      0.0, 0.0, 0.0,         1.0);
        var expected = Matrix4.multiply(rotation, translation, new Matrix4());
        expect(viewMatrix).toEqual(expected);
    });

    it('get inverse view matrix', function() {
        var expected = Matrix4.inverse(camera.viewMatrix, new Matrix4());
        expect(expected).toEqualEpsilon(camera.inverseViewMatrix, CesiumMath.EPSILON15);
    });

    it('get inverse transform', function() {
        camera._setTransform(new Matrix4(5.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 2.0, 0.0, 0.0, 5.0, 3.0, 0.0, 0.0, 0.0, 1.0));
        var expected = Matrix4.inverseTransformation(camera.transform, new Matrix4());
        expect(expected).toEqual(camera.inverseTransform);
    });

    it('Computes orthonormal direction, up, and right vectors', function() {
        camera.direction = new Cartesian3(-0.32297853365047874, 0.9461560708446421, 0.021761351171635013);
        camera.up = new Cartesian3(0.9327219113001013, 0.31839266745173644, -2.9874778345595487e-10);
        camera.right = new Cartesian3(0.0069286549295528715, -0.020297288960790985, 0.9853344956450351);

        expect(Cartesian3.magnitude(camera.right)).not.toEqualEpsilon(1.0, CesiumMath.EPSILON8);
        expect(Cartesian3.magnitude(camera.up)).not.toEqualEpsilon(1.0, CesiumMath.EPSILON8);

        // Trigger updateMembers which normalizes the axes
        var viewMatrix = camera.viewMatrix;
        expect(Cartesian3.magnitude(camera.right)).toEqualEpsilon(1.0, CesiumMath.EPSILON8);
        expect(Cartesian3.magnitude(camera.up)).toEqualEpsilon(1.0, CesiumMath.EPSILON8);

        var inverseAffine = Matrix4.inverseTransformation(viewMatrix, new Matrix4());
        var inverse = Matrix4.inverse(viewMatrix, new Matrix4());
        expect(inverseAffine).toEqualEpsilon(inverse, CesiumMath.EPSILON8);
    });

    it('get heading is undefined when morphing', function() {
        camera._mode = SceneMode.MORPHING;
        expect(camera.heading).not.toBeDefined();
    });

    it('get heading in 2D', function() {
        camera._mode = SceneMode.SCENE2D;

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        var heading = CesiumMath.TWO_PI - Math.atan2(camera.right.y, camera.right.x);
        expect(camera.heading).toEqual(heading);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('get heading in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        var heading = CesiumMath.TWO_PI - Math.atan2(camera.right.y, camera.right.x);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON8);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('get heading in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        var ellipsoid = Ellipsoid.WGS84;
        var toFixedFrame = Transforms.eastNorthUpToFixedFrame(camera.position, ellipsoid);
        var transform = Matrix4.getRotation(toFixedFrame, new Matrix3());
        Matrix3.transpose(transform, transform);

        var right = Matrix3.multiplyByVector(transform, camera.right, new Cartesian3());
        var heading = CesiumMath.TWO_PI - CesiumMath.zeroToTwoPi(Math.atan2(right.y, right.x));

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        right = Cartesian3.clone(camera.right);

        expect(camera.heading).toEqual(heading);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('sets heading in 2D when the map can be rotated', function() {
        scene.mapMode2D = MapMode2D.ROTATE;
        camera._mode = SceneMode.SCENE2D;

        var heading = camera.heading;
        var positionCartographic = camera.positionCartographic;

        var newHeading = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                heading : newHeading
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.heading).not.toEqual(heading);
        expect(camera.heading).toEqualEpsilon(newHeading, CesiumMath.EPSILON14);
    });

    it('does not set heading in 2D for infinite scrolling mode', function() {
        camera._mode = SceneMode.SCENE2D;

        var heading = camera.heading;
        var positionCartographic = camera.positionCartographic;

        var newHeading = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                heading : newHeading
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.heading).toEqual(heading);
    });

    it('set heading in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        camera.position = Cartesian3.fromDegrees(-72.0, 40.0, 100000.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var heading = camera.heading;
        var positionCartographic = camera.positionCartographic;

        var newHeading = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                heading : newHeading
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.heading).not.toEqual(heading);
        expect(camera.heading).toEqualEpsilon(newHeading, CesiumMath.EPSILON4);
    });

    it('set heading in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        camera.position = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var heading = camera.heading;
        var newHeading = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                heading : newHeading
            }
        });

        expect(camera.heading).not.toEqual(heading);
        expect(camera.heading).toEqualEpsilon(newHeading, CesiumMath.EPSILON14);
    });

    it('set heading in 3D (2)', function() {
        camera._mode = SceneMode.SCENE3D;

        camera.position = Cartesian3.fromDegrees(136.0, -24.0, 4500000.0);
        Cartesian3.negate(camera.position, camera.direction);
        Cartesian3.normalize(camera.direction, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Z, camera.up);
        Cartesian3.cross(camera.direction, camera.up, camera.right);
        Cartesian3.cross(camera.right, camera.direction, camera.up);

        var positionCartographic = camera.positionCartographic;

        camera.setView({
            orientation: {
                heading : CesiumMath.PI
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.heading).toEqualEpsilon(CesiumMath.PI, CesiumMath.EPSILON8);
        expect(camera.up.z).toBeLessThan(0.0);

        camera.setView({
            orientation: {
                heading : CesiumMath.TWO_PI
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.heading).toEqualEpsilon(CesiumMath.TWO_PI, CesiumMath.EPSILON8);
        expect(camera.up.z).toBeGreaterThan(0.0);
    });

    it('pitch is undefined when mode is not 3D or Columbus view', function() {
        camera._mode = SceneMode.MORPHING;
        expect(camera.pitch).not.toBeDefined();
    });

    it('get pitch in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        camera.position = Cartesian3.fromDegrees(0.0, 0.0, 100000.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        var pitch = CesiumMath.PI_OVER_TWO - Math.acos(-camera.direction.z);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('get pitch in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        var direction = Cartesian3.normalize(camera.position, new Cartesian3());
        Cartesian3.negate(direction, direction);
        var pitch = CesiumMath.PI_OVER_TWO - Math.acos(-Cartesian3.dot(camera.direction, direction));

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        expect(camera.pitch).toEqual(pitch);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('set pitch in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        camera.position = Cartesian3.fromDegrees(-72.0, 40.0, 100000.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var pitch = camera.pitch;
        var positionCartographic = camera.positionCartographic;

        var newPitch = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                pitch : newPitch
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.pitch).not.toEqual(pitch);
        expect(camera.pitch).toEqualEpsilon(newPitch, CesiumMath.EPSILON4);
    });

    it('set pitch in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        camera.position = Cartesian3.fromDegrees(-72.0, 40.0, 100000.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var pitch = camera.pitch;
        var positionCartographic = camera.positionCartographic;

        var newPitch = CesiumMath.toRadians(45.0);
        camera.setView({
            orientation: {
                pitch : newPitch
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.pitch).not.toEqual(pitch);
        expect(camera.pitch).toEqualEpsilon(newPitch, CesiumMath.EPSILON14);
    });

    it('get roll in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        camera.position = Cartesian3.fromDegrees(0.0, 0.0, 100000.0);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        camera.look(camera.direction, CesiumMath.toRadians(45.0));

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);

        var roll = CesiumMath.zeroToTwoPi(-CesiumMath.toRadians(45.0));
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('get roll in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        var ellipsoid = Ellipsoid.WGS84;
        camera.position = Cartesian3.clone(Cartesian3.UNIT_X);
        Cartesian3.multiplyByScalar(camera.position, ellipsoid.maximumRadius + 100.0, camera.position);
        camera.direction = new Cartesian3(-1.0, 0.0, 1.0);
        Cartesian3.normalize(camera.direction, camera.direction);
        camera.right = Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, new Cartesian3());
        Cartesian3.normalize(camera.right, camera.right);
        camera.up = Cartesian3.cross(camera.right, camera.direction, new Cartesian3());

        var toFixedFrame = Transforms.eastNorthUpToFixedFrame(camera.position, ellipsoid);
        var transform = Matrix4.getRotation(toFixedFrame, new Matrix3());
        Matrix3.transpose(transform, transform);

        var right = Matrix3.multiplyByVector(transform, camera.right, new Cartesian3());
        var roll = CesiumMath.TWO_PI - Math.atan2(right.z, right.x);

        var positionWC = Cartesian3.clone(camera.positionWC);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        right = Cartesian3.clone(camera.right);

        expect(camera.roll).toEqual(roll);

        expect(camera.positionWC).toEqualEpsilon(positionWC, CesiumMath.EPSILON8);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON8);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON8);
    });

    it('get roll returns correct value past 90 degrees', function() {
        var roll = CesiumMath.toRadians(110.0);
        camera.setView({
            destination : Cartesian3.fromDegrees(-72.0, 40.0, 20.0),
            orientation: {
                heading : 0.0,
                pitch : 0.0,
                roll : roll
            }
        });

        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON14);
    });

    it('set roll in CV', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;

        camera.position = Cartesian3.fromDegrees(-72.0, 40.0, 100000.0);
        camera.direction = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var roll = camera.roll;
        var positionCartographic = camera.positionCartographic;

        var newRoll = CesiumMath.PI_OVER_FOUR;
        camera.setView({
            orientation: {
                pitch: camera.pitch,
                roll : newRoll,
                heading: camera.heading
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.roll).not.toEqual(roll);
        expect(camera.roll).toEqualEpsilon(newRoll, CesiumMath.EPSILON6);
    });

    it('set roll in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        camera.position = Cartesian3.fromDegrees(-72.0, 40.0, 100000.0);
        camera.direction = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var roll = camera.roll;
        var positionCartographic = Cartographic.clone(camera.positionCartographic);

        var newRoll = CesiumMath.PI_OVER_FOUR;
        camera.setView({
            orientation: {
                pitch: camera.pitch,
                roll : newRoll,
                heading: camera.heading
            }
        });

        expect(camera.positionCartographic).toEqual(positionCartographic);
        expect(camera.roll).not.toEqual(roll);
        expect(camera.roll).toEqualEpsilon(newRoll, CesiumMath.EPSILON6);
    });

    it('update throws without mode', function() {
        expect(function() {
            camera.update();
        }).toThrowDeveloperError();
    });

    it('update throws with frustum not supported in given mode', function() {
        camera.frustum = new PerspectiveFrustum();
        expect(function() {
            camera.update(SceneMode.SCENE2D);
        }).toThrowDeveloperError();

        camera.frustum = new OrthographicOffCenterFrustum();
        expect(function() {
            camera.update(SceneMode.SCENE3D);
        }).toThrowDeveloperError();
        expect(function() {
            camera.update(SceneMode.COLUMBUS_VIEW);
        }).toThrowDeveloperError();
    });

    it('setView with cartesian in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.maximumRadius;

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;

        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        var ratio = frustum.top / frustum.right;
        var cartesian = Cartesian3.fromDegrees(-75.0, 42.0, 100.0);
        camera.setView({
            destination : cartesian
        });

        var cart = ellipsoid.cartesianToCartographic(cartesian);
        expect(camera.positionCartographic).toEqualEpsilon(cart, CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON6);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON6);
        expect(frustum.right - frustum.left).toEqualEpsilon(cart.height, CesiumMath.EPSILON6);
        expect(frustum.top / frustum.right).toEqual(ratio);
    });

    it('setView with cartesian in Columbus View', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        camera._mode = SceneMode.COLUMBUS_VIEW;
        camera._projection = projection;

        var cartesian = Cartesian3.fromDegrees(-75.0, 42.0, 100.0);
        camera.setView({
            destination : cartesian
        });

        var cart = ellipsoid.cartesianToCartographic(cartesian);
        expect(camera.positionCartographic).toEqualEpsilon(cart, CesiumMath.EPSILON11);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON6);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON6);
    });

    it('setView with cartesian in 3D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        camera._mode = SceneMode.SCENE3D;
        camera._projection = projection;

        var cartesian = Cartesian3.fromDegrees(-75.0, 0.0, 100.0);
        camera.setView({
            destination : cartesian
        });

        expect(camera.positionCartographic).toEqualEpsilon(ellipsoid.cartesianToCartographic(cartesian), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON6);
        expect(camera.right).toEqualEpsilon(Cartesian3.cross(camera.direction, camera.up, new Cartesian3()), CesiumMath.EPSILON6);
    });

    it('setView with cartesian in Columbus View and orthographic frustum', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        camera._mode = SceneMode.COLUMBUS_VIEW;
        camera._projection = projection;

        camera.frustum = new OrthographicFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.width = camera.positionCartographic.height;

        var cartesian = Cartesian3.fromDegrees(-75.0, 42.0, 100.0);
        camera.setView({
            destination : cartesian
        });

        var cart = ellipsoid.cartesianToCartographic(cartesian);
        expect(camera.positionCartographic).toEqualEpsilon(cart, CesiumMath.EPSILON11);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON6);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON6);
        expect(camera.frustum.width).toEqual(cart.height);
    });

    it('setView with cartesian in 3D and orthographic frustum', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        camera._mode = SceneMode.SCENE3D;
        camera._projection = projection;

        camera.frustum = new OrthographicFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.width = camera.positionCartographic.height;

        var cartesian = Cartesian3.fromDegrees(-75.0, 0.0, 100.0);
        camera.setView({
            destination : cartesian
        });

        var cart = ellipsoid.cartesianToCartographic(cartesian);
        expect(camera.positionCartographic).toEqualEpsilon(cart, CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON6);
        expect(camera.right).toEqualEpsilon(Cartesian3.cross(camera.direction, camera.up, new Cartesian3()), CesiumMath.EPSILON6);
        expect(camera.frustum.width).toEqual(cart.height);
    });

    it('setView right rotation order', function() {
        var position = Cartesian3.fromDegrees(-117.16, 32.71, 0.0);
        var heading =  CesiumMath.toRadians(180.0);
        var pitch = CesiumMath.toRadians(0.0);
        var roll = CesiumMath.toRadians(45.0);

        camera.setView({
            destination : position,
            orientation: {
                heading : heading,
                pitch : pitch,
                roll : roll
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);
    });

    it('setView (1)', function() {
        var position = Cartesian3.fromDegrees(-117.16, 32.71, 0.0);
        var heading =  CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(-50.0);
        var roll = CesiumMath.toRadians(45.0);

        camera.setView({
            destination : position,
            orientation: {
                heading : heading,
                pitch : pitch,
                roll : roll
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);

        heading =  CesiumMath.toRadians(200.0);

        camera.setView({
            orientation: {
                pitch: camera.pitch,
                roll : camera.roll,
                heading : heading
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);
    });

    it('setView (2)', function() {
        var position = Cartesian3.fromDegrees(-117.16, 32.71, 0.0);
        var heading =  CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(50.0);
        var roll = CesiumMath.toRadians(45.0);

        camera.setView({
            destination : position,
            orientation: {
                heading : heading,
                pitch : pitch,
                roll : roll
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);

        pitch =  CesiumMath.toRadians(-50.0);

        camera.setView({
            orientation: {
                pitch : pitch,
                roll : camera.roll,
                heading: camera.heading
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);
    });

    it('setView (3)', function() {
        var position = Cartesian3.fromDegrees(-117.16, 32.71, 0.0);
        var heading =  CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(50.0);
        var roll = CesiumMath.toRadians(45.0);

        camera.setView({
            destination : position,
            orientation: {
                heading : heading,
                pitch : pitch,
                roll : roll
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);

        roll =  CesiumMath.toRadians(200.0);

        camera.setView({
            orientation: {
                roll : roll,
                heading: camera.heading,
                pitch: camera.pitch
            }
        });

        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON6);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);
    });

    it('setView with direction, up', function() {
        scene.mode = SceneMode.SCENE3D;

        var direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        var up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var options = {
            destination : Cartesian3.fromDegrees(-117.16, 32.71, 0.0),
            orientation : {
                direction : direction,
                up : up
            },
            duration : 0.001
        };
        camera.setView(options);

        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON6);
    });

    it('worldToCameraCoordinates throws without cartesian', function() {
        expect(function() {
            camera.worldToCameraCoordinates();
        }).toThrowDeveloperError();
    });

    it('worldToCameraCoordinates transforms to the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 0.0,
                                         1.0, 0.0, 0.0, 0.0,
                                         0.0, 1.0, 0.0, 0.0,
                                         0.0, 0.0, 0.0, 1.0));
        expect(camera.worldToCameraCoordinates(Cartesian4.UNIT_X)).toEqual(Cartesian4.UNIT_Z);
    });

    it('worldToCameraCoordinatesPoint throws without cartesian', function() {
        expect(function() {
            camera.worldToCameraCoordinatesPoint();
        }).toThrowDeveloperError();
    });

    it('worldToCameraCoordinatesPoint transforms to the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 10.0,
                                         1.0, 0.0, 0.0, 20.0,
                                         0.0, 1.0, 0.0, 30.0,
                                         0.0, 0.0, 0.0, 1.0));
        var expected = Cartesian3.add(Matrix4.getColumn(camera.inverseTransform, 3, new Cartesian4()), Cartesian3.UNIT_Z, new Cartesian3());
        expect(camera.worldToCameraCoordinatesPoint(Cartesian3.UNIT_X)).toEqual(expected);
    });

    it('worldToCameraCoordinatesVector throws without cartesian', function() {
        expect(function() {
            camera.worldToCameraCoordinatesVector();
        }).toThrowDeveloperError();
    });

    it('worldToCameraCoordinatesVector transforms to the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 10.0,
                                         1.0, 0.0, 0.0, 20.0,
                                         0.0, 1.0, 0.0, 30.0,
                                         0.0, 0.0, 0.0, 1.0));
        expect(camera.worldToCameraCoordinatesVector(Cartesian3.UNIT_X)).toEqual(Cartesian3.UNIT_Z);
    });

    it('cameraToWorldCoordinates throws without cartesian', function() {
        expect(function() {
            camera.cameraToWorldCoordinates();
        }).toThrowDeveloperError();
    });

    it('cameraToWorldCoordinates transforms from the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 0.0,
                                         1.0, 0.0, 0.0, 0.0,
                                         0.0, 1.0, 0.0, 0.0,
                                         0.0, 0.0, 0.0, 1.0));
        expect(camera.cameraToWorldCoordinates(Cartesian4.UNIT_Z)).toEqual(Cartesian4.UNIT_X);
    });

    it('cameraToWorldCoordinatesPoint throws without cartesian', function() {
        expect(function() {
            camera.cameraToWorldCoordinatesPoint();
        }).toThrowDeveloperError();
    });

    it('cameraToWorldCoordinatesPoint transforms from the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 10.0,
                                         1.0, 0.0, 0.0, 20.0,
                                         0.0, 1.0, 0.0, 30.0,
                                         0.0, 0.0, 0.0, 1.0));
        var expected = Cartesian3.add(Cartesian3.UNIT_X, Matrix4.getColumn(camera.transform, 3, new Cartesian4()), new Cartesian3());
        expect(camera.cameraToWorldCoordinatesPoint(Cartesian3.UNIT_Z)).toEqual(expected);
    });

    it('cameraToWorldCoordinatesVector throws without cartesian', function() {
        expect(function() {
            camera.cameraToWorldCoordinatesVector();
        }).toThrowDeveloperError();
    });

    it('cameraToWorldCoordinatesVector transforms from the cameras reference frame', function() {
        camera._setTransform(new Matrix4(0.0, 0.0, 1.0, 10.0,
                                         1.0, 0.0, 0.0, 20.0,
                                         0.0, 1.0, 0.0, 30.0,
                                         0.0, 0.0, 0.0, 1.0));
        expect(camera.cameraToWorldCoordinatesVector(Cartesian3.UNIT_Z)).toEqual(Cartesian3.UNIT_X);
    });

    it('move throws without an axis', function() {
        expect(function() {
            expect(camera.move());
        }).toThrowDeveloperError();
    });

    it('moves', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1.0, 1.0, 0.0), new Cartesian3());
        camera.move(direction, moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(direction.x * moveAmount, direction.y * moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves up', function() {
        camera.moveUp(moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves down', function() {
        camera.moveDown(moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, -moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves right', function() {
        camera.moveRight(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(moveAmount, 0.0, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves left', function() {
        camera.moveLeft(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(-moveAmount, 0.0, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves forward', function() {
        camera.moveForward(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(0.0, 0.0, 1.0 - moveAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves backward', function() {
        camera.moveBackward(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(0.0, 0.0, 1.0 + moveAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('move clamps position in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var max = scene.mapProjection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;

        camera.moveUp(dy);
        camera.moveRight(dx);
        expect(camera.position.x).toBeLessThan(dx);
        expect(camera.position.y).toBeLessThan(dy);

        camera.moveDown(dy);
        camera.moveLeft(dx);
        expect(camera.position.x).toBeGreaterThan(-dx);
        expect(camera.position.y).toBeGreaterThan(-dy);
    });

    it('look throws without an axis', function() {
        expect(function() {
            expect(camera.look());
        }).toThrowDeveloperError();
    });

    it('looks', function() {
        camera.look(Cartesian3.UNIT_X, CesiumMath.PI);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON10);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
    });

    it('looks left', function() {
        camera.lookLeft(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(right, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
    });

    it('looks right', function() {
        camera.lookRight(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('looks up', function() {
        camera.lookUp(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('looks down', function() {
        camera.lookDown(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(up, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
    });

    it('twists left', function() {
        camera.twistLeft(CesiumMath.PI_OVER_TWO);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(right, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(up, CesiumMath.EPSILON15);
    });

    it('twists right', function() {
        camera.twistRight(CesiumMath.PI_OVER_TWO);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(right, CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(up, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotate throws without an axis', function() {
        expect(function() {
            expect(camera.rotate());
        }).toThrowDeveloperError();
    });

    it('rotates up', function() {
        camera.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotates up with constrained axis 0', function() {
        camera.constrainedAxis = Cartesian3.UNIT_Y;
        camera.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotates up with constrained axis 1', function() {
        camera.up = Cartesian3.negate(dir, new Cartesian3());
        camera.direction = right;
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        camera.constrainedAxis = Cartesian3.UNIT_Y;
        camera.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON14);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotates down', function() {
        camera.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(up, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates down with constrained axis 0 ', function() {
        camera.constrainedAxis = Cartesian3.UNIT_Y;
        camera.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(up, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates down with constrained axis 1', function() {
        camera.up = Cartesian3.negate(dir, new Cartesian3());
        camera.direction = right;
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        camera.constrainedAxis = Cartesian3.UNIT_Y;
        camera.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates left', function() {
        camera.rotateLeft(rotateAmount);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotates left with contrained axis', function() {
        camera.constrainedAxis = Cartesian3.UNIT_Z;
        camera.rotateLeft(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);
    });

    it('rotates right', function() {
        camera.rotateRight(rotateAmount);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(right, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
    });

    it('rotates right with contrained axis', function() {
        camera.constrainedAxis = Cartesian3.UNIT_Z;
        camera.rotateRight(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);
    });

    it('rotates', function() {
        var axis = Cartesian3.normalize(new Cartesian3(Math.cos(CesiumMath.PI_OVER_FOUR), Math.sin(CesiumMath.PI_OVER_FOUR), 0.0), new Cartesian3());
        var angle = CesiumMath.PI_OVER_TWO;
        camera.rotate(axis, angle);

        expect(camera.position).toEqualEpsilon(new Cartesian3(-axis.x, axis.y, 0.0), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.normalize(new Cartesian3(0.5, 0.5, axis.x), new Cartesian3()), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(Cartesian3.cross(camera.right, camera.direction, new Cartesian3()), CesiumMath.EPSILON15);
    });

    it('rotate past constrained axis stops at constained axis', function() {
        camera.constrainedAxis = Cartesian3.UNIT_Y;
        camera.rotateUp(Math.PI);
        expect(camera.up).toEqualEpsilon(Cartesian3.negate(dir, new Cartesian3()), CesiumMath.EPSILON4);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON4);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON4);
        expect(camera.position).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON4);
    });

    it('zooms out 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        camera.zoomOut(zoomAmount);
        expect(camera.frustum.right).toEqualEpsilon(2.5, CesiumMath.EPSILON10);
        expect(camera.frustum.left).toEqual(-2.5, CesiumMath.EPSILON10);
        expect(camera.frustum.top).toEqual(1.25, CesiumMath.EPSILON10);
        expect(camera.frustum.bottom).toEqual(-1.25, CesiumMath.EPSILON10);
    });

    it('zooms in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        camera.zoomIn(zoomAmount);
        expect(camera.frustum.right).toEqualEpsilon(1.5, CesiumMath.EPSILON10);
        expect(camera.frustum.left).toEqual(-1.5, CesiumMath.EPSILON10);
        expect(camera.frustum.top).toEqual(0.75, CesiumMath.EPSILON10);
        expect(camera.frustum.bottom).toEqual(-0.75, CesiumMath.EPSILON10);
    });

    it('clamps zoom out in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var max = scene.mapProjection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;
        var ratio = frustum.top / frustum.right;

        camera.zoomOut(dx);
        expect(frustum.right).toBeLessThan(dx);
        expect(frustum.left).toBeGreaterThan(-dx);
        expect(frustum.top).toEqual(frustum.right * ratio);
        expect(frustum.bottom).toEqual(-frustum.top);
    });

    it('clamps zoom in in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var max = scene.mapProjection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;

        camera.zoomIn(dx * 2.0);
        expect(frustum.right).toEqual(1.0);
        expect(frustum.left).toEqual(-1.0);
    });

    it('zooms in 3D', function() {
        camera.zoomIn(zoomAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 1.0 - zoomAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('zooms out in 3D', function() {
        camera.zoomOut(zoomAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 1.0 + zoomAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('zooms in throws with undefined OrthogrphicFrustum properties 2D', function() {
        camera._mode = SceneMode.SCENE2D;
        camera.frustum = new OrthographicOffCenterFrustum();
        expect(function () {
            camera.zoomIn(zoomAmount);
        }).toThrowDeveloperError();
    });

    it('lookAt', function() {
        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var offset = new Cartesian3(0.0, -1.0, 0.0);

        var tempCamera = Camera.clone(camera);
        tempCamera.lookAt(target, offset);

        expect(tempCamera.position).toEqualEpsilon(offset, CesiumMath.EPSILON11);
        expect(tempCamera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(offset, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.right).toEqualEpsilon(Cartesian3.cross(tempCamera.direction, Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.up).toEqualEpsilon(Cartesian3.cross(tempCamera.right, tempCamera.direction, new Cartesian3()), CesiumMath.EPSILON11);

        expect(1.0 - Cartesian3.magnitude(tempCamera.direction)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.up)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.right)).toBeLessThan(CesiumMath.EPSILON14);
    });

    it('lookAt with heading, pitch and range', function() {
        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var heading = CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(-45.0);
        var range = 2.0;

        var tempCamera = Camera.clone(camera);
        tempCamera.lookAt(target, new HeadingPitchRange(heading, pitch, range));

        tempCamera.lookAtTransform(Matrix4.IDENTITY);

        expect(Cartesian3.distance(tempCamera.position, target)).toEqualEpsilon(range, CesiumMath.EPSILON6);
        expect(tempCamera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(tempCamera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);

        expect(1.0 - Cartesian3.magnitude(tempCamera.direction)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.up)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.right)).toBeLessThan(CesiumMath.EPSILON14);
    });

    it('lookAt throws with no target parameter', function() {
        expect(function() {
            camera.lookAt(undefined, Cartesian3.ZERO);
        }).toThrowDeveloperError();
    });

    it('lookAt throws with no offset parameter', function() {
        expect(function() {
            camera.lookAt(Cartesian3.ZERO, undefined);
        }).toThrowDeveloperError();
    });

    it('lookAt in 2D mode', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        var tempCamera = Camera.clone(camera);
        tempCamera.frustum = frustum;
        tempCamera.update(SceneMode.SCENE2D);

        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var offset = new Cartesian3(10000.0, 10000.0, 30000.0);
        tempCamera.lookAt(target, offset);

        expect(Cartesian2.clone(tempCamera.position)).toEqual(Cartesian2.ZERO);
        expect(tempCamera.direction).toEqual(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()));
        expect(tempCamera.up).toEqualEpsilon(Cartesian3.normalize(Cartesian3.fromElements(-offset.x, -offset.y, 0.0), new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.right).toEqualEpsilon(Cartesian3.cross(tempCamera.direction, tempCamera.up, new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.frustum.right).toEqual(Cartesian3.magnitude(offset) * 0.5);
        expect(tempCamera.frustum.left).toEqual(-Cartesian3.magnitude(offset) * 0.5);
    });

    it('lookAt in 2D mode with heading, pitch and range', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        var tempCamera = Camera.clone(camera);
        tempCamera.frustum = frustum;
        tempCamera.update(SceneMode.SCENE2D);

        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var heading = CesiumMath.toRadians(90.0);
        var pitch = CesiumMath.toRadians(-45.0);
        var range = 2.0;

        tempCamera.lookAt(target, new HeadingPitchRange(heading, pitch, range));

        expect(Cartesian2.clone(tempCamera.position)).toEqual(Cartesian2.ZERO);

        tempCamera.lookAtTransform(Matrix4.IDENTITY);
        expect(tempCamera.direction).toEqual(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()));
        expect(tempCamera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(tempCamera.frustum.right).toEqual(range * 0.5);
        expect(tempCamera.frustum.left).toEqual(-range * 0.5);
    });

    it('lookAt throws when morphing', function() {
        camera.update(SceneMode.MORPHING);

        expect(function() {
            camera.lookAt(Cartesian3.ZERO, Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('lookAtTransform', function() {
        var target = new Cartesian3(-1.0, -1.0, 0.0);
        var offset = new Cartesian3(1.0, 1.0, 0.0);
        var transform = Transforms.eastNorthUpToFixedFrame(target, Ellipsoid.UNIT_SPHERE);

        var tempCamera = Camera.clone(camera);
        tempCamera.lookAtTransform(transform, offset);

        expect(tempCamera.position).toEqualEpsilon(offset, CesiumMath.EPSILON11);
        expect(tempCamera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(offset, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.right).toEqualEpsilon(Cartesian3.cross(tempCamera.direction, Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.up).toEqualEpsilon(Cartesian3.cross(tempCamera.right, tempCamera.direction, new Cartesian3()), CesiumMath.EPSILON11);

        expect(1.0 - Cartesian3.magnitude(tempCamera.direction)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.up)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.right)).toBeLessThan(CesiumMath.EPSILON14);
    });

    it('lookAtTransform with no offset parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartOrigin = Cartographic.fromDegrees(-75.59777, 40.03883);
        var origin = ellipsoid.cartographicToCartesian(cartOrigin);
        var transform = Transforms.eastNorthUpToFixedFrame(origin);

        var height = 1000.0;
        cartOrigin.height = height;

        camera.position = ellipsoid.cartographicToCartesian(cartOrigin);
        camera.direction = Cartesian3.negate(Cartesian3.fromCartesian4(Matrix4.getColumn(transform, 2, new Cartesian4())), new Cartesian3());
        camera.up = Cartesian3.fromCartesian4(Matrix4.getColumn(transform, 1, new Cartesian4(), new Matrix4()));
        camera.right = Cartesian3.fromCartesian4(Matrix4.getColumn(transform, 0, new Cartesian4()));

        camera.lookAtTransform(transform);

        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, height), CesiumMath.EPSILON9);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON9);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON9);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON9);
    });

    it('lookAtTransform with heading, pitch and range', function() {
        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var heading = CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(-45.0);
        var range = 2.0;
        var transform = Transforms.eastNorthUpToFixedFrame(target);

        var tempCamera = Camera.clone(camera);
        tempCamera.lookAtTransform(transform, new HeadingPitchRange(heading, pitch, range));

        tempCamera.lookAtTransform(Matrix4.IDENTITY);

        expect(Cartesian3.distance(tempCamera.position, target)).toEqualEpsilon(range, CesiumMath.EPSILON6);
        expect(tempCamera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(tempCamera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);

        expect(1.0 - Cartesian3.magnitude(tempCamera.direction)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.up)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.right)).toBeLessThan(CesiumMath.EPSILON14);
    });

    it('lookAtTransform throws with no transform parameter', function() {
        expect(function() {
            camera.lookAtTransform(undefined, Cartesian3.ZERO);
        }).toThrowDeveloperError();
    });

    it('lookAtTransform in 2D mode', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        var tempCamera = Camera.clone(camera);
        tempCamera.frustum = frustum;
        tempCamera.update(SceneMode.SCENE2D);

        var transform = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0));
        var offset = new Cartesian3(10000.0, 10000.0, 30000.0);
        tempCamera.lookAtTransform(transform, offset);

        expect(Cartesian2.clone(tempCamera.position)).toEqual(Cartesian2.ZERO);
        expect(tempCamera.direction).toEqual(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()));
        expect(tempCamera.up).toEqualEpsilon(Cartesian3.normalize(Cartesian3.fromElements(-offset.x, -offset.y, 0.0), new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.right).toEqualEpsilon(Cartesian3.cross(tempCamera.direction, tempCamera.up, new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.frustum.right).toEqual(Cartesian3.magnitude(offset) * 0.5);
        expect(tempCamera.frustum.left).toEqual(-Cartesian3.magnitude(offset) * 0.5);
    });

    it('lookAtTransform in 2D mode with heading, pitch and range', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;

        var tempCamera = Camera.clone(camera);
        tempCamera.frustum = frustum;
        tempCamera.update(SceneMode.SCENE2D);

        var target = Cartesian3.fromDegrees(0.0, 0.0);
        var heading = CesiumMath.toRadians(90.0);
        var pitch = CesiumMath.toRadians(-45.0);
        var range = 2.0;
        var transform = Transforms.eastNorthUpToFixedFrame(target);

        tempCamera.lookAtTransform(transform, new HeadingPitchRange(heading, pitch, range));

        expect(Cartesian2.clone(tempCamera.position)).toEqual(Cartesian2.ZERO);

        tempCamera.lookAtTransform(Matrix4.IDENTITY);
        expect(tempCamera.direction).toEqual(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()));
        expect(tempCamera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(tempCamera.frustum.right).toEqual(range * 0.5);
        expect(tempCamera.frustum.left).toEqual(-range * 0.5);
    });

    it('lookAtTransform in 3D with orthographic projection', function() {
        var target = new Cartesian3(-1.0, -1.0, 0.0);
        var offset = new Cartesian3(1.0, 1.0, 0.0);
        var transform = Transforms.eastNorthUpToFixedFrame(target, Ellipsoid.UNIT_SPHERE);

        var tempCamera = Camera.clone(camera);
        tempCamera.frustum = new OrthographicFrustum();
        tempCamera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        tempCamera.frustum.width = tempCamera.positionCartographic.height;

        tempCamera.lookAtTransform(transform, offset);

        expect(tempCamera.position).toEqualEpsilon(offset, CesiumMath.EPSILON11);
        expect(tempCamera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.normalize(offset, new Cartesian3()), new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.right).toEqualEpsilon(Cartesian3.cross(tempCamera.direction, Cartesian3.UNIT_Z, new Cartesian3()), CesiumMath.EPSILON11);
        expect(tempCamera.up).toEqualEpsilon(Cartesian3.cross(tempCamera.right, tempCamera.direction, new Cartesian3()), CesiumMath.EPSILON11);

        expect(1.0 - Cartesian3.magnitude(tempCamera.direction)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.up)).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - Cartesian3.magnitude(tempCamera.right)).toBeLessThan(CesiumMath.EPSILON14);

        expect(tempCamera.frustum.width).toEqual(Cartesian3.magnitude(tempCamera.position));
    });

    it('lookAtTransform throws when morphing', function() {
        camera.update(SceneMode.MORPHING);

        expect(function() {
            camera.lookAtTransform(Matrix4.IDENTITY, Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('setView rectangle in 3D (1)', function() {
        var rectangle = new Rectangle(
            -Math.PI,
            -CesiumMath.PI_OVER_TWO,
            Math.PI,
            CesiumMath.PI_OVER_TWO);
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(14680290.639204923, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON10);
    });

    it('setView rectangle in 3D (2)', function() {
        var rectangle = new Rectangle(
            CesiumMath.toRadians(21.25),
            CesiumMath.toRadians(41.23),
            CesiumMath.toRadians(21.51),
            CesiumMath.toRadians(41.38));
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(4481555.454147325, 1754498.0086281248, 4200627.581953675), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(-0.6995046749050446, -0.27385124912628594, -0.6600747708691498), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(new Cartesian3(-0.6146504879783901, -0.2406314209863035, 0.7511999047271233), CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(new Cartesian3(-0.36455176232452213, 0.9311831251617939, 0), CesiumMath.EPSILON10);
    });

    it('setView rectangle in 3D (3)', function() {
        var rectangle = new Rectangle(
            CesiumMath.toRadians(90.0),
            CesiumMath.toRadians(-50.0),
            CesiumMath.toRadians(157.0),
            CesiumMath.toRadians(0.0));
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(-6017603.25625715, 9091606.78076493, -5075070.862292178), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0.49978034145251155, -0.7550857289433265, 0.42434084442077485), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(new Cartesian3(-0.2342094064143758, 0.35385181388649406, 0.905502538790623), CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(new Cartesian3(-0.8338858220671682, -0.5519369853120581, 0), CesiumMath.EPSILON10);
    });

    it('setView rectangle in 3D (4)', function() {
        var rectangle = new Rectangle(
            CesiumMath.toRadians(90.0),
            CesiumMath.toRadians(-62.0),
            CesiumMath.toRadians(174.0),
            CesiumMath.toRadians(-4.0));
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(-7307919.685704952, 8116267.060310548, -7085995.891547672), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0.5602119862713765, -0.6221784429103113, 0.5468605998017956), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(new Cartesian3(-0.3659211647391443, 0.40639662500016843, 0.8372236764356468), CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(new Cartesian3(-0.7431448254773944, -0.6691306063588581, 0), CesiumMath.EPSILON10);
    });

    it('views rectangle in 3D across IDL', function() {
        var rectangle = new Rectangle(
            0.1,
            -CesiumMath.PI_OVER_TWO,
            -0.1,
            CesiumMath.PI_OVER_TWO);
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(-14680290.639204923, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), CesiumMath.EPSILON10);
    });

    it('setView rectangle in 2D with larger longitude', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            -CesiumMath.PI_OVER_FOUR,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_FOUR);
        var projection = new GeographicProjection();
        var edge = projection.project(new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR));
        var expected = Math.max(edge.x, edge.y);

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;
        camera.setView({destination: rectangle});

        expect(camera.position.x).toEqual(0);
        expect(camera.position.y).toEqual(0);
        expect(frustum.right - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.left + expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.top - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.bottom + expected <= CesiumMath.EPSILON14).toEqual(true);
    });

    it('setView rectangle in 2D with larger latitude', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_FOUR,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_FOUR,
            CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        var edge = projection.project(new Cartographic(CesiumMath.PI_OVER_FOUR, CesiumMath.PI_OVER_TWO));
        var expected = Math.max(edge.x, edge.y);

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;
        camera.setView({destination: rectangle});

        expect(camera.position.x).toEqual(0);
        expect(camera.position.y).toEqual(0);
        expect(frustum.right - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.left + expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.top - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.bottom + expected <= CesiumMath.EPSILON14).toEqual(true);
    });

    it('setView rectangle in Columbus View', function() {
        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        camera._mode = SceneMode.COLUMBUS_VIEW;
        camera._projection = projection;
        camera.setView({destination: rectangle});
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 23137321.67119748), CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0.0, 0.0, -1.0), CesiumMath.EPSILON2);
        expect(camera.up).toEqualEpsilon(new Cartesian3(0.0, 1.0, 0.0), CesiumMath.EPSILON2);
        expect(camera.right).toEqualEpsilon(new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON10);
    });

    it('setView rectangle in 3D with orthographic frustum', function() {
        camera.setView({
            destination : Cartesian3.fromDegrees(-75.0, 42.0, 100.0)
        });

        camera.frustum = new OrthographicFrustum();
        camera.frustum.aspectRatio = 1135 / 630;
        camera.frustum.width = camera.positionCartographic.height;

        // force update of off-center frustum
        expect(camera.frustum.projectionMatrix).toBeDefined();

        var rectangle = new Rectangle(
            CesiumMath.toRadians(21.25),
            CesiumMath.toRadians(41.23),
            CesiumMath.toRadians(21.51),
            CesiumMath.toRadians(41.38));

        var projection = new GeographicProjection();
        camera._mode = SceneMode.SCENE3D;
        camera._projection = projection;
        camera.setView({destination: rectangle});

        expect(camera.position).toEqualEpsilon(new Cartesian3(4489090.849577177, 1757448.0638960265, 4207738.07588144), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(-0.6995012374560863, -0.2738499033887593, -0.6600789719506079), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(new Cartesian3(-0.6146543999545513, -0.2406329524979527, 0.7511962132416727), CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(new Cartesian3(-0.36455176232452197, 0.931183125161794, 0.0), CesiumMath.EPSILON10);
    });

    it('setView rectangle in Columbus view with orthographic frustum', function() {
        camera.setView({
            destination : Cartesian3.fromDegrees(-75.0, 42.0, 100.0)
        });

        camera.frustum = new OrthographicFrustum();
        camera.frustum.aspectRatio = 1135 / 630;
        camera.frustum.width = camera.positionCartographic.height;

        // force update of off-center frustum
        expect(camera.frustum.projectionMatrix).toBeDefined();

        var rectangle = new Rectangle(
            CesiumMath.toRadians(21.25),
            CesiumMath.toRadians(41.23),
            CesiumMath.toRadians(21.51),
            CesiumMath.toRadians(41.38));

        var projection = new GeographicProjection();
        camera._mode = SceneMode.COLUMBUS_VIEW;
        camera._projection = projection;
        camera.setView({destination: rectangle});

        expect(camera.position).toEqualEpsilon(new Cartesian3(2380010.713160189, 4598051.567216165, 28943.06760625122), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0.0, 0.0, -1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON10);
    });

    it('getRectangleCameraCoordinates throws without rectangle', function() {
        expect(function () {
            camera.getRectangleCameraCoordinates();
        }).toThrowDeveloperError();
    });

    it('getRectangleCameraCoordinates rectangle in 3D', function() {
        var rectangle = new Rectangle(
            -Math.PI,
            -CesiumMath.PI_OVER_TWO,
            Math.PI,
            CesiumMath.PI_OVER_TWO);
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);
        camera._mode = SceneMode.SCENE3D;
        camera.getRectangleCameraCoordinates(rectangle, position);
        expect(position).toEqualEpsilon(new Cartesian3(14680290.639204923, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);
    });

    it('gets coordinates for rectangle in 3D across IDL', function() {
        var rectangle = new Rectangle(
            0.1,
            -CesiumMath.PI_OVER_TWO,
            -0.1,
            CesiumMath.PI_OVER_TWO);
        var position = new Cartesian3();
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);
        camera._mode = SceneMode.SCENE3D;
        position = camera.getRectangleCameraCoordinates(rectangle);
        expect(position).toEqualEpsilon(new Cartesian3(-14680290.639204923, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);
    });

    it('views rectangle in 2D with larger latitude', function() {
        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_FOUR,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_FOUR,
            CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        var cam = new Camera(scene);
        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = 1.0;
        frustum.left = -1.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        frustum.near = 1.0;
        frustum.far = 2.0;
        cam.frustum = frustum;
        var z = cam.position.z;

        cam._mode = SceneMode.SCENE2D;
        cam._projection = projection;
        camera.position = cam.getRectangleCameraCoordinates(rectangle);

        expect(camera.position.x).toEqual(0);
        expect(camera.position.y).toEqual(0);
        expect(camera.position.z).not.toEqual(z);

        expect(cam.frustum.left).toEqual(-1.0);
        expect(cam.frustum.far).toEqual(2.0);

    });

    it('gets coordinates for rectangle in Columbus View', function() {
        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        camera._mode = SceneMode.COLUMBUS_VIEW;
        camera._projection = projection;
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);
        camera.position = camera.getRectangleCameraCoordinates(rectangle);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 23137321.67119748), CesiumMath.EPSILON8);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);
    });


    it('get rectangle coordinate returns camera position if scene mode is morphing', function() {
        var rectangle = new Rectangle(
            -CesiumMath.PI_OVER_TWO,
            -CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO,
            CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        camera._mode = SceneMode.MORPHING;
        camera._projection = projection;
        var position = Cartesian3.clone(camera.position);
        var direction = Cartesian3.clone(camera.direction);
        var up = Cartesian3.clone(camera.up);
        var right = Cartesian3.clone(camera.right);
        camera.getRectangleCameraCoordinates(rectangle, camera.position);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqual(direction);
        expect(camera.up).toEqual(up);
        expect(camera.right).toEqual(right);
    });

    it('pick ellipsoid thows without a position', function() {
        expect(function() {
            camera.pickEllipsoid();
        }).toThrowDeveloperError();
    });

    it('pick ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0 * maxRadii, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        var windowCoord = new Cartesian2(scene.canvas.clientWidth * 0.5, scene.canvas.clientHeight * 0.5);
        var p = camera.pickEllipsoid(windowCoord, ellipsoid);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));

        p = camera.pickEllipsoid(Cartesian2.ZERO, ellipsoid);
        expect(p).toBeUndefined();
    });

    it('pickEllipsoid works near the surface', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var minRadii = ellipsoid.minimumRadius;

        // Ten meters above the surface at the north pole, looking down.
        camera.position = new Cartesian3(0.0, 0.0, minRadii + 10.0);
        camera.direction = new Cartesian3(0.0, 0.0, -1.0);
        camera.up = new Cartesian3(1.0, 0.0, 0.0);
        camera.right = new Cartesian3(0.0, 1.0, 0.0);

        var p = camera.pickEllipsoid(Cartesian2.ZERO, ellipsoid);
        expect(p.z).toEqualEpsilon(minRadii, 1e-4);
    });

    it('pick map in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;

        var windowCoord = new Cartesian2(scene.canvas.clientWidth * 0.5, scene.canvas.clientHeight * 0.5);
        var p = camera.pickEllipsoid(windowCoord);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));
    });

    it('pick rotated map in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;

        var windowCoord = new Cartesian2(scene.canvas.clientWidth * 0.5, scene.canvas.clientHeight * 0.5 + 1.0);
        var p = camera.pickEllipsoid(windowCoord);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c.longitude).toEqual(0.0);
        expect(c.latitude).toBeLessThan(0.0);

        camera.up = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);

        p = camera.pickEllipsoid(windowCoord);
        c = ellipsoid.cartesianToCartographic(p);
        expect(c.latitude).toEqual(0.0);
        expect(c.longitude).toBeGreaterThan(0.0);
    });

    it('pick map in columbus view', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -1.0, 1.0), new Cartesian3()), 5.0 * maxRadii, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, camera.position, new Cartesian3()), new Cartesian3());
        camera.right = Cartesian3.normalize(Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.cross(camera.right, camera.direction, new Cartesian3());

        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.update(SceneMode.COLUMBUS_VIEW);

        var windowCoord = new Cartesian2(scene.canvas.clientWidth * 0.5, scene.canvas.clientHeight * 0.5);
        var p = camera.pickEllipsoid(windowCoord);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));

        p = camera.pickEllipsoid(Cartesian2.ZERO);
        expect(p).toBeUndefined();
    });

    it('pick map in morph', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0 * maxRadii, new Cartesian3());
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.update(SceneMode.MORPHING);

        var windowCoord = new Cartesian2(scene.canvas.clientWidth * 0.5, scene.canvas.clientHeight * 0.5);
        var p = camera.pickEllipsoid(windowCoord);
        expect(p).toBeUndefined();
    });

    it('get pick ray throws without a position', function() {
        expect(function () {
            camera.getPickRay();
        }).toThrowDeveloperError();
    });

    it('get pick ray perspective', function() {
        var windowCoord = new Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight);
        var ray = camera.getPickRay(windowCoord);

        var windowHeight = camera.frustum.near * Math.tan(camera.frustum.fovy * 0.5);
        var expectedDirection = Cartesian3.normalize(new Cartesian3(0.0, -windowHeight, -1.0), new Cartesian3());
        expect(ray.origin).toEqual(camera.position);
        expect(ray.direction).toEqualEpsilon(expectedDirection, CesiumMath.EPSILON15);
    });

    it('get pick ray orthographic in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var windowCoord = new Cartesian2((3.0 / 5.0) * scene.canvas.clientWidth, (1.0 - (3.0 / 5.0)) * scene.canvas.clientHeight);
        var ray = camera.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.x + 2.0, cameraPosition.y + 2, cameraPosition.z);
        expect(ray.origin).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON14);
        expect(ray.direction).toEqual(camera.directionWC);
    });

    it('get pick ray orthographic in 3D', function() {
        var frustum = new OrthographicFrustum();
        frustum.aspectRatio = 1.0;
        frustum.width = 20.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        // force off center frustum to update
        expect(frustum.projectionMatrix).toBeDefined();

        camera.update(SceneMode.SCENE3D);

        var windowCoord = new Cartesian2((3.0 / 5.0) * scene.canvas.clientWidth, (1.0 - (3.0 / 5.0)) * scene.canvas.clientHeight);
        var ray = camera.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.x + 2.0, cameraPosition.y + 2, cameraPosition.z);
        expect(ray.origin).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON14);
        expect(ray.direction).toEqual(camera.directionWC);
    });

    it('get pick ray orthographic in Columbus view', function() {
        var frustum = new OrthographicFrustum();
        frustum.aspectRatio = 1.0;
        frustum.width = 20.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        // force off center frustum to update
        expect(frustum.projectionMatrix).toBeDefined();

        camera.update(SceneMode.COLUMBUS_VIEW);

        var windowCoord = new Cartesian2((3.0 / 5.0) * scene.canvas.clientWidth, (1.0 - (3.0 / 5.0)) * scene.canvas.clientHeight);
        var ray = camera.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.z, cameraPosition.x + 2.0, cameraPosition.y + 2);
        expect(ray.origin).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON14);
        expect(ray.direction).toEqual(camera.directionWC);
    });

    it('gets magnitude in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.maximumRadius;

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;

        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        expect(camera.getMagnitude()).toEqual(frustum.right - frustum.left);
    });

    it('gets magnitude in Columbus view', function() {
        camera._mode = SceneMode.COLUMBUS_VIEW;
        expect(camera.getMagnitude()).toEqual(camera.position.z);
    });

    it('gets magnitude in 3D', function() {
        expect(camera.getMagnitude()).toEqual(Cartesian3.magnitude(camera.position));
    });

    it('create animation throws without a duration', function() {
        expect(function() {
            camera.createCorrectPositionTween();
        }).toThrowDeveloperError();
    });

    it('does not animate in 3D', function() {
        expect(camera.createCorrectPositionTween(0.05)).not.toBeDefined();
    });

    it('does not animate in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var max = scene.mapProjection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;

        camera.moveUp(dy);
        camera.moveRight(dx);

        expect(camera.createCorrectPositionTween(0.05)).not.toBeDefined();
    });

    it('animates position to visible map in Columbus view', function() {
        var maxRadii = Ellipsoid.WGS84.maximumRadius;
        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;
        camera.position = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, maxRadii * 5.0, new Cartesian3());

        camera.update(SceneMode.COLUMBUS_VIEW);

        var max = scene.mapProjection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;
        var tweens = new TweenCollection();

        camera.moveUp(dy);
        camera.moveRight(dx);

        var correctAnimation = camera.createCorrectPositionTween(0.05);
        expect(correctAnimation).toBeDefined();
        var animation = tweens.add(correctAnimation);
        while(tweens.contains(animation)) {
            tweens.update();
        }

        expect(camera.position.x).toEqualEpsilon(max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(max.y, CesiumMath.EPSILON6);

        camera.moveDown(dy);
        camera.moveLeft(dx);

        correctAnimation = camera.createCorrectPositionTween(0.05);
        expect(correctAnimation).toBeDefined();
        animation = tweens.add(correctAnimation);
        while(tweens.contains(animation)) {
            tweens.update();
        }

        expect(camera.position.x).toEqualEpsilon(-max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(-max.y, CesiumMath.EPSILON6);
    });

    it('animates position to visible map in Columbus view with web mercator projection', function() {
        var projection = new WebMercatorProjection();
        var mercatorCamera = new Camera(new FakeScene(projection));
        mercatorCamera.position = Cartesian3.clone(position);
        mercatorCamera.up = Cartesian3.clone(up);
        mercatorCamera.direction = Cartesian3.clone(dir);
        mercatorCamera.right = Cartesian3.clone(right);
        mercatorCamera.minimumZoomDistance = 0.0;
        mercatorCamera.update(SceneMode.COLUMBUS_VIEW);

        var maxRadii = Ellipsoid.WGS84.maximumRadius;
        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        mercatorCamera.frustum = frustum;
        mercatorCamera.position = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, maxRadii * 5.0, new Cartesian3());

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;
        var tweens = new TweenCollection();

        mercatorCamera.moveUp(dy);
        mercatorCamera.moveRight(dx);

        var correctAnimation = mercatorCamera.createCorrectPositionTween(0.05);
        expect(correctAnimation).toBeDefined();
        var animation = tweens.add(correctAnimation);
        while(tweens.contains(animation)) {
            tweens.update();
        }

        expect(mercatorCamera.position.x).toEqualEpsilon(max.x, CesiumMath.EPSILON6);
        expect(mercatorCamera.position.y).toEqualEpsilon(max.y, CesiumMath.EPSILON6);

        mercatorCamera.moveDown(dy);
        mercatorCamera.moveLeft(dx);

        correctAnimation = mercatorCamera.createCorrectPositionTween(0.05);
        expect(correctAnimation).toBeDefined();
        animation = tweens.add(correctAnimation);
        while(tweens.contains(animation)) {
            tweens.update();
        }

        expect(mercatorCamera.position.x).toEqualEpsilon(-max.x, CesiumMath.EPSILON6);
        expect(mercatorCamera.position.y).toEqualEpsilon(-max.y, CesiumMath.EPSILON6);
    });

    it('flyTo uses CameraFlightPath', function() {
        spyOn(CameraFlightPath, 'createTween').and.returnValue({
            startObject : {},
            stopObject: {},
            duration : 0.001
        });

        var options = {
            destination : Cartesian3.fromDegrees(-117.16, 32.71, 15000.0),
            orientation : {
                heading : 0,
                pitch : 1,
                roll : 2
            },
            duration : 3,
            complete : function() {
            },
            cancel : function() {
            },
            endTransform : new Matrix4(),
            convert : true,
            maximumHeight : 100,
            pitchAdjustHeight:101,
            flyOverLongitude: 1,
            flyOverLongitudeWeight: 20,
            easingFunction : function() {
            }
        };
        camera.flyTo(options);

        var args = CameraFlightPath.createTween.calls.argsFor(0);
        var passedOptions = args[1];

        expect(CameraFlightPath.createTween).toHaveBeenCalled();
        expect(args[0]).toBe(scene);
        expect(passedOptions.destination).toBe(options.destination);
        expect(passedOptions.heading).toBe(options.orientation.heading);
        expect(passedOptions.pitch).toBe(options.orientation.pitch);
        expect(passedOptions.roll).toBe(options.orientation.roll);
        expect(typeof passedOptions.complete).toBe('function'); //complete function is wrapped by camera.
        expect(passedOptions.cancel).toBe(options.cancel);
        expect(passedOptions.endTransform).toBe(options.endTransform);
        expect(passedOptions.convert).toBe(options.convert);
        expect(passedOptions.maximumHeight).toBe(options.maximumHeight);
        expect(passedOptions.easingFunction).toBe(options.easingFunction);
        expect(passedOptions.pitchAdjustHeight).toBe(options.pitchAdjustHeight);
        expect(passedOptions.flyOverLongitude).toBe(options.flyOverLongitude);
        expect(passedOptions.flyOverLongitudeWeight).toBe(options.flyOverLongitudeWeight);
    });

    it('can cancel a flight', function() {
        spyOn(CameraFlightPath, 'createTween').and.returnValue({
            startObject : {},
            stopObject: {},
            duration : 0.001,
            cancelTween: jasmine.createSpy('cancelTween')
        });

        var options = {
            destination : Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
        };
        camera.flyTo(options);

        expect(camera._currentFlight).toBeDefined();

        var createdTween = camera._currentFlight;
        spyOn(createdTween, 'cancelTween');
        camera.cancelFlight();

        expect(createdTween.cancelTween).toHaveBeenCalled();
        expect(camera._currentFlight).toBeUndefined();
    });

    it('flyTo with heading, pitch and roll', function() {
        scene.mode = SceneMode.SCENE3D;

        var heading = CesiumMath.toRadians(180.0);
        var pitch = 0.0;
        var roll = CesiumMath.toRadians(45.0);

        var options = {
            destination : Cartesian3.fromDegrees(-117.16, 32.71, 0.0),
            orientation : {
                heading : heading,
                pitch : pitch,
                roll : roll
            },
            duration : 0.0
        };
        camera.flyTo(options);

        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON6);
        expect(camera.roll).toEqualEpsilon(roll, CesiumMath.EPSILON6);
    });

    it('flyTo with direction, up', function() {
        scene.mode = SceneMode.SCENE3D;

        var direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        var up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var options = {
            destination : Cartesian3.fromDegrees(-117.16, 32.71, 0.0),
            orientation : {
                direction : direction,
                up : up
            },
            duration : 0.0
        };
        camera.flyTo(options);

        expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON6);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON6);
    });

    it('flyHome works in 3D', function() {
        camera._mode = SceneMode.SCENE3D;

        var destination = Cartesian3.fromDegrees(30, 20, 1000);
        camera.setView({
            destination: destination
        });
        camera.flyHome(0);
        expect(camera.position).toEqualEpsilon(new Cartesian3(2515865.110478756, -19109892.759980734, 13550929.353715947), CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(-0.10654051334260287, 0.8092555423939248, -0.5777149696185906), CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(new Cartesian3(-0.07540693517283716, 0.5727725379670786, 0.8162385765685121), CesiumMath.EPSILON8);
    });

    it ('flyHome works in 2D', function() {
        camera._mode = SceneMode.SCENE2D;

        var destination = Cartesian3.fromDegrees(30, 20, 1000);
        camera.setView({
            destination: destination
        });
        camera.flyHome(0);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0, 0, -1), CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON8);
    });

    it('flyHome works in CV', function() {
        var sq2Over2 = Math.sqrt(2)*0.5;
        camera._mode = SceneMode.COLUMBUS_VIEW;

        var destination = Cartesian3.fromDegrees(30, 20, 1000);
        camera.setView({
            destination: destination
        });
        camera.flyHome(0);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0, -22550119.620184112, 22550119.62018411), CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0, sq2Over2, -sq2Over2), CesiumMath.EPSILON8);
        expect(camera.up).toEqualEpsilon(new Cartesian3(0, sq2Over2, sq2Over2), CesiumMath.EPSILON8);
    });

    it('viewBoundingSphere', function() {
        scene.mode = SceneMode.SCENE3D;

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 10000.0);
        camera.viewBoundingSphere(sphere);
        camera._setTransform(Matrix4.IDENTITY);

        var distance = Cartesian3.distance(camera.position, sphere.center);
        expect(distance).toBeGreaterThan(sphere.radius);
        expect(distance).toBeLessThan(sphere.radius * 3.0);
    });

    it('viewBoundingSphere with offset', function() {
        scene.mode = SceneMode.SCENE3D;

        var heading = CesiumMath.toRadians(45.0);
        var pitch = CesiumMath.toRadians(-45.0);
        var range = 15.0;

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 10.0);
        camera.viewBoundingSphere(sphere, new HeadingPitchRange(heading, pitch, range));
        camera._setTransform(Matrix4.IDENTITY);

        var distance = Cartesian3.distance(camera.position, sphere.center);
        expect(distance).toEqualEpsilon(range, CesiumMath.EPSILON10);
        expect(camera.heading).toEqualEpsilon(heading, CesiumMath.EPSILON6);
        expect(camera.pitch).toEqualEpsilon(pitch, CesiumMath.EPSILON5);
    });

    it('viewBoundingSphere in 2D', function() {
        var frustum = new OrthographicOffCenterFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE2D);

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 10000.0);
        camera.viewBoundingSphere(sphere);
        camera._setTransform(Matrix4.IDENTITY);

        var distance = frustum.right - frustum.left;
        expect(distance).toBeGreaterThan(sphere.radius);
        expect(distance).toBeLessThan(sphere.radius * 3.0);
    });

    it('viewBoundingSphere in 3D with orthographic', function() {
        var frustum = new OrthographicFrustum();
        frustum.aspectRatio = 1.0;
        frustum.width = 20.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        camera.update(SceneMode.SCENE3D);

        // force off center update
        expect(frustum.projectionMatrix).toBeDefined();

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 10000.0);
        camera.viewBoundingSphere(sphere);
        camera._setTransform(Matrix4.IDENTITY);

        var distance = frustum.width;
        expect(distance).toBeGreaterThan(sphere.radius);
        expect(distance).toBeLessThan(sphere.radius * 3.0);
    });

    it('viewBoundingSphere throws when morphing', function() {
        camera._mode = SceneMode.MORPHING;

        expect(function() {
            camera.viewBoundingSphere(new BoundingSphere());
        }).toThrowDeveloperError();
    });

    it('viewBoundingSphere throws without bounding sphere', function() {
        camera._mode = SceneMode.MORPHING;

        expect(function() {
            camera.viewBoundingSphere(undefined);
        }).toThrowDeveloperError();
    });

    it('flyToBoundingSphere uses CameraFlightPath', function() {
        spyOn(CameraFlightPath, 'createTween').and.returnValue({
            startObject : {},
            stopObject: {},
            duration : 0.0
        });

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 100000.0);
        camera.flyToBoundingSphere(sphere);

        expect(CameraFlightPath.createTween).toHaveBeenCalled();
    });

    it('flyToBoundingSphere uses CameraFlightPath', function() {
        scene.mode = SceneMode.SCENE3D;

        var sphere = new BoundingSphere(Cartesian3.fromDegrees(-117.16, 32.71, 0.0), 10000.0);
        camera.flyToBoundingSphere(sphere, {
            duration : 0.0
        });

        var distance = Cartesian3.distance(camera.position, sphere.center);
        expect(distance).toBeGreaterThan(sphere.radius);
        expect(distance).toBeLessThan(sphere.radius * 3.0);
    });

    it('distanceToBoundingSphere', function() {
        scene.mode = SceneMode.SCENE3D;

        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var distance = camera.distanceToBoundingSphere(sphere);
        expect(distance).toEqual(0.5);
    });

    it('distanceToBoundingSphere throws when there is no bounding sphere', function() {
        scene.mode = SceneMode.SCENE3D;

        expect(function() {
            camera.distanceToBoundingSphere();
        }).toThrowDeveloperError();
    });

    it('getPixelSize', function() {
        scene.mode = SceneMode.SCENE3D;

        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var context = scene.context;
        var drawingBufferWidth = context.drawingBufferWidth;
        var drawingBufferHeight = context.drawingBufferHeight;

        // Compute expected pixel size
        var distance = camera.distanceToBoundingSphere(sphere);
        var pixelDimensions = camera.frustum.getPixelDimensions(drawingBufferWidth, drawingBufferHeight, distance, new Cartesian2());
        var expectedPixelSize = Math.max(pixelDimensions.x, pixelDimensions.y);

        var pixelSize = camera.getPixelSize(sphere, drawingBufferWidth, drawingBufferHeight);
        expect(pixelSize).toEqual(expectedPixelSize);
    });

    it('getPixelSize throws when there is no bounding sphere', function() {
        scene.mode = SceneMode.SCENE3D;

        expect(function() {
            camera.getPixelSize();
        }).toThrowDeveloperError();
    });

    it('getPixelSize throws when there is no drawing buffer width', function() {
        scene.mode = SceneMode.SCENE3D;
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);

        expect(function() {
            camera.getPixelSize(sphere);
        }).toThrowDeveloperError();
    });

    it('getPixelSize throws when there is no drawing buffer height', function() {
        scene.mode = SceneMode.SCENE3D;
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);

        expect(function() {
            camera.getPixelSize(sphere, 10);
        }).toThrowDeveloperError();
    });

    it('computeViewRectangle when zoomed in', function() {
        scene.mode = SceneMode.SCENE3D;

        var position = Cartesian3.clone(Cartesian3.UNIT_X);
        Cartesian3.multiplyByScalar(position, 7000000, position);

        camera.position = position;
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var correctResult = new Rectangle(-0.05789100547374969, -0.04365869998457809, 0.05789100547374969, 0.04365869998457809);

        var rect = camera.computeViewRectangle();
        expect(rect).toEqual(correctResult);
    });

    it('computeViewRectangle when zoomed in to pole', function() {
        scene.mode = SceneMode.SCENE3D;

        var position = Cartesian3.clone(Cartesian3.UNIT_Z);
        Cartesian3.multiplyByScalar(position, 7000000, position);
        camera.position = position;
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var correctResult = new Rectangle(-CesiumMath.PI, 1.4961779388065022, CesiumMath.PI, CesiumMath.PI_OVER_TWO);

        var rect = camera.computeViewRectangle();
        expect(rect).toEqual(correctResult);
    });

    it('computeViewRectangle when zoomed in to IDL', function() {
        scene.mode = SceneMode.SCENE3D;

        var position = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        Cartesian3.multiplyByScalar(position, 7000000, position);
        camera.position = position;
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.direction = Cartesian3.clone(Cartesian3.UNIT_X, new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var correctResult = new Rectangle(3.0837016481160435, -0.04365869998457809, -3.0837016481160435, 0.04365869998457809);

        var rect = camera.computeViewRectangle();
        expect(rect).toEqual(correctResult);
    });

    it('computeViewRectangle when zoomed out', function() {
        scene.mode = SceneMode.SCENE3D;

        var position = Cartesian3.clone(Cartesian3.UNIT_X);
        Cartesian3.multiplyByScalar(position, 25000000, position);

        camera.position = position;
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var rect = camera.computeViewRectangle();
        expect(rect).toEqual(Rectangle.MAX_VALUE);
    });

    it('computeViewRectangle when globe isn\'t visible', function() {
        scene.mode = SceneMode.SCENE3D;

        var position = Cartesian3.clone(Cartesian3.UNIT_X);
        Cartesian3.multiplyByScalar(position, 7000000, position);

        camera.position = position;
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.direction = Cartesian3.clone(Cartesian3.UNIT_X);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());

        var rect = camera.computeViewRectangle();
        expect(rect).not.toBeDefined();
    });

    it('flyTo rectangle in 2D', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        camera._mode = SceneMode.SCENE2D;

        var frustum = new OrthographicOffCenterFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var west = 0.3323436621771766;
        var south = 0.8292930502744068;
        var east = 0.3325710961342694;
        var north = 0.8297059734014236;
        var rectangle = new Rectangle(west, south, east, north);

        var expectedDestination = camera.getRectangleCameraCoordinates(rectangle);
        camera.flyTo({destination : rectangle});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('flyTo rectangle in CV', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        camera._mode = SceneMode.COLUMBUS_VIEW;

        var west = 0.3323436621771766;
        var south = 0.8292930502744068;
        var east = 0.3325710961342694;
        var north = 0.8297059734014236;
        var rectangle = new Rectangle(west, south, east, north);

        var expectedDestination = camera.getRectangleCameraCoordinates(rectangle);
        camera.flyTo({destination : rectangle});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('flyTo rectangle in 3D', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        camera._mode = SceneMode.SCENE3D;

        var west = 0.3323436621771766;
        var south = 0.8292930502744068;
        var east = 0.3325710961342694;
        var north = 0.8297059734014236;
        var rectangle = new Rectangle(west, south, east, north);

        var expectedDestination = camera.getRectangleCameraCoordinates(rectangle);
        camera.flyTo({destination : rectangle});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('flyTo does not zoom closer than minimumZoomDistance', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        scene.mode = SceneMode.SCENE3D;
        scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        scene.screenSpaceCameraController.maximumZoomDistance = 10000;

        var sourceDestination = Cartesian3.fromDegrees(-117.16, 32.71, 100);
        var expectedDestination = Cartesian3.clone(sourceDestination);
        expectedDestination.z = Cartesian3.fromDegrees(-117.16, 32.71, 1000).z;

        camera.flyTo({destination : sourceDestination});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('flyTo does not zoom further than maximumZoomDistance', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        scene.mode = SceneMode.SCENE3D;
        scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        scene.screenSpaceCameraController.maximumZoomDistance = 10000;

        var sourceDestination = Cartesian3.fromDegrees(-117.16, 32.71, 100000);
        var expectedDestination = Cartesian3.clone(sourceDestination);
        expectedDestination.z = Cartesian3.fromDegrees(-117.16, 32.71, 10000).z;

        camera.flyTo({destination : sourceDestination});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('flyTo zooms in between minimumZoomDistance and maximumZoomDistance', function() {
        var tweenSpy = spyOn(CameraFlightPath, 'createTween');
        spyOn(scene.tweens, 'add');

        scene.mode = SceneMode.SCENE3D;
        scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        scene.screenSpaceCameraController.maximumZoomDistance = 10000;

        var sourceDestination = Cartesian3.fromDegrees(-117.16, 32.71, 5000);
        var expectedDestination = Cartesian3.clone(sourceDestination);

        camera.flyTo({destination : sourceDestination});

        expect(tweenSpy.calls.mostRecent().args[1].destination.equalsEpsilon(expectedDestination, 0.1)).toBe(true);
    });

    it('switches projections', function() {
        expect(camera.frustum instanceof PerspectiveFrustum).toEqual(true);
        camera.switchToOrthographicFrustum();
        expect(camera.frustum instanceof OrthographicFrustum).toEqual(true);
        camera.switchToPerspectiveFrustum();
        expect(camera.frustum instanceof PerspectiveFrustum).toEqual(true);
    });

    it('does not switch projection in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.maximumRadius;

        camera._mode = SceneMode.SCENE2D;
        camera._projection = projection;

        var frustum = new OrthographicOffCenterFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        expect(camera.frustum instanceof OrthographicOffCenterFrustum).toEqual(true);
        camera.switchToOrthographicFrustum();
        expect(camera.frustum instanceof OrthographicOffCenterFrustum).toEqual(true);
        camera.switchToPerspectiveFrustum();
        expect(camera.frustum instanceof OrthographicOffCenterFrustum).toEqual(true);
    });
});
