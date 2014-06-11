/*global defineSuite*/
defineSuite([
        'Core/Ray',
        'Core/Cartesian3'
    ], function(
        Ray,
        Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor create zero valued Ray', function() {
        var ray = new Ray();
        expect(ray.origin).toEqual(Cartesian3.ZERO);
        expect(ray.direction).toEqual(Cartesian3.ZERO);
    });

    it('constructor sets expected properties', function() {
        var origin = Cartesian3.UNIT_Y;
        var direction = Cartesian3.UNIT_X;
        var ray = new Ray(origin, direction);
        expect(ray.origin).toEqual(origin);
        expect(ray.direction).toEqual(direction);
    });

    it('constructor normalizes direction', function() {
        var origin = Cartesian3.UNIT_Y;
        var direction = Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 18, new Cartesian3());
        var ray = new Ray(origin, direction);
        expect(ray.origin).toEqual(origin);
        expect(ray.direction).toEqual(Cartesian3.UNIT_X);
    });

    it('getPoint along ray works without a result parameter', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1, 2, 3), new Cartesian3());
        var ray = new Ray(Cartesian3.UNIT_X, direction);
        for ( var i = -10; i < 11; i++) {
            var expectedResult = Cartesian3.add(Cartesian3.multiplyByScalar(direction, i, new Cartesian3()), Cartesian3.UNIT_X, new Cartesian3());
            var returnedResult = Ray.getPoint(ray, i);
            expect(returnedResult).toEqual(expectedResult);
        }
    });

    it('getPoint works with a result parameter', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1, 2, 3), new Cartesian3());
        var ray = new Ray(Cartesian3.UNIT_X, direction);
        var result = new Cartesian3();
        for ( var i = -10; i < 11; i++) {
            var expectedResult = Cartesian3.add(Cartesian3.multiplyByScalar(direction, i, new Cartesian3()), Cartesian3.UNIT_X, new Cartesian3());
            var returnedResult = Ray.getPoint(ray, i, result);
            expect(result).toBe(returnedResult);
            expect(returnedResult).toEqual(expectedResult);
        }
    });

    it('getPoint throws without a point', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1, 2, 3), new Cartesian3());
        var ray = new Ray(Cartesian3.UNIT_X, direction);
        expect(function() {
            Ray.getPoint(ray, undefined);
        }).toThrowDeveloperError();
    });
});
