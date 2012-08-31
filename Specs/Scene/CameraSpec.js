/*global defineSuite*/
defineSuite([
         'Scene/Camera',
         'Core/AxisAlignedBoundingBox',
         'Core/BoundingSphere',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Extent',
         'Core/Intersect',
         'Core/Math',
         'Core/Matrix4',
         'Scene/CameraControllerCollection',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum'
     ], function(
         Camera,
         AxisAlignedBoundingBox,
         BoundingSphere,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         EquidistantCylindricalProjection,
         Extent,
         Intersect,
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

    it('lookAt object', function() {
        var target = Cartesian3.ZERO;
        var newPosition = new Cartesian3(1.0, 1.0, 1.0);
        var newDirection = target.subtract(newPosition).normalize();
        var newUp = camera.right.cross(newDirection).normalize();
        var tempCamera = camera.clone();
        tempCamera.lookAt({
            eye : newPosition,
            up : newUp,
            target : target
        });
        expect(tempCamera.position.equals(newPosition)).toEqual(true);
        expect(tempCamera.direction.equals(newDirection)).toEqual(true);
        expect(tempCamera.up.equals(newUp)).toEqual(true);
    });

    it('lookAt array', function() {
        var target = Cartesian3.ZERO;
        var newPosition = new Cartesian3(1.0, 1.0, 1.0);
        var newDirection = target.subtract(newPosition).normalize();
        var newUp = camera.right.cross(newDirection).normalize();
        var tempCamera = camera.clone();
        tempCamera.lookAt(newPosition, target, newUp);
        expect(tempCamera.position.equals(newPosition)).toEqual(true);
        expect(tempCamera.direction.equals(newDirection)).toEqual(true);
        expect(tempCamera.up.equals(newUp)).toEqual(true);
    });

    it('lookAt returns without proper arguments', function() {
        var eye = new Cartesian3(1, 1, 1);

        camera.lookAt(eye);
        expect(camera.position.equals(eye)).toEqual(false);

        camera.lookAt({
            eye : eye
        });
        expect(camera.position.equals(eye)).toEqual(false);
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
        var projection = new EquidistantCylindricalProjection();
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
        var projection = new EquidistantCylindricalProjection();
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
        var projection = new EquidistantCylindricalProjection(ellipsoid);
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
        var projection = new EquidistantCylindricalProjection(ellipsoid);
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

    describe('box intersections', function() {

        it('can contain an axis aligned bounding box', function() {
            var box1 = AxisAlignedBoundingBox.fromPoints([
                                                   new Cartesian3(-0.5, 0, -1.25),
                                                   new Cartesian3(0.5, 0, -1.25),
                                                   new Cartesian3(-0.5, 0, -1.75),
                                                   new Cartesian3(0.5, 0, -1.75)
                                                  ]);
            expect(camera.getVisibility(box1)).toEqual(Intersect.INSIDE);
        });

        describe('can partially contain an axis aligned bounding box', function() {

            it('on the far plane', function() {
                var box2 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5),
                                                       new Cartesian3(-0.5, 0, -2.5),
                                                       new Cartesian3(0.5, 0, -2.5)
                                                      ]);
                expect(camera.getVisibility(box2)).toEqual(Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var box3 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -0.5),
                                                       new Cartesian3(0.5, 0, -0.5),
                                                       new Cartesian3(-0.5, 0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5)
                                                      ]);
                expect(camera.getVisibility(box3)).toEqual(Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var box4 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-1.5, 0, -1.25),
                                                       new Cartesian3(0, 0, -1.25),
                                                       new Cartesian3(-1.5, 0, -1.5),
                                                       new Cartesian3(0, 0, -1.5)
                                                      ]);
                expect(camera.getVisibility(box4)).toEqual(Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var box5 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(0, 0, -1.25),
                                                       new Cartesian3(1.5, 0, -1.25),
                                                       new Cartesian3(0, 0, -1.5),
                                                       new Cartesian3(1.5, 0, -1.5)
                                                      ]);
                expect(camera.getVisibility(box5)).toEqual(Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var box6 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -1.25),
                                                       new Cartesian3(0.5, 0, -1.25),
                                                       new Cartesian3(-0.5, 2.0, -1.75),
                                                       new Cartesian3(0.5, 2.0, -1.75)
                                                      ]);
                expect(camera.getVisibility(box6)).toEqual(Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var box7 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, -2.0, -1.25),
                                                       new Cartesian3(0.5, 0, -1.25),
                                                       new Cartesian3(-0.5, -2.0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5)
                                                      ]);
                expect(camera.getVisibility(box7)).toEqual(Intersect.INTERSECTING);
            });
        });

        describe('can not contain an axis aligned bounding box', function() {

            it('past the far plane', function() {
                var box8 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -2.25),
                                                       new Cartesian3(0.5, 0, -2.25),
                                                       new Cartesian3(-0.5, 0, -2.75),
                                                       new Cartesian3(0.5, 0, -2.75)
                                                      ]);
                expect(camera.getVisibility(box8)).toEqual(Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var box9 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -0.25),
                                                       new Cartesian3(0.5, 0, -0.25),
                                                       new Cartesian3(-0.5, 0, -0.75),
                                                       new Cartesian3(0.5, 0, -0.75)
                                                      ]);
                expect(camera.getVisibility(box9)).toEqual(Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var box10 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-5, 0, -1.25),
                                                        new Cartesian3(-3, 0, -1.25),
                                                        new Cartesian3(-5, 0, -1.75),
                                                        new Cartesian3(-3, 0, -1.75)
                                                       ]);
                expect(camera.getVisibility(box10)).toEqual(Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var box11 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(3, 0, -1.25),
                                                        new Cartesian3(5, 0, -1.25),
                                                        new Cartesian3(3, 0, -1.75),
                                                        new Cartesian3(5, 0, -1.75)
                                                       ]);
                expect(camera.getVisibility(box11)).toEqual(Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var box12 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-0.5, 3, -1.25),
                                                        new Cartesian3(0.5, 3, -1.25),
                                                        new Cartesian3(-0.5, 5, -1.75),
                                                        new Cartesian3(0.5, 5, -1.75)
                                                       ]);
                expect(camera.getVisibility(box12)).toEqual(Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var box13 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-0.5, -3, -1.25),
                                                        new Cartesian3(0.5, -3, -1.25),
                                                        new Cartesian3(-0.5, -5, -1.75),
                                                        new Cartesian3(0.5, -5, -1.75)
                                                       ]);
                expect(camera.getVisibility(box13)).toEqual(Intersect.OUTSIDE);
            });

        });
    });

    describe('sphere intersection', function() {

        it('can contain a sphere', function() {
            var sphere1 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.25), new Cartesian3(0, 0, -1.75)]);
            expect(camera.getVisibility(sphere1)).toEqual(Intersect.INSIDE);
        });

        describe('can partially contain a sphere', function() {

            it('on the far plane', function() {
                var sphere2 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 0, -2.5)]);
                expect(camera.getVisibility(sphere2)).toEqual(Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var sphere3 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.5), new Cartesian3(0, 0, -1.5)]);
                expect(camera.getVisibility(sphere3)).toEqual(Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var sphere4 = BoundingSphere.fromPoints([new Cartesian3(-1.0, 0, -1.5), new Cartesian3(0, 0, -1.5)]);
                expect(camera.getVisibility(sphere4)).toEqual(Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var sphere5 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(1.0, 0, -1.5)]);
                expect(camera.getVisibility(sphere5)).toEqual(Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var sphere6 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 2.0, -1.5)]);
                expect(camera.getVisibility(sphere6)).toEqual(Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var sphere7 = BoundingSphere.fromPoints([new Cartesian3(0, -2.0, -1.5), new Cartesian3(0, 0, -1.5)]);
                expect(camera.getVisibility(sphere7)).toEqual(Intersect.INTERSECTING);
            });
        });

        describe('can not contain a sphere', function() {

            it('past the far plane', function() {
                var sphere8 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -2.25), new Cartesian3(0, 0, -2.75)]);
                expect(camera.getVisibility(sphere8)).toEqual(Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var sphere9 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.25), new Cartesian3(0, 0, -0.5)]);
                expect(camera.getVisibility(sphere9)).toEqual(Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var sphere10 = BoundingSphere.fromPoints([new Cartesian3(-5, 0, -1.25), new Cartesian3(-4.5, 0, -1.75)]);
                expect(camera.getVisibility(sphere10)).toEqual(Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var sphere11 = BoundingSphere.fromPoints([new Cartesian3(4.5, 0, -1.25), new Cartesian3(5, 0, -1.75)]);
                expect(camera.getVisibility(sphere11)).toEqual(Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var sphere12 = BoundingSphere.fromPoints([new Cartesian3(-0.5, 4.5, -1.25), new Cartesian3(-0.5, 5, -1.25)]);
                expect(camera.getVisibility(sphere12)).toEqual(Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var sphere13 = BoundingSphere.fromPoints([new Cartesian3(-0.5, -4.5, -1.25), new Cartesian3(-0.5, -5, -1.25)]);
                expect(camera.getVisibility(sphere13)).toEqual(Intersect.OUTSIDE);
            });
        });
    });
});
