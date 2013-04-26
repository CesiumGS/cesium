/*global defineSuite*/
defineSuite([
         'Core/Extent',
         'Core/Math',
         'Core/Cartographic',
         'Core/Cartesian3',
         'Core/Ellipsoid'
     ], function(
         Extent,
         CesiumMath,
         Cartographic,
         Cartesian3,
         Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var west = -0.9;
    var south = 0.5;
    var east = 1.4;
    var north = 1.0;
    var center = new Cartographic((west + east) / 2.0, (south + north) / 2.0);

    it('default constructor sets expected values.', function() {
        var extent = new Extent();
        expect(extent.west).toEqual(0.0);
        expect(extent.south).toEqual(0.0);
        expect(extent.north).toEqual(0.0);
        expect(extent.east).toEqual(0.0);
    });

    it('constructor sets expected parameter values.', function() {
        var extent = new Extent(west, south, east, north);
        expect(extent.west).toEqual(west);
        expect(extent.south).toEqual(south);
        expect(extent.east).toEqual(east);
        expect(extent.north).toEqual(north);
    });

    it('fromCartographicArray produces expected values.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var extent = Extent.fromCartographicArray([minLat, minLon, maxLat, maxLon]);
        expect(extent.west).toEqual(minLon.longitude);
        expect(extent.south).toEqual(minLat.latitude);
        expect(extent.east).toEqual(maxLon.longitude);
        expect(extent.north).toEqual(maxLat.latitude);
    });

    it('fromCartographicArray works with a result parameter.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var result = new Extent();
        var extent = Extent.fromCartographicArray([minLat, minLon, maxLat, maxLon], result);
        expect(result).toBe(extent);
        expect(extent.west).toEqual(minLon.longitude);
        expect(extent.south).toEqual(minLat.latitude);
        expect(extent.east).toEqual(maxLon.longitude);
        expect(extent.north).toEqual(maxLat.latitude);
    });

    it('clone works without a result parameter.', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.clone();
        expect(returnedResult).toEqual(extent);
        expect(returnedResult).toNotBe(extent);
    });

    it('clone works with a result parameter.', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Extent();
        var returnedResult = extent.clone(result);
        expect(returnedResult).toEqual(extent);
        expect(returnedResult).toNotBe(extent);
        expect(returnedResult).toBe(result);
    });

    it('clone works with "this" result parameter.', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.clone(extent);
        expect(returnedResult).toEqual(new Extent(west, south, east, north));
        expect(returnedResult).toBe(extent);
    });

    it('Equals works in all cases', function() {
        var extent = new Extent(0.1, 0.2, 0.3, 0.4);
        expect(extent.equals(new Extent(0.1, 0.2, 0.3, 0.4))).toEqual(true);
        expect(extent.equals(new Extent(0.5, 0.2, 0.3, 0.4))).toEqual(false);
        expect(extent.equals(new Extent(0.1, 0.5, 0.3, 0.4))).toEqual(false);
        expect(extent.equals(new Extent(0.1, 0.2, 0.5, 0.4))).toEqual(false);
        expect(extent.equals(new Extent(0.1, 0.2, 0.3, 0.5))).toEqual(false);
        expect(extent.equals(undefined)).toEqual(false);
    });

    it('Equals epsilon works in all cases', function() {
        var extent = new Extent(0.1, 0.2, 0.3, 0.4);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.2, 0.3, 0.4), 0.0)).toEqual(true);
        expect(extent.equalsEpsilon(new Extent(0.5, 0.2, 0.3, 0.4), 0.0)).toEqual(false);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.5, 0.3, 0.4), 0.0)).toEqual(false);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.2, 0.5, 0.4), 0.0)).toEqual(false);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.2, 0.3, 0.5), 0.0)).toEqual(false);
        expect(extent.equalsEpsilon(new Extent(0.5, 0.2, 0.3, 0.4), 0.4)).toEqual(true);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.5, 0.3, 0.4), 0.3)).toEqual(true);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.2, 0.5, 0.4), 0.2)).toEqual(true);
        expect(extent.equalsEpsilon(new Extent(0.1, 0.2, 0.3, 0.5), 0.1)).toEqual(true);
        expect(extent.equalsEpsilon(undefined, 0.0)).toEqual(false);
    });

    it('fromCartographicArray throws with no array', function() {
        expect(function() {
            Extent.fromCartographicArray(undefined, new Extent());
        }).toThrow();
    });

    it('validate throws with no west', function() {
        var extent = new Extent(west, south, east, north);
        extent.west = undefined;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with no south', function() {
        var extent = new Extent(west, south, east, north);
        extent.south = undefined;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with no east', function() {
        var extent = new Extent(west, south, east, north);
        extent.east = undefined;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with no north', function() {
        var extent = new Extent(west, south, east, north);
        extent.north = undefined;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with bad west', function() {
        var extent = new Extent(west, south, east, north);
        extent.west = Math.PI * 2;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with bad south', function() {
        var extent = new Extent(west, south, east, north);
        extent.south = Math.PI * 2;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with bad east', function() {
        var extent = new Extent(west, south, east, north);
        extent.east = Math.PI * 2;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('validate throws with bad north', function() {
        var extent = new Extent(west, south, east, north);
        extent.north = Math.PI * 2;
        expect(function() {
            extent.validate();
        }).toThrow();
    });

    it('getSouthwest works without a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.getSouthwest();
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('getSouthwest works with a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = extent.getSouthwest(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('getNorthwest works without a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.getNorthwest();
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getNorthwest works with a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = extent.getNorthwest(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getNortheast works without a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.getNortheast();
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getNortheast works with a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = extent.getNortheast(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getSoutheast works without a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.getSoutheast();
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('getSoutheast works with a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = extent.getSoutheast(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('getCenter works without a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.getCenter();
        expect(returnedResult).toEqual(center);
    });

    it('getCenter works with a result parameter', function() {
        var extent = new Extent(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = extent.getCenter(result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(center);
    });

    it('intersectWith works without a result parameter', function() {
        var extent = new Extent(0.5, 0.1, 0.75, 0.9);
        var extent2 = new Extent(0.0, 0.25, 1.0, 0.8);
        var expected = new Extent(0.5, 0.25, 0.75, 0.8);
        var returnedResult = extent.intersectWith(extent2);
        expect(returnedResult).toEqual(expected);
    });

    it('intersectWith works with a result parameter', function() {
        var extent = new Extent(0.5, 0.1, 0.75, 0.9);
        var extent2 = new Extent(0.0, 0.25, 1.0, 0.8);
        var expected = new Extent(0.5, 0.25, 0.75, 0.8);
        var result = new Extent();
        var returnedResult = extent.intersectWith(extent2, result);
        expect(returnedResult).toEqual(expected);
        expect(result).toBe(returnedResult);
    });

    it('contains works', function() {
        var extent = new Extent(west, south, east, north);
        expect(extent.contains(new Cartographic(west, south))).toEqual(true);
        expect(extent.contains(new Cartographic(west, north))).toEqual(true);
        expect(extent.contains(new Cartographic(east, south))).toEqual(true);
        expect(extent.contains(new Cartographic(east, north))).toEqual(true);
        expect(extent.contains(extent.getCenter())).toEqual(true);
        expect(extent.contains(new Cartographic(west - 0.1, south))).toEqual(false);
        expect(extent.contains(new Cartographic(west, north + 0.1))).toEqual(false);
        expect(extent.contains(new Cartographic(east, south - 0.1))).toEqual(false);
        expect(extent.contains(new Cartographic(east + 0.1, north))).toEqual(false);
    });

    it('isEmpty reports a non-empty extent', function() {
        var extent = new Extent(1.0, 1.0, 2.0, 2.0);
        expect(extent.isEmpty()).toEqual(false);
    });

    it('isEmpty reports true for a point', function() {
        var extent = new Extent(2.0, 2.0, 2.0, 2.0);
        expect(extent.isEmpty()).toEqual(true);
    });

    it('isEmpty reports true for a north-south line', function() {
        var extent = new Extent(2.0, 2.0, 2.0, 2.1);
        expect(extent.isEmpty()).toEqual(true);
    });

    it('isEmpty reports true for an east-west line', function() {
        var extent = new Extent(2.0, 2.0, 2.1, 2.0);
        expect(extent.isEmpty()).toEqual(true);
    });

    it('isEmpty reports true if north-south direction is degenerate', function() {
        var extent = new Extent(1.0, 1.1, 2.0, 1.0);
        expect(extent.isEmpty()).toEqual(true);
    });

    it('isEmpty reports true if east-west direction is degenerate', function() {
        var extent = new Extent(1.1, 1.0, 1.0, 2.0);
        expect(extent.isEmpty()).toEqual(true);
    });

    it('subsample works south of the equator', function() {
        var west = 0.1;
        var south = -0.3;
        var east = 0.2;
        var north = -0.4;
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.subsample();
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getNortheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSouthwest())]);
    });

    it('subsample works with a result parameter', function() {
        var west = 0.1;
        var south = -0.3;
        var east = 0.2;
        var north = -0.4;
        var extent = new Extent(west, south, east, north);
        var cartesian0 = new Cartesian3();
        var results = [cartesian0];
        var returnedResult = extent.subsample(Ellipsoid.WGS84, results);
        expect(results).toBe(returnedResult);
        expect(results[0]).toBe(cartesian0);
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getNortheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSouthwest())]);
    });

    it('subsample works north of the equator', function() {
        var west = 0.1;
        var south = 0.3;
        var east = 0.2;
        var north = 0.4;
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.subsample();
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getNortheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast()),
                                        Ellipsoid.WGS84.cartographicToCartesian(extent.getSouthwest())]);
    });

    it('subsample works on the equator', function() {
        var west = 0.1;
        var south = -0.1;
        var east = 0.2;
        var north = 0.0;
        var extent = new Extent(west, south, east, north);
        var returnedResult = extent.subsample();
        expect(returnedResult.length).toEqual(6);
        expect(returnedResult[0]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest()));
        expect(returnedResult[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(extent.getNortheast()));
        expect(returnedResult[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast()));
        expect(returnedResult[3]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(extent.getSouthwest()));

        var cartographic4 = Ellipsoid.WGS84.cartesianToCartographic(returnedResult[4]);
        expect(cartographic4.latitude).toEqual(0.0);
        expect(cartographic4.longitude).toEqualEpsilon(west, CesiumMath.EPSILON16);

        var cartographic5 = Ellipsoid.WGS84.cartesianToCartographic(returnedResult[5]);
        expect(cartographic5.latitude).toEqual(0.0);
        expect(cartographic5.longitude).toEqualEpsilon(east, CesiumMath.EPSILON16);
    });

    it('equalsEpsilon throws with no epsilon', function() {
        var extent = new Extent(west, south, east, north);
        var other = new Extent();
        expect(function() {
            extent.equalsEpsilon(other, undefined);
        }).toThrow();
    });

    it('intersectWith throws with no extent', function() {
        var extent = new Extent(west, south, east, north);
        expect(function() {
            extent.intersectWith(undefined);
        }).toThrow();
    });

    it('contains throws with no cartographic', function() {
        var extent = new Extent(west, south, east, north);
        expect(function() {
            extent.contains(undefined);
        }).toThrow();
    });
});