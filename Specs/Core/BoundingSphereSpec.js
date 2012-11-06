/*global defineSuite*/
defineSuite([
         'Core/BoundingSphere',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/Extent',
         'Core/Intersect',
         'Core/Interval',
         'Core/Math',
         'Core/Matrix4'
     ], function(
         BoundingSphere,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Ellipsoid,
         GeographicProjection,
         Extent,
         Intersect,
         Interval,
         CesiumMath,
         Matrix4) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var positionsRadius = 1.0;
    var positionsCenter = new Cartesian3(1.0, 0.0, 0.0);

    function getPositions() {
        return [
                new Cartesian3(1, 0, 0),
                new Cartesian3(2, 0, 0),
                new Cartesian3(0, 0, 0),
                new Cartesian3(1, 1, 0),
                new Cartesian3(1, -1, 0),
                new Cartesian3(1, 0, 1),
                new Cartesian3(1, 0, -1)
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
        var max = r.add(center);
        var min = center.subtract(r);

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
        var max = r.add(center);
        var min = center.subtract(r);

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
        var max = r.add(center);
        var min = center.subtract(r);

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
        var max = r.add(center);
        var min = center.subtract(r);

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
        expect(sphere.center).toEqual(positionsCenter.add(center));
        expect(sphere.radius).toEqual(positionsRadius);
    });

    it('fromVertices requires a stride of at least 3', function() {
        function callWithStrideOf2() {
            BoundingSphere.fromVertices(getPositionsAsFlatArray(), undefined, 2);
        }
        expect(callWithStrideOf2).toThrow();
    });

    it('fromVertices fills result parameter if specified', function() {
        var center = new Cartesian3(1.0, 2.0, 3.0);
        var result = new BoundingSphere();
        var sphere = BoundingSphere.fromVertices(getPositionsAsFlatArrayWithStride5(), center, 5, result);
        expect(sphere).toEqual(result);
        expect(result.center).toEqual(positionsCenter.add(center));
        expect(result.radius).toEqual(positionsRadius);
    });

    it('fromExtent2D creates an empty sphere if no extent provided', function() {
        var sphere = BoundingSphere.fromExtent2D();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromExtent2D', function() {
        var extent = Extent.MAX_VALUE;
        var projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
        var expected = new BoundingSphere(Cartesian3.ZERO, Math.sqrt(extent.east * extent.east + extent.north * extent.north));
        expect(BoundingSphere.fromExtent2D(extent, projection)).toEqual(expected);
    });

    it('fromExtent3D creates an empty sphere if no extent provided', function() {
        var sphere = BoundingSphere.fromExtent3D();
        expect(sphere.center).toEqual(Cartesian3.ZERO);
        expect(sphere.radius).toEqual(0.0);
    });

    it('fromExtent3D', function() {
        var extent = Extent.MAX_VALUE;
        var ellipsoid = Ellipsoid.WGS84;
        var expected = new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMaximumRadius());
        expect(BoundingSphere.fromExtent3D(extent, ellipsoid)).toEqual(expected);
    });

    it('sphere on the positive side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X.negate();
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INSIDE);
    });

    it('sphere on the negative side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.OUTSIDE);
    });

    it('sphere intersecting a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.UNIT_X, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(sphere.intersect(plane)).toEqual(Intersect.INTERSECTING);
    });

    it('expands to contain another sphere', function() {
        var bs1 = new BoundingSphere(Cartesian3.UNIT_X.negate(), 1.0);
        var bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
        var expected = new BoundingSphere(Cartesian3.ZERO, 2.0);
        expect(bs1.union(bs2)).toEqual(expected);
    });

    it('union result parameter is caller', function() {
        var bs1 = new BoundingSphere(Cartesian3.UNIT_X.negate().multiplyByScalar(3.0), 3.0);
        var bs2 = new BoundingSphere(Cartesian3.UNIT_X, 1.0);
        var expected = new BoundingSphere(Cartesian3.UNIT_X.negate(), 5.0);
        bs1.union(bs2, bs1);
        expect(bs1).toEqual(expected);
    });

    it('expands to contain another point', function() {
        var bs = new BoundingSphere(Cartesian3.UNIT_X.negate(), 1.0);
        var point = Cartesian3.UNIT_X;
        var expected = new BoundingSphere(Cartesian3.UNIT_X.negate(), 2.0);
        expect(bs.expand(point)).toEqual(expected);
    });

    it('applies transform', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var transform = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
        var expected = new BoundingSphere(new Cartesian3(1.0, 2.0, 3.0), 1.0);
        expect(bs.transform(transform)).toEqual(expected);
    });

    it('finds distances', function() {
        var bs = new BoundingSphere(Cartesian3.ZERO, 1.0);
        var position = new Cartesian3(-2.0, 1.0, 0.0);
        var direction = Cartesian3.UNIT_X;
        var expected = new Interval(1.0, 3.0);
        expect(bs.getPlaneDistances(position, direction)).toEqual(expected);
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            BoundingSphere.clone();
        }).toThrow();
    });

    it('static union throws with no left parameter', function() {
        var right = new BoundingSphere();
        expect(function() {
            BoundingSphere.union(undefined, right);
        }).toThrow();
    });

    it('static union throws with no right parameter', function() {
        var left = new BoundingSphere();
        expect(function() {
            BoundingSphere.union(left, undefined);
        }).toThrow();
    });

    it('static expand throws without a sphere', function() {
        var plane = new Cartesian3();
        expect(function() {
            BoundingSphere.expand(undefined, plane);
        }).toThrow();
    });

    it('static expand throws without a point', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.expand(sphere, undefined);
        }).toThrow();
    });

    it('static intersect throws without a sphere', function() {
        var plane = new Cartesian4();
        expect(function() {
            BoundingSphere.intersect(undefined, plane);
        }).toThrow();
    });

    it('static intersect throws without a plane', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.intersect(sphere, undefined);
        }).toThrow();
    });

    it('static transform throws without a sphere', function() {
        expect(function() {
            BoundingSphere.transform();
        }).toThrow();
    });

    it('static transform throws without a transform', function() {
        var sphere = new BoundingSphere();
        expect(function() {
            BoundingSphere.transform(sphere);
        }).toThrow();
    });

    it('static getPlaneDistances throws without a sphere', function() {
        expect(function() {
            BoundingSphere.getPlaneDistances();
        }).toThrow();
    });

    it('static getPlaneDistances throws without a position', function() {
        expect(function() {
            BoundingSphere.getPlaneDistances(new BoundingSphere());
        }).toThrow();
    });

    it('static getPlaneDistances throws without a direction', function() {
        expect(function() {
            BoundingSphere.getPlaneDistances(new BoundingSphere(), new Cartesian3());
        }).toThrow();
    });
});
