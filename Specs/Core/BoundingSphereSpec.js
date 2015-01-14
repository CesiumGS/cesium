/*global defineSuite*/
defineSuite([
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Intersect',
        'Core/Interval',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Specs/createPackableSpecs'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Ellipsoid,
        GeographicProjection,
        Intersect,
        Interval,
        CesiumMath,
        Matrix4,
        Rectangle,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var positionsRadius = 1.0;
    var positionsCenter = new Cartesian3(10000001.0, 0.0, 0.0);

    var center = new Cartesian3(10000000.0, 0.0, 0.0);

    function getPositions() {
        return [
                Cartesian3.add(center, new Cartesian3(1, 0, 0), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(2, 0, 0), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(0, 0, 0), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(1, 1, 0), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(1, -1, 0), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(1, 0, 1), new Cartesian3()),
                Cartesian3.add(center, new Cartesian3(1, 0, -1), new Cartesian3())
            ];
    }

    function getPositionsAsFlatArray() {
        var positions = getPositions();
        var result = [];
        for (var i = 0; i < positions.length; ++i) {
            result.push(positions[i].x);
            result.push(positions[i].y);
            result.push(positions[i].z);
        }
        return result;
    }

    function getPositionsAsFlatArrayWithStride5() {
        var positions = getPositions();
        var result = [];
        for (var i = 0; i < positions.length; ++i) {
            result.push(positions[i].x);
            result.push(positions[i].y);
            result.push(positions[i].z);
            result.push(1.23);
            result.push(4.56);
        }
        return result;
    }

    it('default constructing produces expected values', function() {
        var sphere = new BoundingSphere();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('constructor sets expected values', function() {
        var expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
        var expectedRadius = 1.0;
        var sphere = new BoundingSphere(expectedCenter, expectedRadius);
        expect(sphere.center).toEqual(expectedCenter);
        expect(sphere.radius).toEqual(expectedRadius);
    });

    it('clone without a result parameter', function() {
        var sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
        var result = sphere.clone();
        expect(sphere).toNotBe(result);
        expect(sphere).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
        var result = new BoundingSphere();
        var returnedResult = sphere.clone(result);
        expect(result).toNotBe(sphere);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(sphere);
    });

    it('clone works with "this" result parameter', function() {
        var expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
        var expectedRadius = 1.0;
        var sphere = new BoundingSphere(expectedCenter, expectedRadius);
        var returnedResult = sphere.clone(sphere);
        expect(sphere).toBe(returnedResult);
        expect(sphere.center).toEqual(expectedCenter);
        expect(sphere.radius).toEqual(expectedRadius);
    });

    it('clone clones undefined', function() {
        expect(BoundingSphere.clone(undefined)).toBe(undefined);
    });

    it('equals', function() {
        var sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
        expect(sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0))).toEqual(true);
        expect(sphere.equals(new BoundingSphere(new Cartesian3(5.0, 2.0, 3.0), 4.0))).toEqual(false);
        expect(sphere.equals(new BoundingSphere(new Cartesian3(1.0, 6.0, 3.0), 4.0))).toEqual(false);
        expect(sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 7.0), 4.0))).toEqual(false);
        expect(sphere.equals(new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 8.0))).toEqual(false);
        expect(sphere.equals(undefined)).toEqual(false);
    });

    it('fromPoints without positions returns an empty sphere', function() {
        var sphere = BoundingSphere.fromPoints();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromPoints works with one point', function() {
        var expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
        var sphere = BoundingSphere.fromPoints([expectedCenter]);
        expect(sphere.center).toEqual(expectedCenter);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromPoints computes a center from points', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        expect(sphere.center).toEqual(positionsCenter);
        expect(sphere.radius).toEqual(positionsRadius);
    });

    it('fromPoints contains all points (naive)', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = Cartesian3.add(r, center, new Cartesian3());
        var min = Cartesian3.subtract(center, r, new Cartesian3());

        var positions = getPositions();
        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('fromPoints contains all points (ritter)', function() {
        var positions = getPositions();
        positions.push(new Cartesian3(1, 1, 1), new Cartesian3(2, 2, 2), new Cartesian3(3, 3, 3));
        var sphere = BoundingSphere.fromPoints(positions);
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = Cartesian3.add(r, center, new Cartesian3());
        var min = Cartesian3.subtract(center, r, new Cartesian3());

        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('fromVertices without positions returns an empty sphere', function() {
        var sphere = BoundingSphere.fromVertices();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromVertices works with one point', function() {
        var expectedCenter = new Cartesian3(1.0, 2.0, 3.0);
        var sphere = BoundingSphere.fromVertices([expectedCenter.x, expectedCenter.y, expectedCenter.z]);
        expect(sphere.center).toEqual(expectedCenter);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromVertices computes a center from points', function() {
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArray());
        expect(sphere.center).toEqual(positionsCenter);
        expect(sphere.radius).toEqual(positionsRadius);
    });

    it('fromVertices contains all points (naive)', function() {
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArray());
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = Cartesian3.add(r, center, new Cartesian3());
        var min = Cartesian3.subtract(center, r, new Cartesian3());

        var positions = getPositions();
        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i++) {
            var currentPos = positions[i];
            expect(currentPos.x <= max.x && currentPos.x >= min.x).toEqual(true);
            expect(currentPos.y <= max.y && currentPos.y >= min.y).toEqual(true);
            expect(currentPos.z <= max.z && currentPos.z >= min.z).toEqual(true);
        }
    });

    it('fromVertices contains all points (ritter)', function() {
        var positions = getPositionsAsFlatArray();
        positions.push(1, 1, 1,  2, 2, 2,  3, 3, 3);
        var sphere = BoundingSphere.fromVertices(positions);
        var radius = sphere.radius;
        var center = sphere.center;

        var r = new Cartesian3(radius, radius, radius);
        var max = Cartesian3.add(r, center, new Cartesian3());
        var min = Cartesian3.subtract(center, r, new Cartesian3());

        var numElements = positions.length;
        for (var i = 0; i < numElements; i += 3) {
            expect(positions[i] <= max.x && positions[i] >= min.x).toEqual(true);
            expect(positions[i + 1] <= max.y && positions[i + 1] >= min.y).toEqual(true);
            expect(positions[i + 2] <= max.z && positions[i + 2] >= min.z).toEqual(true);
        }
    });

    it('fromVertices works with a stride of 5', function() {
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArrayWithStride5(), undefined, 5);
        expect(sphere.center).toEqual(positionsCenter);
        expect(sphere.radius).toEqual(positionsRadius);
    });

    it('fromVertices works with defined center', function() {
        var center = new Cartesian3(1.0, 2.0, 3.0);
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArrayWithStride5(), center, 5);
        expect(sphere.center).toEqual(Cartesian3.add(positionsCenter, center, new Cartesian3()));
        expect(sphere.radius).toEqual(positionsRadius);
    });

    it('fromVertices requires a stride of at least 3', function() {
        function callWithStrideOf2() {
            BoundingSphere.fromVertices(getPositionsAsFlatArray(), undefined, 2);
        }
        expect(callWithStrideOf2).toThrowDeveloperError();
    });

    it('fromVertices fills result parameter if specified', function() {
        var center = new Cartesian3(1.0, 2.0, 3.0);
        var result = new BoundingSphere();
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArrayWithStride5(), center, 5, result);
        expect(sphere).toEqual(result);
        expect(result.center).toEqual(Cartesian3.add(positionsCenter, center, new Cartesian3()));
        expect(result.radius).toEqual(positionsRadius);
    });

    it('fromRectangle2D creates an empty sphere if no rectangle provided', function() {
        var sphere = BoundingSphere.fromRectangle2D();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromRectangle2D', function() {
        var rectangle = Rectangle.MAX_VALUE;
        var projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
        var expected = new BoundingSphere(Cartesian3.ZERO, Math.sqrt(rectangle.east * rectangle.east + rectangle.north * rectangle.north));
        expect(BoundingSphere.fromRectangle2D(rectangle, projection)).toEqual(expected);
    });

    it('fromRectangle3D creates an empty sphere if no rectangle provided', function() {
        var sphere = BoundingSphere.fromRectangle3D();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromRectangle3D', function() {
        var rectangle = Rectangle.MAX_VALUE;
        var ellipsoid = Ellipsoid.WGS84;
        var expected = new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius);
        expect(BoundingSphere.fromRectangle3D(rectangle, ellipsoid)).toEqual(expected);
    });

    it('fromRectangle3D with height', function() {
        var rectangle = new Rectangle(0.1, -0.3, 0.2, -0.4);
        var height = 100000.0;
        var ellipsoid = Ellipsoid.WGS84;
        var points = Rectangle.subsample(rectangle, ellipsoid, height);
        var expected = BoundingSphere.fromPoints(points);
        expect(BoundingSphere.fromRectangle3D(rectangle, ellipsoid, height)).toEqual(expected);
    });

    it('fromCornerPoints', function() {
        var sphere = BoundingSphere.fromCornerPoints(new Cartesian3(-1.0, -0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0));
        expect(sphere).toEqual(new BoundingSphere(Cartesian3.ZERO, 1.0));
    });

    it('fromCornerPoints with a result parameter', function() {
        var sphere = new BoundingSphere();
        var result = BoundingSphere.fromCornerPoints(new Cartesian3(0.0, -1.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), sphere);
        expect(result).toBe(sphere);
        expect(result).toEqual(new BoundingSphere(Cartesian3.ZERO, 1.0));
    });

    it('fromCornerPoints throws without corner', function() {
        expect(function() {
            BoundingSphere.fromCornerPoints();
        }).toThrowDeveloperError();
    });

    it('fromCornerPoints throws without oppositeCorner', function() {
        expect(function() {
            BoundingSphere.fromCornerPoints(Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('fromEllipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sphere = BoundingSphere.fromEllipsoid(ellipsoid);
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(ellipsoid.maximumRadius);
    });

    it('fromEllipsoid with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sphere = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0);
        var result = BoundingSphere.fromEllipsoid(ellipsoid, sphere);
        expect(result).toBe(sphere);
        expect(result).toEqual(new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius));
    });

    it('fromEllipsoid throws without ellipsoid', function() {
        expect(function() {
            BoundingSphere.fromEllipsoid();
        }).toThrowDeveloperError();
    });

    it('fromBoundingSpheres with undefined returns an empty sphere', function() {
        var sphere = BoundingSphere.fromBoundingSpheres();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromBoundingSpheres with empty array returns an empty sphere', function() {
        var sphere = BoundingSphere.fromBoundingSpheres([]);
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromBoundingSpheres works with 1 sphere', function() {
        var one = new BoundingSphere(new Cartesian3(1, 2, 3), 4);

        var sphere = BoundingSphere.fromBoundingSpheres([one]);
        expect(sphere).toEqual(one);
    });

    it('fromBoundingSpheres works with 2 spheres', function() {
        var one = new BoundingSphere(new Cartesian3(1, 2, 3), 4);
        var two = new BoundingSphere(new Cartesian3(5, 6, 7), 8);

        var sphere = BoundingSphere.fromBoundingSpheres([one, two]);
        expect(sphere).toEqual(BoundingSphere.union(one, two, new BoundingSphere()));
    });

    it('fromBoundingSpheres works with 3 spheres', function() {
        var one = new BoundingSphere(new Cartesian3(0, 0, 0), 1);
        var two = new BoundingSphere(new Cartesian3(0, 3, 0), 1);
        var three = new BoundingSphere(new Cartesian3(0, 0, 4), 1);

        var expected = new BoundingSphere(new Cartesian3(0.0, 1.5, 2.0), 3.5);
        var sphere = BoundingSphere.fromBoundingSpheres([one, two, three]);
        expect(sphere).toEqual(expected);
    });

    it('sphere on the positive side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INSIDE);
    });

    it('sphere on the negative side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(sphere.intersect(plane)).toEqual(Intersect.OUTSIDE);
    });

    it('sphere intersecting a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.UNIT_X, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INTERSECTING);
    });

    it('expands to contain another sphere', function() {
        var bs1 = new BoundingSphere(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), 1.0);
        var bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
        var expected = new BoundingSphere(Cartesian3.ZERO, 2.0);
        expect(BoundingSphere.union(bs1, bs2)).toEqual(expected);
    });

    it('union result parameter is caller', function() {
        var bs1 = new BoundingSphere(Cartesian3.multiplyByScalar(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), 3.0, new Cartesian3()), 3.0);
        var bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
        var expected = new BoundingSphere(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), 5.0);
        BoundingSphere.union(bs1, bs2, bs1);
        expect(bs1).toEqual(expected);
    });

    it('expands to contain another point', function() {
        var bs = new BoundingSphere(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), 1.0);
        var point = Cartesian3.UNIT_X;
        var expected = new BoundingSphere(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), 2.0);
        expect(BoundingSphere.expand(bs, point)).toEqual(expected);
    });

    it('applies transform', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var transform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
        var expected = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 1.0);
        expect(BoundingSphere.transform(bs, transform)).toEqual(expected);
    });

    it('applies scale transform', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var transform = Matrix4.fromScale(new Cartesian3(1.0, 2.0, 3.0));
        var expected = new BoundingSphere(Cartesian3.ZERO, 3.0);
        expect(BoundingSphere.transform(bs, transform)).toEqual(expected);
    });

    it('applies transform without scale', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var transform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
        var expected = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 1.0);
        expect(BoundingSphere.transformWithoutScale(bs, transform)).toEqual(expected);
    });

    it('transformWithoutScale ignores scale', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var transform = Matrix4.fromScale(new Cartesian3(1.0, 2.0, 3.0));
        var expected = new BoundingSphere(Cartesian3.ZERO, 1.0);
        expect(BoundingSphere.transformWithoutScale(bs, transform)).toEqual(expected);
    });

    it('finds distances', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var position = new Cartesian3(-2.0, 1.0, 0.0);
        var direction = Cartesian3.UNIT_X;
        var expected = new Interval(1.0, 3.0);
        expect(BoundingSphere.computePlaneDistances(bs, position, direction)).toEqual(expected);
    });

    it('estimated distance squared to point', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var position = new Cartesian3(-2.0, 1.0, 0.0);
        var expected = Cartesian3.magnitudeSquared(position) - 1.0;
        expect(BoundingSphere.distanceSquaredTo(bs, position)).toEqual(expected);
    });

    it('projectTo2D', function() {
        var positions = getPositions();
        var projection = new GeographicProjection();

        var positions2D = [];
        for (var i = 0; i < positions.length; ++i) {
            var position = positions[i];
            var cartographic = projection.ellipsoid.cartesianToCartographic(position);
            positions2D.push(projection.project(cartographic));
        }

        var boundingSphere3D = BoundingSphere.fromPoints(positions);
        var boundingSphere2D = BoundingSphere.projectTo2D(boundingSphere3D, projection);
        var actualSphere = BoundingSphere.fromPoints(positions2D);
        actualSphere.center = new Cartesian3(actualSphere.center.z, actualSphere.center.x, actualSphere.center.y);

        expect(boundingSphere2D.center).toEqualEpsilon(actualSphere.center, CesiumMath.EPSILON6);
        expect(boundingSphere2D.radius).toBeGreaterThan(actualSphere.radius);
    });

    it('projectTo2D with result parameter', function() {
        var positions = getPositions();
        var projection = new GeographicProjection();
        var sphere = new BoundingSphere();

        var positions2D = [];
        for (var i = 0; i < positions.length; ++i) {
            var position = positions[i];
            var cartographic = projection.ellipsoid.cartesianToCartographic(position);
            positions2D.push(projection.project(cartographic));
        }

        var boundingSphere3D = BoundingSphere.fromPoints(positions);
        var boundingSphere2D = BoundingSphere.projectTo2D(boundingSphere3D, projection, sphere);
        var actualSphere = BoundingSphere.fromPoints(positions2D);
        actualSphere.center = new Cartesian3(actualSphere.center.z, actualSphere.center.x, actualSphere.center.y);

        expect(boundingSphere2D).toBe(sphere);
        expect(boundingSphere2D.center).toEqualEpsilon(actualSphere.center, CesiumMath.EPSILON6);
        expect(boundingSphere2D.radius).toBeGreaterThan(actualSphere.radius);
    });

    it('can pack and unpack', function() {
        var array = [];
        var boundingSphere = new BoundingSphere();
        boundingSphere.center = new Cartesian3(1, 2, 3);
        boundingSphere.radius = 4;
        BoundingSphere.pack(boundingSphere, array);
        expect(array.length).toEqual(BoundingSphere.packedLength);
        expect(BoundingSphere.unpack(array)).toEqual(boundingSphere);
    });

    it('can pack and unpack with offset', function() {
        var packed = new Array(3);
        var offset = 3;
        var boundingSphere = new BoundingSphere();
        boundingSphere.center = new Cartesian3(1, 2, 3);
        boundingSphere.radius = 4;

        BoundingSphere.pack(boundingSphere, packed, offset);
        expect(packed.length).toEqual(offset + BoundingSphere.packedLength);

        var result = new BoundingSphere();
        var returnedResult = BoundingSphere.unpack(packed, offset, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(boundingSphere);
    });

    it('pack throws with undefined boundingSphere', function() {
        var array = [];
        expect(function() {
            BoundingSphere.pack(undefined, array);
        }).toThrowDeveloperError();
    });

    it('pack throws with undefined array', function() {
        var boundingSphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.pack(boundingSphere, undefined);
        }).toThrowDeveloperError();
    });

    it('unpack throws with undefined array', function() {
        expect(function() {
            BoundingSphere.unpack(undefined);
        }).toThrowDeveloperError();
    });

    it('static projectTo2D throws without sphere', function() {
        expect(function() {
            BoundingSphere.projectTo2D();
        }).toThrowDeveloperError();
    });

    it('clone returns undefined with no parameter', function() {
        expect(BoundingSphere.clone()).toBeUndefined();
    });

    it('union throws with no left parameter', function() {
        var right = new BoundingSphere();
        expect(function() {
            BoundingSphere.union(undefined, right);
        }).toThrowDeveloperError();
    });

    it('union throws with no right parameter', function() {
        var left = new BoundingSphere();
        expect(function() {
            BoundingSphere.union(left, undefined);
        }).toThrowDeveloperError();
    });

    it('expand throws without a sphere', function() {
        var plane = new Cartesian3();
        expect(function() {
            BoundingSphere.expand(undefined, plane);
        }).toThrowDeveloperError();
    });

    it('expand throws without a point', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.expand(sphere, undefined);
        }).toThrowDeveloperError();
    });

    it('intersect throws without a sphere', function() {
        var plane = new Cartesian4();
        expect(function() {
            BoundingSphere.intersect(undefined, plane);
        }).toThrowDeveloperError();
    });

    it('intersect throws without a plane', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.intersect(sphere, undefined);
        }).toThrowDeveloperError();
    });

    it('transform throws without a sphere', function() {
        expect(function() {
            BoundingSphere.transform();
        }).toThrowDeveloperError();
    });

    it('transform throws without a transform', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.transform(sphere);
        }).toThrowDeveloperError();
    });

    it('distanceSquaredTo throws without a sphere', function() {
        expect(function() {
            BoundingSphere.distanceSquaredTo();
        }).toThrowDeveloperError();
    });

    it('distanceSquaredTo throws without a cartesian', function() {
        expect(function() {
            BoundingSphere.distanceSquaredTo(new BoundingSphere());
        }).toThrowDeveloperError();
    });

    it('transformWithoutScale throws without a sphere', function() {
        expect(function() {
            BoundingSphere.transformWithoutScale();
        }).toThrowDeveloperError();
    });

    it('transformWithoutScale throws without a transform', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.transformWithoutScale(sphere);
        }).toThrowDeveloperError();
    });

    it('computePlaneDistances throws without a sphere', function() {
        expect(function() {
            BoundingSphere.computePlaneDistances();
        }).toThrowDeveloperError();
    });

    it('computePlaneDistances throws without a position', function() {
        expect(function() {
            BoundingSphere.computePlaneDistances(new BoundingSphere());
        }).toThrowDeveloperError();
    });

    it('computePlaneDistances throws without a direction', function() {
        expect(function() {
            BoundingSphere.computePlaneDistances(new BoundingSphere(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    function expectBoundingSphereToContainPoint(boundingSphere, point, projection) {
        var pointInCartesian = projection.project(point);
        var distanceFromCenter = Cartesian3.magnitude(Cartesian3.subtract(pointInCartesian, boundingSphere.center, new Cartesian3()));

        // The distanceFromCenter for corner points at the height extreme should equal the
        // bounding sphere's radius.  But due to rounding errors it can end up being
        // very slightly greater.  Pull in the distanceFromCenter slightly to
        // account for this possibility.
        distanceFromCenter -= CesiumMath.EPSILON9;

        expect(distanceFromCenter).toBeLessThanOrEqualTo(boundingSphere.radius);
    }

    it('fromRectangleWithHeights2D includes specified min and max heights', function() {
        var rectangle = new Rectangle(0.1, 0.5, 0.2, 0.6);
        var projection = new GeographicProjection();
        var minHeight = -327.0;
        var maxHeight = 2456.0;
        var boundingSphere = BoundingSphere.fromRectangleWithHeights2D(rectangle, projection, minHeight, maxHeight);

        // Test that the corners are inside the bounding sphere.
        var point = Rectangle.southwest(rectangle).clone();
        point.height = minHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.southwest(rectangle).clone();
        point.height = maxHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.northeast(rectangle).clone();
        point.height = minHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.northeast(rectangle).clone();
        point.height = maxHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.southeast(rectangle).clone();
        point.height = minHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.southeast(rectangle).clone();
        point.height = maxHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.northwest(rectangle).clone();
        point.height = minHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.northwest(rectangle).clone();
        point.height = maxHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        // Test that the center is inside the bounding sphere
        point = Rectangle.center(rectangle).clone();
        point.height = minHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = Rectangle.center(rectangle).clone();
        point.height = maxHeight;
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        // Test that the edge midpoints are inside the bounding sphere.
        point = new Cartographic(Rectangle.center(rectangle).longitude, rectangle.south, minHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(Rectangle.center(rectangle).longitude, rectangle.south, maxHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(Rectangle.center(rectangle).longitude, rectangle.north, minHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(Rectangle.center(rectangle).longitude, rectangle.north, maxHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(rectangle.west, Rectangle.center(rectangle).latitude, minHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(rectangle.west, Rectangle.center(rectangle).latitude, maxHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(rectangle.east, Rectangle.center(rectangle).latitude, minHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);

        point = new Cartographic(rectangle.east, Rectangle.center(rectangle).latitude, maxHeight);
        expectBoundingSphereToContainPoint(boundingSphere, point, projection);
    });

    createPackableSpecs(BoundingSphere, new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 4.0), [1.0, 2.0, 3.0, 4.0]);
});
