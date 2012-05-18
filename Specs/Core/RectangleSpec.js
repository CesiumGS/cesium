/*global defineSuite*/
defineSuite(['Core/Rectangle'], function(Rectangle) {
    "use strict";
    /*global it,expect*/

    it("default constructs", function() {
        var r = new Rectangle();
        expect(r.x).toEqual(0.0);
        expect(r.y).toEqual(0.0);
        expect(r.width).toEqual(0.0);
        expect(r.height).toEqual(0.0);
    });

    it("constructs", function() {
        var r = new Rectangle(1.0, 2.0, 3.0, 4.0);
        expect(r.x).toEqual(1.0);
        expect(r.y).toEqual(2.0);
        expect(r.width).toEqual(3.0);
        expect(r.height).toEqual(4.0);
    });

    it("clones", function() {
        var r = new Rectangle(1.0, 2.0, 3.0, 4.0);
        var r2 = r.clone();
        r.x = 0.0;

        expect(r.x).toEqual(0.0);
        expect(r2.x).toEqual(1.0);
    });

    it("equals (1)", function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equals(new Rectangle(1.0, 2.0, 3.0, 4.0))).toBeTruthy();
    });

    it("equals (2)", function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equals(new Rectangle(1.0, 2.0, 3.0, 0.0))).toBeFalsy();
    });

    it("equalsEpsilon", function() {
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(1.0, 2.0, 3.0, 4.0), 0.0)).toBeTruthy();
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(2.0, 2.0, 3.0, 4.0), 1.0)).toBeTruthy();
        expect(new Rectangle(1.0, 2.0, 3.0, 4.0).equalsEpsilon(new Rectangle(3.0, 2.0, 3.0, 4.0), 1.0)).toBeFalsy();
    });

    it("converts to a string", function() {
        var r = new Rectangle(1, 2, 3, 4);
        expect(r.toString()).toEqual("(1, 2, 3, 4)");
    });

    it("rectangleRectangleIntersect", function() {
        var rect1 = new Rectangle(0, 0, 4, 4);
        var rect2 = new Rectangle(2, 2, 4, 4);
        var rect3 = new Rectangle(5, 5, 4, 4);
        expect(Rectangle.rectangleRectangleIntersect(rect1, rect2)).toBeTruthy();
        expect(Rectangle.rectangleRectangleIntersect(rect1, rect3)).toBeFalsy();
    });
});