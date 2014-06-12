/*global defineSuite*/
defineSuite([
        'Core/PolylinePipeline',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Transforms'
    ], function(
        PolylinePipeline,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath,
        Transforms) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('wrapLongitude', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-75.163789, 39.952335);      // Philadelphia, PA
        var p2 = new Cartographic.fromDegrees(-80.2264393, 25.7889689);    // Miami, FL
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(1);
        expect(segments.lengths[0]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-179.0, 39.0);
        var p2 = new Cartographic.fromDegrees(2.0, 25.0);
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(2);
        expect(segments.lengths[0]).toEqual(2);
        expect(segments.lengths[1]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments with model matrix', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(-179.0, 39.0));
        var matrix = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);

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

    it('scaleToSurface throws without positions', function() {
        expect(function() {
            PolylinePipeline.scaleToSurface();
        }).toThrowDeveloperError();
    });

    it('scaleToSurface subdivides in half', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(0, 0));
        var p2 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(90, 0));
        var p3 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(45, 0));
        var positions = [p1, p2];

        var newPositions = PolylinePipeline.scaleToSurface(positions, CesiumMath.PI_OVER_TWO/2, ellipsoid);

        expect(newPositions.length).toEqual(3*3);
        var p1n = Cartesian3.fromArray(newPositions, 0);
        var p3n = Cartesian3.fromArray(newPositions, 3);
        var p2n = Cartesian3.fromArray(newPositions, 6);
        expect(Cartesian3.equalsEpsilon(p1, p1n, CesiumMath.EPSILON4)).toEqual(true);
        expect(Cartesian3.equalsEpsilon(p2, p2n, CesiumMath.EPSILON4)).toEqual(true);
        expect(Cartesian3.equalsEpsilon(p3, p3n, CesiumMath.EPSILON4)).toEqual(true);
    });

    it('scaleToGeodeticHeight throws if positions is undefined', function() {
        expect(function() {
            PolylinePipeline.scaleToGeodeticHeight();
        }).toThrowDeveloperError();
    });

    it('scaleToGeodeticHeight throws if height is undefined', function() {
        expect(function() {
            PolylinePipeline.scaleToGeodeticHeight([new Cartesian3()]);
        }).toThrowDeveloperError();
    });

    it('scaleToGeodeticHeight throws if positions.length is not equal to height.length', function() {
        expect(function() {
            PolylinePipeline.scaleToGeodeticHeight([new Cartesian3()], []);
        }).toThrowDeveloperError();
    });

    it('scaleToGeodeticHeight throws if positions.length is not equal to height.length', function() {
        expect(function() {
            PolylinePipeline.scaleToGeodeticHeight([new Cartesian3()], 0, undefined, []);
        }).toThrowDeveloperError();
    });

    it('scaleToGeodeticHeight works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(0, 0));
        var p2 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(90, 0));

        var positions = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z];
        var result = [0, 0, 0, 0, 0, 0];
        var height = 200;

        PolylinePipeline.scaleToGeodeticHeight(positions, height, ellipsoid, result);

        var p1n = Cartesian3.fromArray(result, 0);
        var p2n = Cartesian3.fromArray(result, 3);
        expect(ellipsoid.cartesianToCartographic(p1n).height).toEqualEpsilon(200, CesiumMath.EPSILON8);
        expect(ellipsoid.cartesianToCartographic(p2n).height).toEqualEpsilon(200, CesiumMath.EPSILON8);
    });


    it('scaleToGeodeticHeight scales all positions to number', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(0, 0));
        var p2 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(90, 0));

        var positions = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z];
        var height = 200;

        var newPositions = PolylinePipeline.scaleToGeodeticHeight(positions, height);

        var p1n = Cartesian3.fromArray(newPositions, 0);
        var p2n = Cartesian3.fromArray(newPositions, 3);
        expect(ellipsoid.cartesianToCartographic(p1n).height).toEqualEpsilon(200, CesiumMath.EPSILON8);
        expect(ellipsoid.cartesianToCartographic(p2n).height).toEqualEpsilon(200, CesiumMath.EPSILON8);
    });

    it('scaleToGeodeticHeight scales all positions with array of numbers', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(0, 0));
        var p2 = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(90, 0));

        var positions = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z];
        var height = [200, 300];

        var newPositions = PolylinePipeline.scaleToGeodeticHeight(positions, height);

        var p1n = Cartesian3.fromArray(newPositions, 0);
        var p2n = Cartesian3.fromArray(newPositions, 3);
        expect(ellipsoid.cartesianToCartographic(p1n).height).toEqualEpsilon(200, CesiumMath.EPSILON8);
        expect(ellipsoid.cartesianToCartographic(p2n).height).toEqualEpsilon(300, CesiumMath.EPSILON8);
    });
});
