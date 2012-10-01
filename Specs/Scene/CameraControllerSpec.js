
/*global defineSuite*/
defineSuite([
         'Scene/CameraController',
         'Scene/Camera',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         CameraController,
         Camera,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var camera;
    var controller;

    var position;
    var up;
    var dir;
    var right;

    var moveAmount = 3.0;
    var turnAmount = CesiumMath.PI_OVER_TWO;
    var rotateAmount = CesiumMath.PI_OVER_TWO;

    var FakeCanvas = function() {
        this.addEventListener = function() {};
        this.removeEventListener = function() {};

        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    beforeEach(function() {
        position = Cartesian3.UNIT_Z;
        up = Cartesian3.UNIT_Y;
        dir = Cartesian3.UNIT_Z.negate();
        right = dir.cross(up);

        canvas = new FakeCanvas();

        camera = new Camera(canvas);
        camera.position = position;
        camera.up = up;
        camera.direction = dir;
        camera.right = right;

        controller = camera.controller;
    });

    it('moves', function() {
        var direction = new Cartesian3(1.0, 1.0, 0.0).normalize();
        controller.move(direction, moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(direction.x * moveAmount, direction.y * moveAmount, 1.0), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves up', function() {
        controller.moveUp(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, moveAmount, 1.0), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves down', function() {
        controller.moveDown(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, -moveAmount, 1.0), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves right', function() {
        controller.moveRight(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(moveAmount, 0.0, 1.0), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves left', function() {
        controller.moveLeft(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(-moveAmount, 0.0, 1.0), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('move forward', function() {
        controller.moveForward(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, 0.0, 1.0 - moveAmount), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('move backward', function() {
        controller.moveBackward(moveAmount);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, 0.0, 1.0 + moveAmount), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('looks', function() {
        controller.look(Cartesian3.UNIT_X, CesiumMath.PI);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.direction.equalsEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10)).toEqual(true);
    });

    it('looks left', function() {
        controller.lookLeft(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqual(up);
        expect(camera.direction.equalsEpsilon(right.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('looks right', function() {
        controller.lookRight(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqual(up);
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('looks up', function() {
        controller.lookUp(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('looks down', function() {
        controller.lookDown(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates up', function() {
        controller.rotateUp(rotateAmount);
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates up with constrained axis 0', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateUp(rotateAmount);
        expect(camera.up.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates up with constrained axis 1', function() {
        camera.up = dir.negate();
        camera.direction = right;
        camera.right = camera.direction.cross(camera.up);

        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateUp(rotateAmount);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON14)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates down', function() {
        controller.rotateDown(rotateAmount);
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates down with constrained axis 0 ', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateDown(rotateAmount);
        expect(camera.up.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(up.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates down with constrained axis 1', function() {
        camera.up = dir.negate();
        camera.direction = right;
        camera.right = camera.direction.cross(camera.up);

        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateDown(rotateAmount);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates left', function() {
        controller.rotateLeft(rotateAmount);
        expect(camera.up.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates left with contrained axis', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Z;
        controller.rotateLeft(rotateAmount);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(Cartesian3.UNIT_Z.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates right', function() {
        controller.rotateRight(rotateAmount);
        expect(camera.up.equalsEpsilon(up, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(right.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(dir, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates right with contrained axis', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Z;
        controller.rotateRight(rotateAmount);
        expect(camera.up.equalsEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.direction.equalsEpsilon(Cartesian3.UNIT_Z.negate(), CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.right.equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15)).toEqual(true);
        expect(camera.position.equalsEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('rotates', function() {
        var camera2 = new Camera(document);
        camera2.position = position;
        camera2.up = up;
        camera2.direction = dir;
        camera2.right = right;

        var controller2 = new CameraController(camera2);
        var angle = CesiumMath.PI_OVER_TWO;

        controller.rotate(new Cartesian3(Math.cos(CesiumMath.PI_OVER_FOUR), Math.sin(CesiumMath.PI_OVER_FOUR), 0.0), angle);

        controller2.moveLeft(angle);
        controller2.moveUp(angle);

        expect(camera.position.equalsEpsilon(camera2.position, CesiumMath.EPSILON15));
        expect(camera.direction.equalsEpsilon(camera2.direction, CesiumMath.EPSILON15));
        expect(camera.up.equalsEpsilon(camera2.up, CesiumMath.EPSILON15));
        expect(camera.right.equalsEpsilon(camera2.right, CesiumMath.EPSILON15));
    });

});