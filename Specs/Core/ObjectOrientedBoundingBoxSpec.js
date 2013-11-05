/*global defineSuite*/
defineSuite(['Core/ObjectOrientedBoundingBox', 'Core/Cartesian3', 'Core/Cartesian4', 'Core/Matrix3', 'Core/Intersect', 'Core/BoundingRectangle'], function(ObjectOrientedBoundingBox, Cartesian3, Cartesian4, Matrix3, Intersect, BoundingRectangle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    //Axis aligned cube
    var positions1 = [new Cartesian3(0, 0, 0), new Cartesian3(1, 0, 0), new Cartesian3(0, 1, 0), new Cartesian3(1, 1, 0), new Cartesian3(0, 0, 1), new Cartesian3(1, 0, 1), new Cartesian3(0, 1, 1), new Cartesian3(1, 1, 1)];
    //Rotated cube
    var positions2 = [new Cartesian3(1, 1, 0), new Cartesian3(0, 0, 0), new Cartesian3(-1, 1, 0), new Cartesian3(0, 2, 0), new Cartesian3(1, 1, 1), new Cartesian3(0, 0, 1), new Cartesian3(-1, 1, 1), new Cartesian3(0, 2, 1)];
    //Half circle
    var positions3 = [new Cartesian3(1, 0, 0), new Cartesian3(0.5, 0.866, 0), new Cartesian3(0.25, 0.968, 0), new Cartesian3(0.75, 0.661, 0), new Cartesian3(0, 1, 0), new Cartesian3(-0.5, 0.866, 0), new Cartesian3(-0.25, 0.968, 0), new Cartesian3(-0.75, 0.661, 0), new Cartesian3(-1, 0, 0)];
    //Axis aligned rectangle
    var positions4 = [new Cartesian3(0, 0, 0), new Cartesian3(2, 0, 0), new Cartesian3(0, 2, 0), new Cartesian3(2, 2, 0)];
    //Rotated box shifted to the right
    var positions5 = [new Cartesian3(3, 1, 0), new Cartesian3(2, 0, 0), new Cartesian3(1, 1, 0), new Cartesian3(2, 2, 0), new Cartesian3(3, 1, 1), new Cartesian3(2, 0, 1), new Cartesian3(1, 1, 1), new Cartesian3(2, 2, 1)];
    //Rotated box  to the right + 0.01
    var positions6 = [new Cartesian3(3, 1, 0), new Cartesian3(2, 0, 0), new Cartesian3(1.01, 1, 0), new Cartesian3(2, 2, 0), new Cartesian3(3, 1, 1), new Cartesian3(2, 0, 1), new Cartesian3(1.01, 1, 1), new Cartesian3(2, 2, 1)];

    it('fromPoints constructs empty box with undefined positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(undefined);
        expect(box.transformMatrix).toEqual(Matrix3.IDENTITY);
        expect(box.transformedPosition).toEqual(Cartesian3.ZERO);
        expect(box.extent).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints constructs empty box with empty positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints([]);
        expect(box.transformMatrix).toEqual(Matrix3.IDENTITY);
        expect(box.transformedPosition).toEqual(Cartesian3.ZERO);
        expect(box.extent).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints computes the correct values', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(positions1);
        var extent = new Cartesian3(0.5, 0.5, 0.5);
        var transformedPosition = new Cartesian3(0.5, 0.5, 0.5);
        var transformMatrix = new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1);
        expect(box.extent).toEqual(extent);
        expect(box.transformedPosition).toEqual(transformedPosition);
        expect(box.transformMatrix).toEqual(transformMatrix);
    });

    it('fromBoundingRectangle throws without values', function() {
        var boundingRectangle = new BoundingRectangle();
        expect(function() {
            ObjectOrientedBoundingBox.fromBoundingRectangle();
        }).toThrow();
        expect(function() {
            ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle);
        }).toThrow();
    });

    it('fromBoundingRectangle creates an ObjectOrientedBoundingBox without a result parameter', function() {
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(new BoundingRectangle(), 0.0);
        var result = new ObjectOrientedBoundingBox();
        expect(result).toEqual(box);
    });

    it('fromBoundingRectangle computes the correct values', function() {
        var scratchRound = new Cartesian3();
        function roundcomponents(cartesian) {
            scratchRound.x = Math.round(cartesian.x * 10) / 10;
            scratchRound.y = Math.round(cartesian.y * 10) / 10;
            scratchRound.z = Math.round(cartesian.z * 10) / 10;
            return scratchRound;
        }
        var boundingRectangle = new BoundingRectangle();
        boundingRectangle.width = 3.0;
        boundingRectangle.height = 2.0;
        boundingRectangle.y = 1;
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 1.57); //90 degrees
        var boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);

        expect(roundcomponents(boxPoints[0])).toEqual(new Cartesian3(1, -0.5, 0));
        expect(roundcomponents(boxPoints[1])).toEqual(new Cartesian3(1, 2.5, 0));
        expect(roundcomponents(boxPoints[2])).toEqual(new Cartesian3(1, 2.5, 0));
        expect(roundcomponents(boxPoints[3])).toEqual(new Cartesian3(1, -0.5, 0));
        expect(roundcomponents(boxPoints[4])).toEqual(new Cartesian3(-1, -0.5, 0));
        expect(roundcomponents(boxPoints[5])).toEqual(new Cartesian3(-1, 2.5, 0));
        expect(roundcomponents(boxPoints[6])).toEqual(new Cartesian3(-1, 2.5, 0));
        expect(roundcomponents(boxPoints[7])).toEqual(new Cartesian3(-1, -0.5, 0));
    });

    it('getDescribingPoints computes the correct values', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(positions1);
        var boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);

        expect(boxPoints[0]).toEqual(new Cartesian3(0, 0, 0));
        expect(boxPoints[1]).toEqual(new Cartesian3(1, 0, 0));
        expect(boxPoints[2]).toEqual(new Cartesian3(1, 0, 1));
        expect(boxPoints[3]).toEqual(new Cartesian3(0, 0, 1));
        expect(boxPoints[4]).toEqual(new Cartesian3(0, 1, 0));
        expect(boxPoints[5]).toEqual(new Cartesian3(1, 1, 0));
        expect(boxPoints[6]).toEqual(new Cartesian3(1, 1, 1));
        expect(boxPoints[7]).toEqual(new Cartesian3(0, 1, 1));

        box = ObjectOrientedBoundingBox.fromPoints(positions2);
        boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);
        expect(boxPoints[0]).toEqual(new Cartesian3(-1, 0, 0));
        expect(boxPoints[1]).toEqual(new Cartesian3(1, 0, 0));
        expect(boxPoints[2]).toEqual(new Cartesian3(1, 0, 1));
        expect(boxPoints[3]).toEqual(new Cartesian3(-1, 0, 1));
        expect(boxPoints[4]).toEqual(new Cartesian3(-1, 2, 0));
        expect(boxPoints[5]).toEqual(new Cartesian3(1, 2, 0));
        expect(boxPoints[6]).toEqual(new Cartesian3(1, 2, 1));
        expect(boxPoints[7]).toEqual(new Cartesian3(-1, 2, 1));

        box = ObjectOrientedBoundingBox.fromPoints(positions3);
        boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);
        expect(boxPoints[0]).toEqual(new Cartesian3(-1, 0, 0));
        expect(boxPoints[1]).toEqual(new Cartesian3(1, 0, 0));
        expect(boxPoints[2]).toEqual(new Cartesian3(1, 0, 0));
        expect(boxPoints[3]).toEqual(new Cartesian3(-1, 0, 0));
        expect(boxPoints[4]).toEqual(new Cartesian3(-1, 1, 0));
        expect(boxPoints[5]).toEqual(new Cartesian3(1, 1, 0));
        expect(boxPoints[6]).toEqual(new Cartesian3(1, 1, 0));
        expect(boxPoints[7]).toEqual(new Cartesian3(-1, 1, 0));

        box = ObjectOrientedBoundingBox.fromPoints(positions4);
        boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);
        expect(boxPoints[0]).toEqual(new Cartesian3(0, 0, 0));
        expect(boxPoints[1]).toEqual(new Cartesian3(2, 0, 0));
        expect(boxPoints[2]).toEqual(new Cartesian3(2, 0, 0));
        expect(boxPoints[3]).toEqual(new Cartesian3(0, 0, 0));
        expect(boxPoints[4]).toEqual(new Cartesian3(0, 2, 0));
        expect(boxPoints[5]).toEqual(new Cartesian3(2, 2, 0));
        expect(boxPoints[6]).toEqual(new Cartesian3(2, 2, 0));
        expect(boxPoints[7]).toEqual(new Cartesian3(0, 2, 0));
    });

    it('intersect works as espected', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions1);
        var box2 = ObjectOrientedBoundingBox.fromPoints(positions5);
        var box3 = ObjectOrientedBoundingBox.fromPoints(positions6);
        var box4 = ObjectOrientedBoundingBox.fromPoints([new Cartesian3(0, 0, 0.5)]);
        var box5 = ObjectOrientedBoundingBox.fromPoints([new Cartesian3(1, 0, 0.5)]);
        var box6 = ObjectOrientedBoundingBox.fromPoints([new Cartesian3(0, 1, 0.5)]);
        var box7 = ObjectOrientedBoundingBox.fromPoints([new Cartesian3(1, 1, 0.5)]);

        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(true);
        expect(ObjectOrientedBoundingBox.intersect(box1, box3)).toEqual(false);
        expect(ObjectOrientedBoundingBox.intersect(box1, box4)).toEqual(true);
        expect(ObjectOrientedBoundingBox.intersect(box1, box5)).toEqual(true);
        expect(ObjectOrientedBoundingBox.intersect(box1, box6)).toEqual(true);
        expect(ObjectOrientedBoundingBox.intersect(box1, box7)).toEqual(true);
    });

    it('clone without a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = ObjectOrientedBoundingBox.clone(box);
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = new ObjectOrientedBoundingBox();
        var returnedResult = ObjectOrientedBoundingBox.clone(box, result);
        expect(result).toBe(returnedResult);
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('equals works in all cases', function() {
        var box = new ObjectOrientedBoundingBox();
        expect(box.equals(new ObjectOrientedBoundingBox())).toEqual(true);
        expect(box.equals(undefined)).toEqual(false);
    });
});
