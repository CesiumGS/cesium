defineSuite([
         'Scene/CameraSpindleController',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Math',
         'Scene/Camera',
         'Scene/PerspectiveFrustum'
     ], function(
         CameraSpindleController,
         Ellipsoid,
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
    var rotaterate;
    var csc;

    beforeEach(function() {
        moverate = 3.0;
        rotaterate = CesiumMath.PI_OVER_TWO;
        position = Cartesian3.getUnitZ();
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

        csc = new CameraSpindleController(document, camera, Ellipsoid.getWgs84());
        csc.constrainedZAxis = false;
    });

    it("move up", function() {
        csc.moveUp(rotaterate);
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.position.equalsEpsilon(Cartesian3.getUnitY().negate(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("move down", function() {
        csc.moveDown(rotaterate);
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.position.equalsEpsilon(Cartesian3.getUnitY(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("move left", function() {
        csc.moveLeft(rotaterate);
        expect(camera.up.equalsEpsilon(up, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.position.equalsEpsilon(Cartesian3.getUnitX().negate(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("move right", function() {
        csc.moveRight(rotaterate);
        expect(camera.up.equalsEpsilon(up, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.direction.equalsEpsilon(right.negate(), CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toBeTruthy();
        expect(camera.position.equalsEpsilon(Cartesian3.getUnitX(), CesiumMath.EPSILON15)).toBeTruthy();
    });

    it("zoom in", function() {
        camera.position = new Cartesian3();
        csc.zoomIn(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, -moverate))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("zoom out", function() {
        camera.position = new Cartesian3();
        csc.zoomOut(moverate);
        expect(camera.position.equals(new Cartesian3(0.0, 0.0, moverate))).toBeTruthy();
        expect(camera.up.equals(up)).toBeTruthy();
        expect(camera.direction.equals(dir)).toBeTruthy();
        expect(camera.right.equals(right)).toBeTruthy();
    });

    it("rotate", function() {
        var camera2 = new Camera(document);
        camera2.position = position;
        camera2.up = up;
        camera2.direction = dir;
        camera2.right = right;
        camera2.frustum = frustum;

        var csc2 = new CameraSpindleController(document, camera2, Ellipsoid.getWgs84());
        var angle = CesiumMath.PI_OVER_TWO;

        csc.rotate(new Cartesian3(Math.cos(CesiumMath.PI_OVER_FOUR), Math.sin(CesiumMath.PI_OVER_FOUR), 0.0), angle);

        csc2.moveLeft(angle);
        csc2.moveUp(angle);

        expect(camera.position.equalsEpsilon(camera2.position, CesiumMath.EPSILON15));
        expect(camera.direction.equalsEpsilon(camera2.direction, CesiumMath.EPSILON15));
        expect(camera.up.equalsEpsilon(camera2.up, CesiumMath.EPSILON15));
        expect(camera.right.equalsEpsilon(camera2.right, CesiumMath.EPSILON15));
    });
});