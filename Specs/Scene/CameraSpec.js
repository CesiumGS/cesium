/*global defineSuite*/
defineSuite([
         'Scene/Camera',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/Extent',
         'Core/Math',
         'Core/Matrix4',
         'Scene/CameraControllerCollection',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum'
     ], function(
         Camera,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         GeographicProjection,
         Extent,
         CesiumMath,
         Matrix4,
         CameraControllerCollection,
         OrthographicFrustum,
         PerspectiveFrustum) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var camera;
    var canvas = {
        clientWidth : 1024,
        clientHeight : 768
    };

    beforeEach(function() {
        camera = new Camera(canvas);
        camera.position = new Cartesian3();
        camera.up = Cartesian3.UNIT_Y;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.frustum.near = 1.0;
        camera.frustum.far = 2.0;
        camera.frustum.fovy = (Math.PI) / 3;
        camera.frustum.aspectRatio = 1.0;
    });

    it('constructor throws an exception when there is no canvas', function() {
        expect(function() {
            return new Camera();
        }).toThrow();
    });

    it('getControllers', function() {
        // can't pass fake canvas for this test
        camera = new Camera(document);
        var controllers = camera.getControllers();
        expect(controllers).toEqual(new CameraControllerCollection(camera, document));
    });

    it('lookAt', function() {
        var target = new Cartesian3(-1.0, -1.0, 0.0);
        var position = Cartesian3.UNIT_X;
        var up = Cartesian3.UNIT_Z;

        var tempCamera = camera.clone();
        tempCamera.lookAt(position, target, up);
        expect(tempCamera.position.equals(position)).toEqual(true);
        expect(tempCamera.direction.equals(target.subtract(position).normalize())).toEqual(true);
        expect(tempCamera.up.equals(up)).toEqual(true);
        expect(tempCamera.right.equals(tempCamera.direction.cross(up).normalize())).toEqual(true);

        expect(1.0 - tempCamera.direction.magnitude() < CesiumMath.EPSILON14).toEqual(true);
        expect(1.0 - tempCamera.up.magnitude() < CesiumMath.EPSILON14).toEqual(true);
        expect(1.0 - tempCamera.right.magnitude() < CesiumMath.EPSILON14).toEqual(true);
    });

    it('lookAt throws with no eye parameter', function() {
        var target = Cartesian3.ZERO;
        var up = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.lookAt(undefined, target, up);
        }).toThrow();
    });

    it('lookAt throws with no target parameter', function() {
        var eye = Cartesian3.ZERO;
        var up = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.lookAt(eye, undefined, up);
        }).toThrow();
    });

    it('lookAt throws with no up parameter', function() {
        var eye = Cartesian3.ZERO;
        var target = Cartesian3.ZERO;
        var tempCamera = camera.clone();
        expect(function() {
            tempCamera.lookAt(eye, target, undefined);
        }).toThrow();
    });

    it('get view matrix', function() {
        var viewMatrix = camera.getViewMatrix();
        var position = camera.position;
        var up = camera.up;
        var dir = camera.direction;
        var right = dir.cross(up);
        var rotation = new Matrix4(right.x, right.y, right.z, 0.0,
                                      up.x,    up.y,    up.z, 0.0,
                                    -dir.x,  -dir.y,  -dir.z, 0.0,
                                       0.0,     0.0,     0.0, 1.0);
        var translation = new Matrix4(1.0, 0.0, 0.0, -position.x,
                                      0.0, 1.0, 0.0, -position.y,
                                      0.0, 0.0, 1.0, -position.z,
                                      0.0, 0.0, 0.0,         1.0);
        var expected = rotation.multiply(translation);
        expect(viewMatrix.equals(expected)).toEqual(true);
    });

    it('viewExtent throws without extent', function() {
        expect(function () {
            camera.viewExtent();
        }).toThrow();
    });

    it('viewExtent', function() {
        var extent = new Extent(
                -Math.PI,
                -CesiumMath.PI_OVER_TWO,
                Math.PI,
                CesiumMath.PI_OVER_TWO);
        camera.viewExtent(extent, Ellipsoid.WGS84);
        expect(camera.position).toEqualEpsilon(new Cartesian3(-11010217.979403382, 0.0, 0.0), CesiumMath.EPSILON6);
        expect(camera.direction).toEqualEpsilon(new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON10);
        expect(camera.up).toEqualEpsilon(new Cartesian3(0.0, 0.0, 1.0), CesiumMath.EPSILON10);
        expect(camera.right).toEqualEpsilon(new Cartesian3(0.0, -1.0, 0.0), CesiumMath.EPSILON10);
    });

    it('viewExtent2D throws without extent', function() {
        expect(function () {
            camera.viewExtent2D();
        }).toThrow();
    });

    it('viewExtent2D throws without projection', function() {
        expect(function () {
            camera.viewExtent2D(new Extent(-1.0, -1.0, 1.0, 1.0));
        }).toThrow();
    });

    it('viewExtent2D', function() {
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
                -CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        var edge = projection.project(new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO));
        var expected = Math.max(edge.x, edge.y);

        camera.viewExtent2D(extent, projection);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, 0.0, maxRadii * 2.0), CesiumMath.EPSILON10)).toEqual(true);

        expect(frustum.right - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.left + expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.top - expected <= CesiumMath.EPSILON14).toEqual(true);
        expect(frustum.bottom + expected <= CesiumMath.EPSILON14).toEqual(true);
    });

    it('viewExtentColumbusView throws without extent', function() {
        expect(function () {
            camera.viewExtentColumbusView();
        }).toThrow();
    });

    it('viewExtentColumbusView throws without projection', function() {
        expect(function () {
            camera.viewExtentColumbusView(new Extent(-1.0, -1.0, 1.0, 1.0));
        }).toThrow();
    });

    it('viewExtentColumbusView', function() {
        var extent = new Extent(
                -CesiumMath.PI_OVER_TWO,
                -CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO,
                CesiumMath.PI_OVER_TWO);
        var projection = new GeographicProjection();
        camera.viewExtentColumbusView(extent, projection);
        expect(camera.position.equalsEpsilon(new Cartesian3(0.0, 0.0, 17352991.253398113), CesiumMath.EPSILON10)).toEqual(true);
        expect(camera.direction.equalsEpsilon(new Cartesian3(0.0, 0.0, -1.0), CesiumMath.EPSILON2)).toEqual(true);
        expect(camera.up.equalsEpsilon(new Cartesian3(0.0, 1.0, 0.0), CesiumMath.EPSILON2)).toEqual(true);
        expect(camera.right.equalsEpsilon(new Cartesian3(1.0, 0.0, 0.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('get inverse view matrix', function() {
        var expected = camera.getViewMatrix().inverse();
        expect(expected).toEqual(camera.getInverseViewMatrix());
    });

    it('get inverse transform', function() {
        camera.transform = new Matrix4(5.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 2.0, 0.0, 0.0, 5.0, 3.0, 0.0, 0.0, 0.0, 1.0);
        var expected = camera.transform.inverseTransformation();
        expect(expected.equals(camera.getInverseTransform())).toEqual(true);
    });

    it('get pick ray throws without a position', function() {
        expect(function () {
            camera.getPickRay();
        }).toThrow();
    });

    it('get pick ray perspective', function() {
        camera.frustum.fovy = CesiumMath.PI_OVER_TWO;

        var windowCoord = new Cartesian2(canvas.clientWidth, 0.0);
        var ray = camera.getPickRay(windowCoord);

        var expectedDirection = new Cartesian3(1.0, 1.0, -1.0).normalize();
        expect(ray.origin.equals(camera.position)).toEqual(true);
        expect(ray.direction.equalsEpsilon(expectedDirection, CesiumMath.EPSILON15)).toEqual(true);
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
        var ray = camera.getPickRay(windowCoord);

        var cameraPosition = camera.position;
        var expectedPosition = new Cartesian3(cameraPosition.x + 2.0, cameraPosition.y + 2, cameraPosition.z);
        expect(ray.origin.equalsEpsilon(expectedPosition, CesiumMath.EPSILON14)).toEqual(true);
        expect(ray.direction.equals(camera.direction)).toEqual(true);
    });

    it('pick ellipsoid thows without a position', function() {
        expect(function() {
            camera.pickEllipsoid();
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
        var p = camera.pickEllipsoid(windowCoord, ellipsoid);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c.equals(new Cartographic(0.0, 0.0, 0.0))).toEqual(true);

        p = camera.pickEllipsoid(Cartesian2.ZERO, ellipsoid);
        expect(typeof p === 'undefined').toEqual(true);
    });

    it('pick map in 2D thows without a position', function() {
        expect(function() {
            camera.pickMap2D();
        }).toThrow();
    });

    it('pick map in 2D thows without a projection', function() {
        expect(function() {
            camera.pickMap2D(Cartesian2.ZERO);
        }).toThrow();
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

        var windowCoord = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var p = camera.pickMap2D(windowCoord, projection);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c.equals(new Cartographic(0.0, 0.0, 0.0))).toEqual(true);

        p = camera.pickMap2D(Cartesian2.ZERO, projection);
        expect(typeof p === 'undefined').toEqual(true);
    });

    it('pick map in columbus view thows without a position', function() {
        expect(function() {
            camera.pickMapColumbusView();
        }).toThrow();
    });

    it('pick map in columbus view thows without a projection', function() {
        expect(function() {
            camera.pickMapColumbusView(Cartesian2.ZERO);
        }).toThrow();
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

        var windowCoord = new Cartesian2(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        var p = camera.pickMapColumbusView(windowCoord, projection);
        var c = ellipsoid.cartesianToCartographic(p);
        expect(c.equals(new Cartographic(0.0, 0.0, 0.0))).toEqual(true);

        p = camera.pickMapColumbusView(Cartesian2.ZERO, projection);
        expect(typeof p === 'undefined').toEqual(true);
    });

    it('isDestroyed', function() {
        expect(camera.isDestroyed()).toEqual(false);
        camera.destroy();
        expect(camera.isDestroyed()).toEqual(true);
    });

});
