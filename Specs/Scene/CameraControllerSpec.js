
/*global defineSuite*/
defineSuite([
         'Scene/CameraController',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/Extent',
         'Core/Math',
         'Core/Matrix4',
         'Core/Transforms',
         'Core/WebMercatorProjection',
         'Scene/AnimationCollection',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum',
         'Scene/SceneMode'
     ], function(
         CameraController,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Cartographic,
         Ellipsoid,
         GeographicProjection,
         Extent,
         CesiumMath,
         Matrix4,
         Transforms,
         WebMercatorProjection,
         AnimationCollection,
         Camera,
         OrthographicFrustum,
         PerspectiveFrustum,
         SceneMode) {
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
    var zoomAmount = 1.0;

    var FakeCanvas = function() {
        this.addEventListener = function() {};
        this.removeEventListener = function() {};

        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    beforeEach(function() {
        position = Cartesian3.UNIT_Z.clone();
        up = Cartesian3.UNIT_Y.clone();
        dir = Cartesian3.UNIT_Z.negate();
        right = dir.cross(up);

        canvas = new FakeCanvas();

        camera = new Camera(canvas);
        camera.position = position.clone();
        camera.up = up.clone();
        camera.direction = dir.clone();
        camera.right = right.clone();

        controller = camera.controller;
        controller.minimumZoomDistance = 0.0;
    });

    it('constructor throws without a camera', function() {
        expect(function() {
            return new CameraController();
        }).toThrow();
    });

    it('update throws in 2D mode without an orthographic frustum', function() {
        expect(function() {
            controller.update(SceneMode.SCENE2D);
        }).toThrow();
    });

    it('move throws without an axis', function() {
        expect(function() {
            expect(controller.move());
        }).toThrow();
    });

    it('moves', function() {
        var direction = new Cartesian3(1.0, 1.0, 0.0).normalize();
        controller.move(direction, moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(direction.x * moveAmount, direction.y * moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves up', function() {
        controller.moveUp(moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves down', function() {
        controller.moveDown(moveAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, -moveAmount, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves right', function() {
        controller.moveRight(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(moveAmount, 0.0, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves left', function() {
        controller.moveLeft(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(-moveAmount, 0.0, 1.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves forward', function() {
        controller.moveForward(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(0.0, 0.0, 1.0 - moveAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('moves backward', function() {
        controller.moveBackward(moveAmount);
        expect(camera.position).toEqual(new Cartesian3(0.0, 0.0, 1.0 + moveAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('move clamps position in 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var projection = new GeographicProjection();
        controller.update(SceneMode.SCENE2D, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;

        controller.moveUp(dy);
        controller.moveRight(dx);
        expect(camera.position.x).toBeLessThan(dx);
        expect(camera.position.y).toBeLessThan(dy);

        controller.moveDown(dy);
        controller.moveLeft(dx);
        expect(camera.position.x).toBeGreaterThan(-dx);
        expect(camera.position.y).toBeGreaterThan(-dy);
    });

    it('look throws without an axis', function() {
        expect(function() {
            expect(controller.look());
        }).toThrow();
    });

    it('looks', function() {
        controller.look(Cartesian3.UNIT_X, CesiumMath.PI);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON10);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
    });

    it('looks left', function() {
        controller.lookLeft(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqualEpsilon(right.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
    });

    it('looks right', function() {
        controller.lookRight(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
    });

    it('looks up', function() {
        controller.lookUp(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
    });

    it('looks down', function() {
        controller.lookDown(turnAmount);
        expect(camera.position).toEqual(position);
        expect(camera.right).toEqual(right);
        expect(camera.direction).toEqualEpsilon(up.negate(), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
    });

    it('twists left', function() {
        controller.twistLeft(CesiumMath.PI_OVER_TWO);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqual(dir);
        expect(camera.up).toEqualEpsilon(right.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(up, CesiumMath.EPSILON15);
    });

    it('twists right', function() {
        controller.twistRight(CesiumMath.PI_OVER_TWO);
        expect(camera.position).toEqual(position);
        expect(camera.direction).toEqual(dir);
        expect(camera.up).toEqualEpsilon(right, CesiumMath.EPSILON14);
        expect(camera.right).toEqualEpsilon(up.negate(), CesiumMath.EPSILON15);
    });

    it('rotate throws without an axis', function() {
        expect(function() {
            expect(controller.rotate());
        }).toThrow();
    });

    it('rotates up', function() {
        controller.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
    });

    it('rotates up with constrained axis 0', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
    });

    it('rotates up with constrained axis 1', function() {
        camera.up = dir.negate();
        camera.direction = right;
        camera.right = camera.direction.cross(camera.up);

        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateUp(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON14);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
    });

    it('rotates down', function() {
        controller.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates down with constrained axis 0 ', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates down with constrained axis 1', function() {
        camera.up = dir.negate();
        camera.direction = right;
        camera.right = camera.direction.cross(camera.up);

        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateDown(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
    });

    it('rotates left', function() {
        controller.rotateLeft(rotateAmount);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15);
    });

    it('rotates left with contrained axis', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Z;
        controller.rotateLeft(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Z.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);
    });

    it('rotates right', function() {
        controller.rotateRight(rotateAmount);
        expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(right.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(dir, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
    });

    it('rotates right with contrained axis', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Z;
        controller.rotateRight(rotateAmount);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_Z.negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);
    });

    it('rotates', function() {
        var axis = new Cartesian3(Math.cos(CesiumMath.PI_OVER_FOUR), Math.sin(CesiumMath.PI_OVER_FOUR), 0.0).normalize();
        var angle = CesiumMath.PI_OVER_TWO;
        controller.rotate(axis, angle);

        expect(camera.position).toEqualEpsilon(new Cartesian3(-axis.x, axis.y, 0.0), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(camera.position.normalize().negate(), CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(new Cartesian3(0.5, 0.5, axis.x).normalize(), CesiumMath.EPSILON15);
        expect(camera.up).toEqualEpsilon(camera.right.cross(camera.direction), CesiumMath.EPSILON15);
    });

    it('rotate past constrained axis stops at constained axis', function() {
        controller.constrainedAxis = Cartesian3.UNIT_Y;
        controller.rotateUp(Math.PI);
        expect(camera.up).toEqualEpsilon(dir.negate(), CesiumMath.EPSILON15);
        expect(camera.direction).toEqualEpsilon(up, CesiumMath.EPSILON15);
        expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON15);
        expect(camera.position).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON15);
    });

    it('zooms out 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        controller.update(SceneMode.SCENE2D, { projection : projection });

        controller.zoomOut(zoomAmount);
        expect(camera.frustum.right).toEqualEpsilon(2.5, CesiumMath.EPSILON10);
        expect(camera.frustum.left).toEqual(-2.5, CesiumMath.EPSILON10);
        expect(camera.frustum.top).toEqual(1.25, CesiumMath.EPSILON10);
        expect(camera.frustum.bottom).toEqual(-1.25, CesiumMath.EPSILON10);
    });

    it('zooms in 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        controller.update(SceneMode.SCENE2D, { projection : projection });

        controller.zoomIn(zoomAmount);
        expect(camera.frustum.right).toEqualEpsilon(1.5, CesiumMath.EPSILON10);
        expect(camera.frustum.left).toEqual(-1.5, CesiumMath.EPSILON10);
        expect(camera.frustum.top).toEqual(0.75, CesiumMath.EPSILON10);
        expect(camera.frustum.bottom).toEqual(-0.75, CesiumMath.EPSILON10);
    });

    it('clamps zoom in 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        controller.update(SceneMode.SCENE2D, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;
        var ratio = frustum.top / frustum.right;

        controller.zoomOut(dx);
        expect(frustum.right).toBeLessThan(dx);
        expect(frustum.left).toBeGreaterThan(-dx);
        expect(frustum.top).toEqual(frustum.right * ratio);
        expect(frustum.bottom).toEqual(-frustum.top);
    });

    it('zooms in 3D', function() {
        controller.zoomIn(zoomAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 1.0 - zoomAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('zooms out in 3D', function() {
        controller.zoomOut(zoomAmount);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 1.0 + zoomAmount), CesiumMath.EPSILON10);
        expect(camera.up).toEqual(up);
        expect(camera.direction).toEqual(dir);
        expect(camera.right).toEqual(right);
    });

    it('zooms in throws with undefined OrthogrphicFrustum properties 2D', function() {
        controller._mode = SceneMode.SCENE2D;
        camera.frustum = new OrthographicFrustum();
        expect(function () {
            controller.zoomIn(zoomAmount);
        }).toThrow();
    });

    it('lookAt', function() {
        var target = new Cartesian3(-1.0, -1.0, 0.0);
        var position = Cartesian3.UNIT_X;
        var up = Cartesian3.UNIT_Z;

        var tempCamera = camera.clone();
        tempCamera.controller.lookAt(position, target, up);
        expect(tempCamera.position).toEqual(position);
        expect(tempCamera.direction).toEqual(target.subtract(position).normalize());
        expect(tempCamera.up).toEqual(up);
        expect(tempCamera.right).toEqual(tempCamera.direction.cross(up).normalize());

        expect(1.0 - tempCamera.direction.magnitude()).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - tempCamera.up.magnitude()).toBeLessThan(CesiumMath.EPSILON14);
        expect(1.0 - tempCamera.right.magnitude()).toBeLessThan(CesiumMath.EPSILON14);
    });

    it('lookAt throws with no eye parameter', function() {
        var target = Cartesian3.ZERO;
        var up = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.controller.lookAt(undefined, target, up);
        }).toThrow();
    });

    it('lookAt throws with no target parameter', function() {
        var eye = Cartesian3.ZERO;
        var up = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.controller.lookAt(eye, undefined, up);
        }).toThrow();
    });

    it('lookAt throws with no up parameter', function() {
        var eye = Cartesian3.ZERO;
        var target = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.controller.lookAt(eye, target, undefined);
        }).toThrow();
    });

    it('lookAt throws in 2D mode', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        controller.update(SceneMode.SCENE2D, { projection : new GeographicProjection() });

        expect(function() {
            controller.lookAt(Cartesian3.UNIT_X, Cartesian3.ZERO, Cartesian3.UNIT_Y);
        }).toThrow();
    });

    it('lookAt throws when morphing', function() {
        controller.update(SceneMode.MORPHING, { projection : new GeographicProjection() });

        expect(function() {
            controller.lookAt(Cartesian3.UNIT_X, Cartesian3.ZERO, Cartesian3.UNIT_Y);
        }).toThrow();
    });

    it('viewExtent throws without extent', function() {
        expect(function () {
            controller.viewExtent();
        }).toThrow();
    });

    it('views extent in 3D', function() {
        var extent = new Extent(
                -Math.PI,
                -CesiumMath.PI_OVER_TWO,
                Math.PI,
                CesiumMath.PI_OVER_TWO);
        controller.viewExtent(extent);
        expect(camera.position).toEqualEpsilon(new Cartesian3(-11010217.979403382, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y.negate(), CesiumMath.EPSILON10);
    });

    it('views extent in 3D across IDL', function() {
        var extent = new Extent(
                0.1,
                -CesiumMath.PI_OVER_TWO,
                -0.1,
                CesiumMath.PI_OVER_TWO);
        controller.viewExtent(extent);
        expect(camera.position).toEqualEpsilon(new Cartesian3(11010217.979403382, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(Cartesian3.UNIT_X.negate(), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON10);
    });

    it('views extent in 2D with larger longitude', function() {
        var frustum = new OrthographicFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        camera.position = new Cartesian3(0.0, 0.0, maxRadii * 2.0);

        var extent = new Extent(
                -CesiumMath.PI_OVER_TWO,
                -CesiumMath.PI_OVER_FOUR,
                CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_FOUR);
        var projection = new GeographicProjection();
        var edge = projection.project(new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR));
        var expected = Math.max(edge.x, edge.y);

        controller._mode = SceneMode.SCENE2D;
        controller._projection = projection;
        controller.viewExtent(extent);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, maxRadii * 2.0), CesiumMath.EPSILON10);

        expect(frustum.right - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.left + expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.top - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.bottom + expected <= CesiumMath.EPSILON14).toEqual(true);
    });

    it('views extent in 2D with larger latitude', function() {
        var frustum = new OrthographicFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        camera.position = new Cartesian3(0.0, 0.0, maxRadii * 2.0);

        var extent = new Extent(
                -CesiumMath.PI_OVER_FOUR,
                -CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_FOUR,
                CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        var edge = projection.project(new Cartographic(CesiumMath.PI_OVER_FOUR, CesiumMath.PI_OVER_TWO));
        var expected = Math.max(edge.x, edge.y);

        controller._mode = SceneMode.SCENE2D;
        controller._projection = projection;
        controller.viewExtent(extent);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, maxRadii * 2.0), CesiumMath.EPSILON10);

        expect(frustum.right - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.left + expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.top - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.bottom + expected <= CesiumMath.EPSILON14).toEqual(true);
    });

    it('views extent in Columbus View', function() {
        var extent = new Extent(
                -CesiumMath.PI_OVER_TWO,
                -CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        controller._mode = SceneMode.COLUMBUS_VIEW;
        controller._projection = projection;
        controller.viewExtent(extent);
        expect(camera.position).toEqualEpsilon(new Cartesian3(0.0, 0.0, 17352991.253398113), CesiumMath.EPSILON10);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(0.0, 0.0, -1.0), CesiumMath.EPSILON2);
        expect(camera.up).toEqualEpsilon(new Cartesian3(0.0, 1.0, 0.0), CesiumMath.EPSILON2);
        expect(camera.right).toEqualEpsilon(new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON10);
    });

    it('pick ellipsoid thows without a position', function() {
        expect(function() {
            controller.pickEllipsoid();
        }).toThrow();
    });

    it('pick ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var maxRadii = ellipsoid.getMaximumRadius();

        camera.position = Cartesian3.UNIT_X.multiplyByScalar(2.0 * maxRadii);
        camera.direction = camera.position.negate().normalize();
        camera.up = Cartesian3.UNIT_Z;
        camera.right = camera.direction.cross(camera.up);

        var frustum = new PerspectiveFrustum();
        frustum.fovy = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        var windowCoord = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var p = controller.pickEllipsoid(windowCoord, ellipsoid);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));

        p = controller.pickEllipsoid(Cartesian2.ZERO, ellipsoid);
        expect(typeof p === 'undefined').toEqual(true);
    });

    it('pick map in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.getMaximumRadius();

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = camera.position.negate().normalize();
        camera.up = Cartesian3.UNIT_Y;

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        controller._mode = SceneMode.SCENE2D;
        controller._projection = projection;

        var windowCoord = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var p = controller.pickEllipsoid(windowCoord);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));

        p = controller.pickEllipsoid(Cartesian2.ZERO);
        expect(typeof p === 'undefined').toEqual(true);
    });

    it('pick map in columbus view', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.getMaximumRadius();

        camera.position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
        camera.direction = Cartesian3.ZERO.subtract(camera.position).normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z).normalize();
        camera.up = camera.right.cross(camera.direction);

        var frustum = new PerspectiveFrustum();
        frustum.fovy = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        controller._mode = SceneMode.COLUMBUS_VIEW;
        controller._projection = projection;

        var windowCoord = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var p = controller.pickEllipsoid(windowCoord);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c).toEqual(new Cartographic(0.0, 0.0, 0.0));

        p = controller.pickEllipsoid(Cartesian2.ZERO);
        expect(typeof p).toEqual('undefined');
    });

    it('set position cartographic throws without a cartographic', function() {
        expect(function() {
            controller.setPositionCartographic();
        }).toThrow();
    });

    it('set position cartographic in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.getMaximumRadius();

        controller._mode = SceneMode.SCENE2D;
        controller._projection = projection;

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        var ratio = frustum.top / frustum.right;
        var cart = new Cartographic(-75.0, 42.0, 100.0);
        controller.setPositionCartographic(cart);

        expect(Cartesian2.fromCartesian3(camera.position)).toEqual(Cartesian2.fromCartesian3(projection.project(cart)));
        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up).toEqual(Cartesian3.UNIT_Y);
        expect(camera.right).toEqual(Cartesian3.UNIT_X);
        expect(frustum.right - frustum.left).toEqual(cart.height);
        expect(frustum.top / frustum.right).toEqual(ratio);
    });

    it('set position cartographic in Columbus View', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        controller._mode = SceneMode.COLUMBUS_VIEW;
        controller._projection = projection;

        var cart = new Cartographic(-75.0, 42.0, 100.0);
        controller.setPositionCartographic(cart);
        expect(camera.position).toEqual(projection.project(cart));
        expect(camera.direction).toEqual(Cartesian3.UNIT_Z.negate());
        expect(camera.up).toEqual(Cartesian3.UNIT_Y);
        expect(camera.right).toEqual(Cartesian3.UNIT_X);
    });

    it('set position cartographic in 3D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);

        controller._mode = SceneMode.SCENE3D;
        controller._projection = projection;

        var cart = new Cartographic(-75.0, 0.0, 100.0);
        controller.setPositionCartographic(cart);

        expect(camera.position).toEqual(ellipsoid.cartographicToCartesian(cart));
        expect(camera.direction).toEqual(camera.position.negate().normalize());
        expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);
        expect(camera.right).toEqual(camera.direction.cross(camera.up));
    });

    it('get pick ray throws without a position', function() {
        expect(function () {
            controller.getPickRay();
        }).toThrow();
    });

    it('get pick ray perspective', function() {
        var windowCoord = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight);
        var ray = controller.getPickRay(windowCoord);

        var windowHeight = camera.frustum.near * Math.tan(camera.frustum.fovy * 0.5);
        var expectedDirection = new Cartesian3(0.0, -windowHeight, -1.0).normalize();
        expect(ray.origin).toEqual(camera.position);
        expect(ray.direction).toEqualEpsilon(expectedDirection, CesiumMath.EPSILON15);
    });

    it('get pick ray orthographic', function() {
        var frustum = new OrthographicFrustum();
        frustum.left = -10.0;
        frustum.right = 10.0;
        frustum.bottom = -10.0;
        frustum.top = 10.0;
        frustum.near = 1.0;
        frustum.far = 21.0;
        camera.frustum = frustum;

        var windowCoord = new Cartesian2((3.0 / 5.0) * canvas.clientWidth, (1.0 - (3.0 / 5.0)) * canvas.clientHeight);
        var ray = controller.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.x + 2.0, cameraPosition.y + 2, cameraPosition.z);
        expect(ray.origin).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON14);
        expect(ray.direction).toEqual(camera.direction);
    });

    it('gets magnitude in 2D', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var maxRadii = ellipsoid.getMaximumRadius();

        controller._mode = SceneMode.SCENE2D;
        controller._projection = projection;

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        expect(controller.getMagnitude()).toEqual(frustum.right - frustum.left);
    });

    it('gets magnitude in Columbus view', function() {
        controller._mode = SceneMode.COLUMBUS_VIEW;
        expect(controller.getMagnitude()).toEqual(camera.position.z);
    });

    it('gets magnitude in 3D', function() {
        expect(controller.getMagnitude()).toEqual(camera.position.magnitude());
    });

    it('create animation throws without a duration', function() {
        expect(function() {
            controller.createCorrectPositionAnimation();
        }).toThrow();
    });

    it('does not animate in 3D', function() {
        expect(controller.createCorrectPositionAnimation(50.0)).not.toBeDefined();
    });

    it('animates position to visible map in 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var projection = new GeographicProjection();
        controller.update(SceneMode.SCENE2D, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;
        var animationCollection = new AnimationCollection();

        controller.moveUp(dy);
        controller.moveRight(dx);

        var correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        var animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqual(max.x);
        expect(camera.position.y).toEqual(max.y);

        controller.moveDown(dy);
        controller.moveLeft(dx);

        correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqual(-max.x);
        expect(camera.position.y).toEqual(-max.y);
    });

    it('animates frustum in 2D', function() {
        var frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.left = -2.0;
        frustum.right = 2.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        camera.frustum = frustum;

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        controller.update(SceneMode.SCENE2D, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        var factor = 1000.0;
        var dx = max.x * factor;
        var animationCollection = new AnimationCollection();

        controller.zoomOut(dx);

        var right = frustum.right;
        var top = frustum.top;

        var correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        var animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(frustum.right).toBeLessThan(right);
        expect(frustum.right).toBeGreaterThan(max.x);
        expect(frustum.left).toEqual(-frustum.right);
        expect(frustum.top).toBeLessThan(top);
        expect(frustum.top).toBeGreaterThan(max.y);
        expect(frustum.bottom).toEqual(-frustum.top);
    });

    it('animates position to visible map in Columbus view', function() {
        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        var frustum = new PerspectiveFrustum();
        frustum.fovy = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;
        camera.position = Cartesian3.UNIT_Z.multiplyByScalar(maxRadii * 5.0);
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        var projection = new GeographicProjection();
        controller.update(SceneMode.COLUMBUS_VIEW, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;
        var animationCollection = new AnimationCollection();

        controller.moveUp(dy);
        controller.moveRight(dx);

        var correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        var animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqualEpsilon(max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(max.y, CesiumMath.EPSILON6);

        controller.moveDown(dy);
        controller.moveLeft(dx);

        correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqualEpsilon(-max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(-max.y, CesiumMath.EPSILON6);
    });

    it('animates position to visible map in Columbus view with web mercator projection', function() {
        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        var frustum = new PerspectiveFrustum();
        frustum.fovy = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        frustum.near = 100;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;
        camera.position = Cartesian3.UNIT_Z.multiplyByScalar(maxRadii * 5.0);
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        var projection = new WebMercatorProjection();
        controller.update(SceneMode.COLUMBUS_VIEW, { projection : projection });

        var max = projection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        var factor = 1000.0;
        var dx = max.x * factor;
        var dy = max.y * factor;
        var animationCollection = new AnimationCollection();

        controller.moveUp(dy);
        controller.moveRight(dx);

        var correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        var animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqualEpsilon(max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(max.y, CesiumMath.EPSILON6);

        controller.moveDown(dy);
        controller.moveLeft(dx);

        correctAnimation = controller.createCorrectPositionAnimation(50.0);
        expect(correctAnimation).toBeDefined();
        animation = animationCollection.add(correctAnimation);
        while(animationCollection.contains(animation)) {
            animationCollection.update();
        }

        expect(camera.position.x).toEqualEpsilon(-max.x, CesiumMath.EPSILON6);
        expect(camera.position.y).toEqualEpsilon(-max.y, CesiumMath.EPSILON6);
    });
});