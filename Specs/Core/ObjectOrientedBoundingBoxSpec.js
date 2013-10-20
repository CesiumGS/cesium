/*global defineSuite*/
defineSuite([
         'Core/ObjectOrientedBoundingBox',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix3',
         'Core/Intersect',
         'Core/BoundingRectangle'
     ], function(
         ObjectOrientedBoundingBox,
         Cartesian3,
         Cartesian4,
         Matrix3,
         Intersect,
         BoundingRectangle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    //Axis aligned cube
    var positions1 = [
                     new Cartesian3(0, 0, 0),
                     new Cartesian3(1, 0, 0),
                     new Cartesian3(0, 1, 0),
                     new Cartesian3(1, 1, 0),
                     new Cartesian3(0, 0, 1),
                     new Cartesian3(1, 0, 1),
                     new Cartesian3(0, 1, 1),
                     new Cartesian3(1, 1, 1)
                 ];

    //Rotated cube
    var positions2 = [
                      new Cartesian3(1, 1, 0),
                      new Cartesian3(0, 0, 0),
                      new Cartesian3(-1, 1, 0),
                      new Cartesian3(0, 2, 0),
                      new Cartesian3(1, 1, 1),
                      new Cartesian3(0, 0, 1),
                      new Cartesian3(-1, 1, 1),
                      new Cartesian3(0, 2, 1)
                  ];
    //Half circle
    var positions3 = [
                      new Cartesian3(1, 0, 0),
                      new Cartesian3(0.5, 0.866, 0),
                      new Cartesian3(0.25, 0.968, 0),
                      new Cartesian3(0.75, 0.661, 0),
                      new Cartesian3(0, 1, 0),
                      new Cartesian3(-0.5, 0.866, 0),
                      new Cartesian3(-0.25, 0.968, 0),
                      new Cartesian3(-0.75, 0.661, 0),
                      new Cartesian3(-1, 0, 0)
                  ]; //TODO
    //Rotated cube + 1 point
    var positions4 = [
                      new Cartesian3(0, 0, 0),
                      new Cartesian3(0.5, -0.146, 0.854),
                      new Cartesian3(0.5, 0.854, -0.146),
                      new Cartesian3(1, 0.708, 0.708),
                      new Cartesian3(-0.707, 0.5, 0.5),
                      new Cartesian3(-0.207, 0.354, 1.354),
                      new Cartesian3(-0.207, 1.354, 0.354),
                      new Cartesian3(0.293, 1.208, 1.208),
                      //+1
                      new Cartesian3(5, 0, 0)
                  ]; //TODO

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
        var transformMatrix = new Matrix3(1,0,0,0,1,0,0,0,1);
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
        expect(result).toEqual(box);//TODO
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
