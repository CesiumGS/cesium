/*global defineSuite*/
defineSuite([
         'Core/Rectangle',
         'Core/Cartesian2'
     ], function(
         Rectangle,
         Cartesian2) {
    "use strict";
    /*global it,expect*/

    var positions = [
                     new Cartesian2(3, -1),
                     new Cartesian2(2, -2),
                     new Cartesian2(1, -3),
                     new Cartesian2(0, 0),
                     new Cartesian2(-1, 1),
                     new Cartesian2(-2, 2),
                     new Cartesian2(-3, 3)
                 ];

    it('default constructs', function() {
        var r = new Rectangle();
        expect(r.x).toEqual(0.0);
        expect(r.y).toEqual(0.0);
        expect(r.width).toEqual(0.0);
        expect(r.height).toEqual(0.0);
    });

    it('constructs', function() {
        var r = new Rectangle(1.0, 2.0, 3.0, 4.0);
        expect(r.x).toEqual(1.0);
        expect(r.y).toEqual(2.0);
        expect(r.width).toEqual(3.0);
        expect(r.height).toEqual(4.0);
    });

    it('clones', function() {
        var r = new Rectangle(1.0, 2.0, 3.0, 4.0);
        var r2 = r.clone();
        r.x = 0.0;

        expect(r.x).toEqual(0.0);
        expect(r2.x).toEqual(1.0);
    });

    it('equals (1)', function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equals(new Rectangle(1.0, 2.0, 3.0, 4.0))).toEqual(true);
    });

    it('equals (2)', function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equals(new Rectangle(1.0, 2.0, 3.0, 0.0))).toEqual(false);
    });

    it('equalsEpsilon', function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(1.0, 2.0, 3.0, 4.0), 0.0)).toEqual(true);
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(2.0, 2.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(3.0, 2.0, 3.0, 4.0), 1.0)).toEqual(false);
    });

    it('converts to a string', function() {
        var r = new Rectangle(1, 2, 3, 4);
        expect(r.toString()).toEqual('(1, 2, 3, 4)');
    });

    it('rectangleRectangleIntersect', function() {
        var rect1 = new Rectangle(0, 0, 4, 4);
        var rect2 = new Rectangle(2, 2, 4, 4);
        var rect3 = new Rectangle(5, 5, 4, 4);
        expect(Rectangle.rectangleRectangleIntersect(rect1, rect2)).toEqual(true);
        expect(Rectangle.rectangleRectangleIntersect(rect1, rect3)).toEqual(false);
    });

    it('create axis aligned bounding rectangle', function() {
        var rectangle = Rectangle.createAxisAlignedBoundingRectangle(positions);
        expect(rectangle.x).toEqual(-3);
        expect(rectangle.y).toEqual(-3);
        expect(rectangle.width).toEqual(6);
        expect(rectangle.height).toEqual(6);
    });

    it('creates the axis aligned bounding rectangle for a single position', function() {
        var rectangle = Rectangle.createAxisAlignedBoundingRectangle([{
            x : 1,
            y : 2
        }]);

        expect(rectangle.x).toEqual(1);
        expect(rectangle.y).toEqual(2);
        expect(rectangle.width).toEqual(0);
        expect(rectangle.height).toEqual(0);
    });

    it('throws an exception creating an axis aligned bounding rectangle with positions of length zero', function() {
        expect(function() {
            return Rectangle.createAxisAlignedBoundingRectangle([]);
        }).toThrow();
    });

    it('throws an exception when creating an axis aligned bounding rectangle without any positions', function() {
        expect(function() {
            return Rectangle.createAxisAlignedBoundingRectangle(undefined);
        }).toThrow();
    });
});
