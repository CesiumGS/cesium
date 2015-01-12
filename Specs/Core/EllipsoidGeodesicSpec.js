/*global defineSuite*/
defineSuite([
        'Core/EllipsoidGeodesic',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        EllipsoidGeodesic,
        Cartographic,
        Ellipsoid,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without start', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic();
            return elGeo.interpolateUsingSurfaceDistance(0);
        }).toThrowDeveloperError();
    });

    it('throws without end', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic(new Cartographic(Math.PI, Math.PI));
            return elGeo.interpolateUsingSurfaceDistance(0);
        }).toThrowDeveloperError();
    });

    it('throws without unique position', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic(new Cartographic(Math.PI, Math.PI), new Cartographic(0, Math.PI));
            return elGeo.interpolateUsingSurfaceDistance(0);
        }).toThrowDeveloperError();
    });

    it('setEndPoints throws without start', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic();
            elGeo.setEndPoints();
        }).toThrowDeveloperError();
    });

    it('setEndPoints throws without end', function() {
        expect(function() {
            var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
            var elGeo = new EllipsoidGeodesic();
            elGeo.setEndPoints(start);
            return elGeo.interpolateUsingSurfaceDistance(0);
        }).toThrowDeveloperError();
    });

    it('getSurfaceDistance throws if start or end never defined', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic();
            return elGeo.surfaceDistance;
        }).toThrowDeveloperError();
    });

    it('getStartHeading throws if start or end never defined', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic();
            return elGeo.startHeading;
        }).toThrowDeveloperError();
    });

    it('getEndHeading throws if start or end never defined', function() {
        expect(function() {
            var elGeo = new EllipsoidGeodesic();
            return elGeo.endHeading;
        }).toThrowDeveloperError();
    });

    it('works with two points', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, fifteenDegrees);
        var thirtyDegrees = Math.PI / 6;
        var end = new Cartographic(thirtyDegrees, thirtyDegrees);

        var geodesic = new EllipsoidGeodesic(start, end);
        expect(start).toEqual(geodesic.start);
        expect(end).toEqual(geodesic.end);
    });

    it('sets end points', function() {
        var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
        var end = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO);
        var geodesic = new EllipsoidGeodesic();
        geodesic.setEndPoints(start, end);
        expect(start).toEqual(geodesic.start);
        expect(end).toEqual(geodesic.end);
    });

    it('gets start heading', function() {
        var ellipsoid = new Ellipsoid(6, 6, 3);
        var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
        var end = new Cartographic(Math.PI, 0);

        var geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(geodesic.startHeading, CesiumMath.EPSILON11);
    });

    it('gets end heading', function() {
        var ellipsoid = new Ellipsoid(6, 6, 3);
        var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
        var end = new Cartographic(Math.PI, 0);

        var geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(geodesic.endHeading, CesiumMath.EPSILON11);
    });

    it('computes distance at equator', function() {
        var ellipsoid = new Ellipsoid(6, 6, 3);
        var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
        var end = new Cartographic(Math.PI, 0);

        var geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(geodesic.surfaceDistance, CesiumMath.EPSILON11);
    });

    it('computes distance at meridian', function() {
        var ellipsoid = new Ellipsoid(6, 6, 6);
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(CesiumMath.PI_OVER_TWO, fifteenDegrees);
        var fortyfiveDegrees = Math.PI / 4;
        var end = new Cartographic(CesiumMath.PI_OVER_TWO, fortyfiveDegrees);

        var geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        var thirtyDegrees = Math.PI / 6;
        expect(thirtyDegrees * 6).toEqualEpsilon(geodesic.surfaceDistance, CesiumMath.EPSILON11);
    });

    it('computes distance at pole', function() {
        var ellipsoid = new Ellipsoid(6, 6, 6);
        var seventyfiveDegrees = Math.PI / 12 * 5;
        var fortyfiveDegrees = Math.PI / 4;
        var start = new Cartographic(0, -fortyfiveDegrees);
        var end = new Cartographic(Math.PI, -seventyfiveDegrees);

        var geodesic = new EllipsoidGeodesic(start, end, ellipsoid);
        var sixtyDegrees = Math.PI / 3;
        expect(sixtyDegrees * 6).toEqualEpsilon(geodesic.surfaceDistance, CesiumMath.EPSILON11);
    });

    it('interpolates start and end points', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, fifteenDegrees);
        var thirtyDegrees = Math.PI / 6;
        var end = new Cartographic(thirtyDegrees, thirtyDegrees);

        var geodesic = new EllipsoidGeodesic(start, end);
        var distance = geodesic.surfaceDistance;

        var first = geodesic.interpolateUsingSurfaceDistance(0.0);
        var last = geodesic.interpolateUsingSurfaceDistance(distance);

        expect(start.longitude).toEqualEpsilon(first.longitude, CesiumMath.EPSILON13);
        expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON13);
        expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON13);
        expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON13);
    });

    it('interpolates midpoint', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, 0);
        var fortyfiveDegrees = Math.PI / 4;
        var end = new Cartographic(fortyfiveDegrees, 0);
        var thirtyDegrees = Math.PI / 6;
        var expectedMid = new Cartographic(thirtyDegrees, 0);

        var geodesic = new EllipsoidGeodesic(start, end);
        var distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

        var midpoint = geodesic.interpolateUsingSurfaceDistance(distance);

        expect(expectedMid.longitude).toEqualEpsilon(midpoint.longitude, CesiumMath.EPSILON13);
        expect(expectedMid.latitude).toEqualEpsilon(midpoint.latitude, CesiumMath.EPSILON13);
    });

    it('interpolates start and end points using fraction', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, fifteenDegrees);
        var thirtyDegrees = Math.PI / 6;
        var end = new Cartographic(thirtyDegrees, thirtyDegrees);

        var geodesic = new EllipsoidGeodesic(start, end);

        var first = geodesic.interpolateUsingFraction(0);
        var last = geodesic.interpolateUsingFraction(1);

        expect(start.longitude).toEqualEpsilon(first.longitude, CesiumMath.EPSILON13);
        expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON13);
        expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON13);
        expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON13);
    });

    it('interpolates midpoint using fraction', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, 0);
        var fortyfiveDegrees = Math.PI / 4;
        var end = new Cartographic(fortyfiveDegrees, 0);
        var thirtyDegrees = Math.PI / 6;
        var expectedMid = new Cartographic(thirtyDegrees, 0);

        var geodesic = new EllipsoidGeodesic(start, end);

        var midpoint = geodesic.interpolateUsingFraction(0.5);

        expect(expectedMid.longitude).toEqualEpsilon(midpoint.longitude, CesiumMath.EPSILON12);
        expect(expectedMid.latitude).toEqualEpsilon(midpoint.latitude, CesiumMath.EPSILON12);
    });

    it('interpolates midpoint fraction using result parameter', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, 0);
        var fortyfiveDegrees = Math.PI / 4;
        var end = new Cartographic(fortyfiveDegrees, 0);
        var thirtyDegrees = Math.PI / 6;
        var expectedMid = new Cartographic(thirtyDegrees, 0);

        var geodesic = new EllipsoidGeodesic(start, end);
        var result = new Cartographic();
        var midpoint = geodesic.interpolateUsingFraction(0.5, result);
        expect(result).toBe(midpoint);

        expect(expectedMid.longitude).toEqualEpsilon(result.longitude, CesiumMath.EPSILON12);
        expect(expectedMid.latitude).toEqualEpsilon(result.latitude, CesiumMath.EPSILON12);
    });

    it('interpolates midpoint using result parameter', function() {
        var fifteenDegrees = Math.PI / 12;
        var start = new Cartographic(fifteenDegrees, 0);
        var fortyfiveDegrees = Math.PI / 4;
        var end = new Cartographic(fortyfiveDegrees, 0);
        var thirtyDegrees = Math.PI / 6;
        var expectedMid = new Cartographic(thirtyDegrees, 0);

        var geodesic = new EllipsoidGeodesic(start, end);
        var distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

        var result = new Cartographic();
        var midpoint = geodesic.interpolateUsingSurfaceDistance(distance, result);

        expect(result).toBe(midpoint);

        expect(expectedMid.longitude).toEqualEpsilon(result.longitude, CesiumMath.EPSILON13);
        expect(expectedMid.latitude).toEqualEpsilon(result.latitude, CesiumMath.EPSILON13);
    });

    it('doesn\'t modify incoming cartographics', function(){
        var start = new Cartographic(1,2,3);
        var end = new Cartographic(2,3,4);
        var geodesic = new EllipsoidGeodesic(start, end);
        expect(start.height).toEqual(3);
        expect(end.height).toEqual(4);
    });
});