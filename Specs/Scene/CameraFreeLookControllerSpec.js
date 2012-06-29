/*global defineSuite*/
defineSuite([
         'Scene/CameraFreeLookController',
         'Core/Cartesian3',
         'Core/Math',
         'Scene/Camera',
         'Scene/PerspectiveFrustum'
     ], function(
         CameraFreeLookController,
         Cartesian3,
         CesiumMath,
         Camera,
         PerspectiveFrustum) {
    "use strict";
    /*global it,expect,document,beforeEach,afterEach*/

    var position;
    var up;
    var dir;
    var right;
    var camera;
    var frustum;
    var moverate;
    var turnrate;
    var cflc;

    beforeEach(function() {
        moverate = 3.0;
        turnrate = CesiumMath.PI_OVER_TWO;
        position = new Cartesian3();
        up = Cartesian3.UNIT_Y;
        dir = Cartesian3.UNIT_Z.negate();
        right = dir.cross(up);

        frustum = new PerspectiveFrustum();
        frustum.near = 1;
        frustum.far = 2;
        frustum.fovy = (Math.PI) / 3;
        frustum.aspect = 1;

        camera = new Camera(document);
        camera.position = position;
        camera.up = up;
        camera.direction = dir;
        camera.right = right;
        camera.frustum = frustum;

        cflc = new CameraFreeLookController(document, camera);
    });

    afterEach(function() {
        cflc = cflc && !cflc.isDestroyed() && cflc.destroy();
    });

    it('move forward', function() {
        cflc.moveForward(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, -moverate))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('move backward', function() {
        cflc.moveBackward(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, moverate))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('move up', function() {
        cflc.moveUp(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, moverate, 0.0))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('move down', function() {
        cflc.moveDown(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, -moverate, 0.0))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('move left', function() {
        cflc.moveLeft(moverate);
        expect(camera.position.equals(new Cartesian3(-moverate, 0.0, 0.0))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('move right', function() {
        cflc.moveRight(moverate);
        expect(camera.position.equals(new Cartesian3(moverate, 0.0, 0.0))).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equals(dir)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
    });

    it('look left', function() {
        cflc.lookLeft(turnrate);
        expect(camera.position.equals(position)).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('look right', function() {
        cflc.lookRight(turnrate);
        expect(camera.position.equals(position)).toEqual(true);
        expect(camera.up.equals(up)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('look up', function() {
        cflc.lookUp(turnrate);
        expect(camera.position.equals(position)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('look down', function() {
        cflc.lookDown(turnrate);
        expect(camera.position.equals(position)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotate', function() {
        cflc.rotate(Cartesian3.UNIT_X, CesiumMath.PI);
        expect(camera.position.equals(position)).toEqual(true);
        expect(camera.right.equals(right)).toEqual(true);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.direction.equalsEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10)).toEqual(true);
    });

    it('isDestroyed', function() {
        expect(cflc.isDestroyed()).toEqual(false);
        cflc.destroy();
        expect(cflc.isDestroyed()).toEqual(true);
    });
});
