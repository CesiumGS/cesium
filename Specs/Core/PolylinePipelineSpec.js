/*global defineSuite*/
defineSuite([
        'Core/PolylinePipeline',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Transforms'
    ], function(
        PolylinePipeline,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        Transforms) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('wrapLongitude', function() {
        var positions = Cartesian3.fromDegreesArray([
            -75.163789, 39.952335,
            -80.2264393, 25.7889689
        ]);
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(1);
        expect(segments.lengths[0]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments', function() {
        var positions = Cartesian3.fromDegreesArray([
            -179.0, 39.0,
            2.0, 25.0
        ]);
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(2);
        expect(segments.lengths[0]).toEqual(2);
        expect(segments.lengths[1]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments with model matrix', function() {
        var center = Cartesian3.fromDegrees(-179.0, 39.0);
        var matrix = Transforms.eastNorthUpToFixedFrame(center, Ellipsoid.WGS84);

        var positions = [ new Cartesian3(0.0, 0.0, 0.0),
                          new Cartesian3(0.0, 100000000.0, 0.0)];
        var segments = PolylinePipeline.wrapLongitude(positions, matrix);
        expect(segments.lengths.length).toEqual(2);
        expect(segments.lengths[0]).toEqual(2);
        expect(segments.lengths[1]).toEqual(2);
    });

    it('removeDuplicates to return one positions', function() {
        var positions = [Cartesian3.ZERO];
        var nonDuplicatePositions = PolylinePipeline.removeDuplicates(positions);
        expect(nonDuplicatePositions).not.toBe(positions);
        expect(nonDuplicatePositions).toEqual(positions);
    });

    it('removeDuplicates to remove duplicates', function() {
        var positions = [
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(2.0, 2.0, 2.0),
            new Cartesian3(3.0, 3.0, 3.0),
            new Cartesian3(3.0, 3.0, 3.0)];
        var expectedPositions = [
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(2.0, 2.0, 2.0),
            new Cartesian3(3.0, 3.0, 3.0)];
        var nonDuplicatePositions = PolylinePipeline.removeDuplicates(positions);
        expect(nonDuplicatePositions).not.toBe(expectedPositions);
        expect(nonDuplicatePositions).toEqual(expectedPositions);
    });

    it('removeDuplicates throws without positions', function() {
        expect(function() {
            PolylinePipeline.removeDuplicates();
        }).toThrowDeveloperError();
    });

    it('generateArc throws without positions', function() {
        expect(function() {
            PolylinePipeline.generateArc();
        }).toThrowDeveloperError();
    });

    it('generateArc subdivides in half', function() {
        var p1 = Cartesian3.fromDegrees(0, 0);
        var p2 = Cartesian3.fromDegrees(90, 0);
        var p3 = Cartesian3.fromDegrees(45, 0);
        var positions = [p1, p2];

        var newPositions = PolylinePipeline.generateArc({
            positions: positions,
            granularity: CesiumMath.PI_OVER_TWO/2,
            ellipsoid: Ellipsoid.WGS84
        });

        expect(newPositions.length).toEqual(3*3);
        var p1n = Cartesian3.fromArray(newPositions, 0);
        var p3n = Cartesian3.fromArray(newPositions, 3);
        var p2n = Cartesian3.fromArray(newPositions, 6);
        expect(Cartesian3.equalsEpsilon(p1, p1n, CesiumMath.EPSILON4)).toEqual(true);
        expect(Cartesian3.equalsEpsilon(p2, p2n, CesiumMath.EPSILON4)).toEqual(true);
        expect(Cartesian3.equalsEpsilon(p3, p3n, CesiumMath.EPSILON4)).toEqual(true);
    });
});
