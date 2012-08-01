/*global defineSuite*/
defineSuite([
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Extent',
         'Core/Intersect',
         'Core/Math'
     ], function(
         BoundingSphere,
         Cartesian3,
         Cartesian4,
         Ellipsoid,
         EquidistantCylindricalProjection,
         Extent,
         Intersect,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function getPositions() {
        return [
                new Cartesian3(0, 0, 0),
                new Cartesian3(1, 0, 0),
                new Cartesian3(-1, 0, 0),
                new Cartesian3(0, 1, 0),
                new Cartesian3(0, -1, 0),
                new Cartesian3(0, 0, 1),
                new Cartesian3(0, 0, -1)
            ];
    }

    it('throws an exception when constructed without a center', function() {
        expect(function() {
            return new BoundingSphere();
        }).toThrow();
    });

    it('throws an exception when constructed without a radius', function() {
        expect(function() {
            return new BoundingSphere(Cartesian3.ZERO);
        }).toThrow();
    });

    it('can be constructed using a point and a radius', function() {
        var sphere = new BoundingSphere(new Cartesian3(0, 0, 0), 1);
        expect(sphere.center.equals(Cartesian3.ZERO)).toEqual(true);
        expect(sphere.radius).toEqual(1);
    });

    it('clone without a result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var result = sphere.clone();
        expect(sphere).toNotBe(result);
        expect(sphere).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var result = new BoundingSphere(Cartesian3.ZERO, 5.0);
        var returnedResult = sphere.clone(result);
        expect(sphere).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(sphere).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 2.0);
        var returnedResult = sphere.clone(sphere);
        expect(sphere).toBe(returnedResult);
    });

    it('throws an exception when constructed with fromPoints without positions', function() {
        expect(function() {
            BoundingSphere.fromPoints();
        }).toThrow();
    });

    it('computes a center from points', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var center = sphere.center;
        expect(center.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)).toEqual(true);
    });

    it('computes a radius from points', function() {
        var sphere = BoundingSphere.fromPoints(getPositions());
        var radius = sphere.radius;
        expect(radius).toEqual(1);
    });

    it('contains all points (naive)', function() {
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

    it('contains all points (ritter)', function() {
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

    it('from extent 2d throws without an extent', function() {
        expect(function() {
            return BoundingSphere.fromExtent2D();
        }).toThrow();
    });

    it('from extent 2d throws without a projection', function() {
        expect(function() {
            return BoundingSphere.fromExtent2D(Extent.MAX_VALUE);
        }).toThrow();
    });

    it('from extent 2d', function() {
        var extent = Extent.MAX_VALUE;
        var projection = new EquidistantCylindricalProjection(Ellipsoid.UNIT_SPHERE);
        var expected = new BoundingSphere(Cartesian3.ZERO, Math.sqrt(extent.east * extent.east + extent.north * extent.north));
        expect(BoundingSphere.fromExtent2D(extent, projection)).toEqual(expected);
    });

    it('from extent morph throws without an extent', function() {
        expect(function() {
            return BoundingSphere.fromExtentMorph();
        }).toThrow();
    });

    it('from extent morph throws without a projection', function() {
        expect(function() {
            return BoundingSphere.fromExtentMorph(Extent.MAX_VALUE);
        }).toThrow();
    });

    it('from extent morph throws without a time', function() {
        expect(function() {
            return BoundingSphere.fromExtentMorph(Extent.MAX_VALUE, new EquidistantCylindricalProjection());
        }).toThrow();
    });

    it('from extent morph', function() {
        var extent = Extent.MAX_VALUE;
        var projection = new EquidistantCylindricalProjection();

        var actual = BoundingSphere.fromExtentMorph(extent, projection, 0.0);
        var expected = BoundingSphere.fromExtent2D(extent, projection);
        expect(actual).toEqual(expected);

        actual = BoundingSphere.fromExtentMorph(extent, projection, 1.0);
        expected = BoundingSphere.fromExtent3D(extent);
        expect(actual).toEqual(expected);
    });

    it('from extent 3d throws without an extent', function() {
        expect(function() {
            return BoundingSphere.fromExtent3D();
        }).toThrow();
    });

    it('from extent 3d', function() {
        var extent = Extent.MAX_VALUE;
        var ellipsoid = Ellipsoid.WGS84;
        var expected = new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMaximumRadius());
        expect(BoundingSphere.fromExtent3D(extent, ellipsoid)).toEqual(expected);
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            BoundingSphere.clone();
        }).toThrow();
    });

    it('planeIntersect throws without a sphere', function() {
        expect(function() {
            BoundingSphere.planeIntersect();
        }).toThrow();
    });

    it('planeIntersect throws without a plane', function() {
        expect(function() {
            BoundingSphere.planeIntersect(new BoundingSphere(Cartesian3.ZERO, 1.0));
        }).toThrow();
    });

    it('sphere on the positive side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X.negate();
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(BoundingSphere.planeIntersect(sphere, plane)).toEqual(Intersect.INSIDE);
    });

    it('sphere on the negative side of a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.ZERO, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(BoundingSphere.planeIntersect(sphere, plane)).toEqual(Intersect.OUTSIDE);
    });

    it('sphere intersecting a plane', function() {
        var sphere = new BoundingSphere(Cartesian3.UNIT_X, 0.5);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(BoundingSphere.planeIntersect(sphere, plane)).toEqual(Intersect.INTERSECTING);
    });
});