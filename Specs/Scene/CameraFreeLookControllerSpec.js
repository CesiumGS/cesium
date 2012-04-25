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
    /*global document,it,expect,beforeEach,afterEach*/

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
        up = Cartesian3.getUnitY();
        dir = Cartesian3.getUnitZ().negate();
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

    it("move forward", function() {
        cflc.moveForward(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, -moverate))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("move backward", function() {
        cflc.moveBackward(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, moverate))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("move up", function() {
        cflc.moveUp(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, moverate, 0.0))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("move down", function() {
        cflc.moveDown(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, -moverate, 0.0))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("move left", function() {
        cflc.moveLeft(moverate);
        expect(camera.position.equals(new Cartesian3(-moverate, 0.0, 0.0))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("move right", function() {
        cflc.moveRight(moverate);
        expect(camera.position.equals(new Cartesian3(moverate, 0.0, 0.0))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("look left", function() {
        cflc.lookLeft(turnrate);
        expect(camera.position.equals(position)).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(right.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("look right", function() {
        cflc.lookRight(turnrate);
        expect(camera.position.equals(position)).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("look up", function() {
        cflc.lookUp(turnrate);
        expect(camera.position.equals(position)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("look down", function() {
        cflc.lookDown(turnrate);
        expect(camera.position.equals(position)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toBeTruthy();
    });
});