/*global defineSuite*/
defineSuite([
         'Core/BoundingRectangle',
         'Core/Cartesian2',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Extent',
         'Core/Intersect'
     ], function(
         BoundingRectangle,
         Cartesian2,
         Ellipsoid,
         EquidistantCylindricalProjection,
         Extent,
         Intersect) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        expect(rect.x).toEqual(1.0);
        expect(rect.y).toEqual(2.0);
        expect(rect.width).toEqual(3.0);
        expect(rect.height).toEqual(4.0);
    });

    it('clone without a result parameter', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        var result = rect.clone();
        expect(rect).toNotBe(result);
        expect(rect).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        var result = new BoundingRectangle(1.0, 2.0, 3.0, 5.0);
        var returnedResult = rect.clone(result);
        expect(rect).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(rect).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        var returnedResult = rect.clone(rect);
        expect(rect).toBe(returnedResult);
    });

    it('equals', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        expect(rect.equals(new BoundingRectangle(1.0, 2.0, 3.0, 4.0))).toEqual(true);
        expect(rect.equals(new BoundingRectangle(2.0, 2.0, 2.0, 2.0))).toEqual(false);
        expect(rect.equals(new BoundingRectangle(4.0, 3.0, 2.0, 1.0))).toEqual(false);
        expect(rect.equals(undefined)).toEqual(false);
    });

    it('throws an exception when creating an axis aligned bounding rectangle without any positions', function() {
        expect(function() {
            return BoundingRectangle.fromPoints();
        }).toThrow();
    });

    it('throws an exception creating an axis aligned bounding rectangle with positions of length one', function() {
        expect(function() {
            return BoundingRectangle.fromPoints([ Cartesian2.ZERO ]);
        }).toThrow();
    });

    it('create axis aligned bounding rectangle', function() {
        var positions = [
             new Cartesian2(3, -1),
             new Cartesian2(2, -2),
             new Cartesian2(1, -3),
             new Cartesian2(0, 0),
             new Cartesian2(-1, 1),
             new Cartesian2(-2, 2),
             new Cartesian2(-3, 3)
         ];
        var rectangle = BoundingRectangle.fromPoints(positions);
        expect(rectangle.x).toEqual(-3);
        expect(rectangle.y).toEqual(-3);
        expect(rectangle.width).toEqual(6);
        expect(rectangle.height).toEqual(6);
    });

    it('create a bounding rectangle from an extent throws without an extent', function() {
        expect(function() {
            return BoundingRectangle.fromExtent();
        }).toThrow();
    });

    it('create a bounding rectangle from an extent', function() {
        var extent = Extent.MAX_VALUE;
        var projection = new EquidistantCylindricalProjection(Ellipsoid.UNIT_SPHERE);
        var expected = new BoundingRectangle(extent.west, extent.south, extent.east - extent.west, extent.north - extent.south);
        expect(BoundingRectangle.fromExtent(extent, projection)).toEqual(expected);
    });

    it('intersect throws with rect1', function() {
        expect(function() {
            BoundingRectangle.intersect();
        }).toThrow();
    });

    it('intersect throws with rect2', function() {
        expect(function() {
            BoundingRectangle.intersect(new BoundingRectangle(1.0, 2.0, 3.0, 4.0));
        }).toThrow();
    });

    it('intersect', function() {
        var rect1 = new BoundingRectangle(0, 0, 4, 4);
        var rect2 = new BoundingRectangle(2, 2, 4, 4);
        var rect3 = new BoundingRectangle(5, 5, 4, 4);
        expect(BoundingRectangle.intersect(rect1, rect2)).toEqual(Intersect.INTERSECTING);
        expect(BoundingRectangle.intersect(rect1, rect3)).toEqual(Intersect.OUTSIDE);
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            BoundingRectangle.clone();
        }).toThrow();
    });

    it('union throws without a rectangle', function() {
        expect(function() {
            var rect = new Rectangle(1.0, 2.0, 3.0, 4.0);
            return rect.union();
        }).toThrow();
    });

    it('expands to contain a another rectangle', function() {
        var rect1 = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
        var rect2 = new BoundingRectangle(-2.0, 0.0, 1.0, 2.0);
        var expected = new BoundingRectangle(-2.0, 0.0, 5.0, 2.0);
        expect(rect1.union(rect2)).toEqual(expected);
    });

    it('expands to contain a another point', function() {
        var rect = new BoundingRectangle(2.0, 0.0, 1.0, 1.0);
        var point = Cartesian2.ZERO;
        var expected = new BoundingRectangle(0.0, 0.0, 3.0, 1.0);
        expect(rect.expand(point)).toEqual(expected);
    });
});
