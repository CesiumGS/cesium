/*global defineSuite*/
defineSuite([
        'Core/Rectangle',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math',
        'Specs/createPackableSpecs'
    ], function(
        Rectangle,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath,
        createPackableSpecs) {
    'use strict';

    var west = -0.9;
    var south = 0.5;
    var east = 1.4;
    var north = 1.0;
    var center = new Cartographic((west + east) / 2.0, (south + north) / 2.0);

    it('default constructor sets expected values.', function() {
        var rectangle = new Rectangle();
        expect(rectangle.west).toEqual(0.0);
        expect(rectangle.south).toEqual(0.0);
        expect(rectangle.north).toEqual(0.0);
        expect(rectangle.east).toEqual(0.0);
    });

    it('constructor sets expected parameter values.', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(rectangle.west).toEqual(west);
        expect(rectangle.south).toEqual(south);
        expect(rectangle.east).toEqual(east);
        expect(rectangle.north).toEqual(north);
    });

    it('computeWidth', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var expected = east - west;
        expect(Rectangle.computeWidth(rectangle)).toEqual(expected);
        expect(rectangle.width).toEqual(expected);

        rectangle = new Rectangle(2.0, -1.0, -2.0, 1.0);
        expected = rectangle.east - rectangle.west + CesiumMath.TWO_PI;
        expect(rectangle.width).toEqual(expected);
    });

    it('computeHeight', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var expected = north - south;
        expect(Rectangle.computeHeight(rectangle)).toEqual(expected);
        expect(rectangle.height).toEqual(expected);
    });

    it('fromDegrees produces expected values.', function() {
        var west = -10.0;
        var south = -20.0;
        var east = 10.0;
        var north = 20.0;

        var rectangle = Rectangle.fromDegrees(west, south, east, north);
        expect(rectangle.west).toEqual(CesiumMath.toRadians(west));
        expect(rectangle.south).toEqual(CesiumMath.toRadians(south));
        expect(rectangle.east).toEqual(CesiumMath.toRadians(east));
        expect(rectangle.north).toEqual(CesiumMath.toRadians(north));
    });

    it('fromDegrees works with a result parameter.', function() {
        var west = -10.0;
        var south = -20.0;
        var east = 10.0;
        var north = 20.0;

        var result = new Rectangle();
        var rectangle = Rectangle.fromDegrees(west, south, east, north, result);
        expect(result).toBe(rectangle);
        expect(rectangle.west).toEqual(CesiumMath.toRadians(west));
        expect(rectangle.south).toEqual(CesiumMath.toRadians(south));
        expect(rectangle.east).toEqual(CesiumMath.toRadians(east));
        expect(rectangle.north).toEqual(CesiumMath.toRadians(north));
    });

    it('fromCartographicArray produces expected values.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var rectangle = Rectangle.fromCartographicArray([minLat, minLon, maxLat, maxLon]);
        expect(rectangle.west).toEqual(minLon.longitude);
        expect(rectangle.south).toEqual(minLat.latitude);
        expect(rectangle.east).toEqual(maxLon.longitude);
        expect(rectangle.north).toEqual(maxLat.latitude);
    });

    it('fromCartographicArray produces rectangle that crosses IDL.', function() {
        var minLon = Cartographic.fromDegrees(-178, 3);
        var minLat = Cartographic.fromDegrees(-179, -4);
        var maxLon = Cartographic.fromDegrees(178, 3);
        var maxLat = Cartographic.fromDegrees(179, 4);

        var rectangle = Rectangle.fromCartographicArray([minLat, minLon, maxLat, maxLon]);
        expect(rectangle.east).toEqual(minLon.longitude);
        expect(rectangle.south).toEqual(minLat.latitude);
        expect(rectangle.west).toEqual(maxLon.longitude);
        expect(rectangle.north).toEqual(maxLat.latitude);
    });

    it('fromCartographicArray works with a result parameter.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var result = new Rectangle();
        var rectangle = Rectangle.fromCartographicArray([minLat, minLon, maxLat, maxLon], result);
        expect(result).toBe(rectangle);
        expect(rectangle.west).toEqual(minLon.longitude);
        expect(rectangle.south).toEqual(minLat.latitude);
        expect(rectangle.east).toEqual(maxLon.longitude);
        expect(rectangle.north).toEqual(maxLat.latitude);
    });

    it('fromCartesianArray produces expected values.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var wgs84 = Ellipsoid.WGS84;

        var rectangle = Rectangle.fromCartesianArray(
            wgs84.cartographicArrayToCartesianArray([minLat, minLon, maxLat, maxLon]), wgs84);
        expect(rectangle.west).toEqualEpsilon(minLon.longitude, CesiumMath.EPSILON15);
        expect(rectangle.south).toEqualEpsilon(minLat.latitude, CesiumMath.EPSILON15);
        expect(rectangle.east).toEqualEpsilon(maxLon.longitude, CesiumMath.EPSILON15);
        expect(rectangle.north).toEqualEpsilon(maxLat.latitude, CesiumMath.EPSILON15);
    });

    it('fromCartesianArray produces rectangle that crosses IDL.', function() {
        var minLon = Cartographic.fromDegrees(-178, 3);
        var minLat = Cartographic.fromDegrees(-179, -4);
        var maxLon = Cartographic.fromDegrees(178, 3);
        var maxLat = Cartographic.fromDegrees(179, 4);

        var wgs84 = Ellipsoid.WGS84;

        var rectangle = Rectangle.fromCartesianArray(
            wgs84.cartographicArrayToCartesianArray([minLat, minLon, maxLat, maxLon]), wgs84);
        expect(rectangle.east).toEqual(minLon.longitude);
        expect(rectangle.south).toEqual(minLat.latitude);
        expect(rectangle.west).toEqual(maxLon.longitude);
        expect(rectangle.north).toEqual(maxLat.latitude);
    });

    it('fromCartesianArray works with a result parameter.', function() {
        var minLon = new Cartographic(-0.1, 0.3, 0.0);
        var minLat = new Cartographic(0.0, -0.2, 0.0);
        var maxLon = new Cartographic(0.3, -0.1, 0.0);
        var maxLat = new Cartographic(0.2, 0.4, 0.0);

        var wgs84 = Ellipsoid.WGS84;

        var result = new Rectangle();
        var rectangle = Rectangle.fromCartesianArray(
            wgs84.cartographicArrayToCartesianArray([minLat, minLon, maxLat, maxLon]), wgs84, result);
        expect(result).toBe(rectangle);
        expect(rectangle.west).toEqualEpsilon(minLon.longitude, CesiumMath.EPSILON15);
        expect(rectangle.south).toEqualEpsilon(minLat.latitude, CesiumMath.EPSILON15);
        expect(rectangle.east).toEqualEpsilon(maxLon.longitude, CesiumMath.EPSILON15);
        expect(rectangle.north).toEqualEpsilon(maxLat.latitude, CesiumMath.EPSILON15);
    });


    it('clone works without a result parameter.', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = rectangle.clone();
        expect(returnedResult).toEqual(rectangle);
        expect(returnedResult).not.toBe(rectangle);
    });

    it('clone works with a result parameter.', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Rectangle();
        var returnedResult = rectangle.clone(result);
        expect(returnedResult).toEqual(rectangle);
        expect(returnedResult).not.toBe(rectangle);
        expect(returnedResult).toBe(result);
    });

    it('clone works with "this" result parameter.', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = rectangle.clone(rectangle);
        expect(returnedResult).toEqual(new Rectangle(west, south, east, north));
        expect(returnedResult).toBe(rectangle);
    });

    it('clone works without rectangle', function() {
        expect(Rectangle.clone()).not.toBeDefined();
    });

    it('Equals works in all cases', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        expect(rectangle.equals(new Rectangle(0.1, 0.2, 0.3, 0.4))).toEqual(true);
        expect(rectangle.equals(new Rectangle(0.5, 0.2, 0.3, 0.4))).toEqual(false);
        expect(rectangle.equals(new Rectangle(0.1, 0.5, 0.3, 0.4))).toEqual(false);
        expect(rectangle.equals(new Rectangle(0.1, 0.2, 0.5, 0.4))).toEqual(false);
        expect(rectangle.equals(new Rectangle(0.1, 0.2, 0.3, 0.5))).toEqual(false);
        expect(rectangle.equals(undefined)).toEqual(false);
    });

    it('Static equals works in all cases', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        expect(Rectangle.equals(rectangle, new Rectangle(0.1, 0.2, 0.3, 0.4))).toEqual(true);
        expect(Rectangle.equals(rectangle, new Rectangle(0.5, 0.2, 0.3, 0.4))).toEqual(false);
        expect(Rectangle.equals(rectangle, new Rectangle(0.1, 0.5, 0.3, 0.4))).toEqual(false);
        expect(Rectangle.equals(rectangle, new Rectangle(0.1, 0.2, 0.5, 0.4))).toEqual(false);
        expect(Rectangle.equals(rectangle, new Rectangle(0.1, 0.2, 0.3, 0.5))).toEqual(false);
        expect(Rectangle.equals(rectangle, undefined)).toEqual(false);
    });

    it('Equals epsilon works in all cases', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.0)).toEqual(true);
        expect(rectangle.equalsEpsilon(new Rectangle(0.5, 0.2, 0.3, 0.4), 0.0)).toEqual(false);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.5, 0.3, 0.4), 0.0)).toEqual(false);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.2, 0.5, 0.4), 0.0)).toEqual(false);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.2, 0.3, 0.5), 0.0)).toEqual(false);
        expect(rectangle.equalsEpsilon(new Rectangle(0.5, 0.2, 0.3, 0.4), 0.4)).toEqual(true);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.5, 0.3, 0.4), 0.3)).toEqual(true);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.2, 0.5, 0.4), 0.2)).toEqual(true);
        expect(rectangle.equalsEpsilon(new Rectangle(0.1, 0.2, 0.3, 0.5), 0.1)).toEqual(true);
        expect(rectangle.equalsEpsilon(undefined, 0.0)).toEqual(false);
    });

    it('fromCartographicArray throws with no array', function() {
        expect(function() {
            Rectangle.fromCartographicArray(undefined, new Rectangle());
        }).toThrowDeveloperError();
    });

    it('fromCartesianArray throws with no array', function() {
        expect(function() {
            Rectangle.fromCartesianArray(undefined, undefined, new Rectangle());
        }).toThrowDeveloperError();
    });

    it('validate throws with no rectangle', function() {
        expect(function() {
            Rectangle.validate();
        }).toThrowDeveloperError();
    });

    it('validate throws with no west', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.west = undefined;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with no south', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.south = undefined;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with no east', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.east = undefined;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with no north', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.north = undefined;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with bad west', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.west = Math.PI * 2;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with bad south', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.south = Math.PI * 2;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with bad east', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.east = Math.PI * 2;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('validate throws with bad north', function() {
        var rectangle = new Rectangle(west, south, east, north);
        rectangle.north = Math.PI * 2;
        expect(function() {
            Rectangle.validate(rectangle);
        }).toThrowDeveloperError();
    });

    it('southwest works without a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.southwest(rectangle);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('southwest works with a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = Rectangle.southwest(rectangle, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('southwest throws with no rectangle', function() {
        expect(function() {
            Rectangle.southwest();
        }).toThrowDeveloperError();
    });

    it('northwest works without a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.northwest(rectangle);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('northwest works with a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = Rectangle.northwest(rectangle, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(west);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getNothwest throws with no rectangle', function() {
        expect(function() {
            Rectangle.northwest();
        }).toThrowDeveloperError();
    });

    it('northeast works without a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.northeast(rectangle);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('northeast works with a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = Rectangle.northeast(rectangle, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(north);
    });

    it('getNotheast throws with no rectangle', function() {
        expect(function() {
            Rectangle.northeast();
        }).toThrowDeveloperError();
    });

    it('southeast works without a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.southeast(rectangle);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('southeast works with a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = Rectangle.southeast(rectangle, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.longitude).toEqual(east);
        expect(returnedResult.latitude).toEqual(south);
    });

    it('southeast throws with no rectangle', function() {
        expect(function() {
            Rectangle.southeast();
        }).toThrowDeveloperError();
    });

    it('center works without a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.center(rectangle);
        expect(returnedResult).toEqualEpsilon(center, CesiumMath.EPSILON11);
    });

    it('center works with a result parameter', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var result = new Cartographic();
        var returnedResult = Rectangle.center(rectangle, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(center, CesiumMath.EPSILON11);
    });

    it('center works across IDL', function() {
        var rectangle = Rectangle.fromDegrees(170, 0, -170, 0);
        var returnedResult = Rectangle.center(rectangle);
        expect(returnedResult).toEqualEpsilon(Cartographic.fromDegrees(180, 0), CesiumMath.EPSILON11);

        rectangle = Rectangle.fromDegrees(160, 0, -170, 0);
        returnedResult = Rectangle.center(rectangle);
        expect(returnedResult).toEqualEpsilon(Cartographic.fromDegrees(175, 0), CesiumMath.EPSILON11);

        rectangle = Rectangle.fromDegrees(170, 0, -160, 0);
        returnedResult = Rectangle.center(rectangle);
        expect(returnedResult).toEqualEpsilon(Cartographic.fromDegrees(-175, 0), CesiumMath.EPSILON11);

        rectangle = Rectangle.fromDegrees(160, 0, 140, 0);
        returnedResult = Rectangle.center(rectangle);
        expect(returnedResult).toEqualEpsilon(Cartographic.fromDegrees(-30, 0), CesiumMath.EPSILON11);
    });

    it('center throws with no rectangle', function() {
        expect(function() {
            Rectangle.center();
        }).toThrowDeveloperError();
    });

    it('intersection works without a result parameter', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var rectangle2 = new Rectangle(0.0, 0.25, 1.0, 0.8);
        var expected = new Rectangle(0.5, 0.25, 0.75, 0.8);
        var returnedResult = Rectangle.intersection(rectangle, rectangle2);
        expect(returnedResult).toEqual(expected);
    });

    it('intersection works with a result parameter', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var rectangle2 = new Rectangle(0.0, 0.25, 1.0, 0.8);
        var expected = new Rectangle(0.5, 0.25, 0.75, 0.8);
        var result = new Rectangle();
        var returnedResult = Rectangle.intersection(rectangle, rectangle2, result);
        expect(returnedResult).toEqual(expected);
        expect(result).toBe(returnedResult);
    });

    it('intersection works across the IDL (1)', function() {
        var rectangle1 = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0);
        var rectangle2 = Rectangle.fromDegrees(-175.0, 5.0, -160.0, 15.0);
        var expected = Rectangle.fromDegrees(-175.0, 5.0, -170.0, 10.0);
        expect(Rectangle.intersection(rectangle1, rectangle2)).toEqual(expected);
        expect(Rectangle.intersection(rectangle2, rectangle1)).toEqual(expected);
    });

    it('intersection works across the IDL (2)', function() {
        var rectangle1 = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0);
        var rectangle2 = Rectangle.fromDegrees(160.0, 5.0, 175.0, 15.0);
        var expected = Rectangle.fromDegrees(170.0, 5.0, 175.0, 10.0);
        expect(Rectangle.intersection(rectangle1, rectangle2)).toEqual(expected);
        expect(Rectangle.intersection(rectangle2, rectangle1)).toEqual(expected);
    });

    it('intersection works across the IDL (3)', function() {
        var rectangle1 = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0);
        var rectangle2 = Rectangle.fromDegrees(175.0, 5.0, -175.0, 15.0);
        var expected = Rectangle.fromDegrees(175.0, 5.0, -175.0, 10.0);
        expect(Rectangle.intersection(rectangle1, rectangle2)).toEqual(expected);
        expect(Rectangle.intersection(rectangle2, rectangle1)).toEqual(expected);
    });

    it('intersection returns undefined for a point', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(east, north, east + 0.1, north + 0.1);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a east-west line (1)', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(west, north, east, north + 0.1);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a east-west line (2)', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(west, south + 0.1, east, south);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a north-south line (1)', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(east, south, east + 0.1, north);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a north-south line (2)', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(west - 0.1, south, west, north);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a north-south line (3)', function() {
        var west = CesiumMath.toRadians(170.0);
        var south = CesiumMath.toRadians(-10.0);
        var east = CesiumMath.toRadians(-170.0);
        var north = CesiumMath.toRadians(10.0);

        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(east, south, east + 0.1, north);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined for a north-south line (4)', function() {
        var west = CesiumMath.toRadians(170.0);
        var south = CesiumMath.toRadians(-10.0);
        var east = CesiumMath.toRadians(-170.0);
        var north = CesiumMath.toRadians(10.0);

        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(west - 0.1, south, west, north);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined if north-south direction is degenerate', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(west, north + 0.1, east, north + 0.2);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });

    it('intersection returns undefined if east-west direction is degenerate', function() {
        var rectangle1 = new Rectangle(west, south, east, north);
        var rectangle2 = new Rectangle(east + 0.1, south, east + 0.2, north);
        expect(Rectangle.intersection(rectangle1, rectangle2)).not.toBeDefined();
        expect(Rectangle.intersection(rectangle2, rectangle1)).not.toBeDefined();
    });
    
    it('union works without a result parameter', function() {
        var rectangle1 = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var rectangle2 = new Rectangle(0.4, 0.0, 0.85, 0.8);
        var expected = new Rectangle(0.4, 0.0, 0.85, 0.9);
        var returnedResult = Rectangle.union(rectangle1, rectangle2);
        expect(returnedResult).toEqual(expected);
    });

    it('union works with a result parameter', function() {
        var rectangle1 = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var rectangle2 = new Rectangle(0.4, 0.0, 0.85, 0.8);
        var expected = new Rectangle(0.4, 0.0, 0.85, 0.9);
        var result = new Rectangle(-1.0, -1.0, 10.0, 10.0);
        var returnedResult = Rectangle.union(rectangle1, rectangle2, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expected);
    });

    it('expand works if rectangle needs to grow right', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.85, 0.5);
        var expected = new Rectangle(0.5, 0.1, 0.85, 0.9);
        var result = Rectangle.expand(rectangle, cartographic);
        expect(result).toEqual(expected);
    });

    it('expand works if rectangle needs to grow left', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.4, 0.5);
        var expected = new Rectangle(0.4, 0.1, 0.75, 0.9);
        var result = Rectangle.expand(rectangle, cartographic);
        expect(result).toEqual(expected);
    });

    it('expand works if rectangle needs to grow up', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.6, 1.0);
        var expected = new Rectangle(0.5, 0.1, 0.75, 1.0);
        var result = Rectangle.expand(rectangle, cartographic);
        expect(result).toEqual(expected);
    });

    it('expand works if rectangle needs to grow down', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.6, 0.0);
        var expected = new Rectangle(0.5, 0.0, 0.75, 0.9);
        var result = Rectangle.expand(rectangle, cartographic);
        expect(result).toEqual(expected);
    });

    it('expand works if rectangle does not need to grow', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.6, 0.5);
        var expected = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var result = Rectangle.expand(rectangle, cartographic);
        expect(result).toEqual(expected);
    });

    it('expand works with a result parameter', function() {
        var rectangle = new Rectangle(0.5, 0.1, 0.75, 0.9);
        var cartographic = new Cartographic(0.85, 1.0);
        var expected = new Rectangle(0.5, 0.1, 0.85, 1.0);
        var result = new Rectangle();
        var returnedResult = Rectangle.expand(rectangle, cartographic, result);
        expect(returnedResult).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('contains works', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(Rectangle.contains(rectangle, new Cartographic(west, south))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(west, north))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(east, south))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(east, north))).toEqual(true);
        expect(Rectangle.contains(rectangle, Rectangle.center(rectangle))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(west - 0.1, south))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(west, north + 0.1))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(east, south - 0.1))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(east + 0.1, north))).toEqual(false);
    });

    it('contains works with rectangle across the IDL', function() {
        var west = CesiumMath.toRadians(170.0);
        var south = CesiumMath.toRadians(-10.0);
        var east = CesiumMath.toRadians(-170.0);
        var north = CesiumMath.toRadians(10.0);

        var rectangle = new Rectangle(west, south, east, north);
        expect(Rectangle.contains(rectangle, new Cartographic(west, south))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(west, north))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(east, south))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(east, north))).toEqual(true);
        expect(Rectangle.contains(rectangle, Rectangle.center(rectangle))).toEqual(true);
        expect(Rectangle.contains(rectangle, new Cartographic(west - 0.1, south))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(west, north + 0.1))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(east, south - 0.1))).toEqual(false);
        expect(Rectangle.contains(rectangle, new Cartographic(east + 0.1, north))).toEqual(false);
    });

    it('subsample works south of the equator', function() {
        var west = 0.1;
        var south = -0.3;
        var east = 0.2;
        var north = -0.4;
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.subsample(rectangle);
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southwest(rectangle))]);
    });

    it('subsample works with a result parameter', function() {
        var west = 0.1;
        var south = -0.3;
        var east = 0.2;
        var north = -0.4;
        var rectangle = new Rectangle(west, south, east, north);
        var cartesian0 = new Cartesian3();
        var results = [cartesian0];
        var returnedResult = Rectangle.subsample(rectangle, Ellipsoid.WGS84, 0.0, results);
        expect(results).toBe(returnedResult);
        expect(results[0]).toBe(cartesian0);
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southwest(rectangle))]);
    });

    it('subsample works north of the equator', function() {
        var west = 0.1;
        var south = 0.3;
        var east = 0.2;
        var north = 0.4;
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.subsample(rectangle);
        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle)),
                                        Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southwest(rectangle))]);
    });

    it('subsample works on the equator', function() {
        var west = 0.1;
        var south = -0.1;
        var east = 0.2;
        var north = 0.0;
        var rectangle = new Rectangle(west, south, east, north);
        var returnedResult = Rectangle.subsample(rectangle);
        expect(returnedResult.length).toEqual(6);
        expect(returnedResult[0]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle)));
        expect(returnedResult[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northeast(rectangle)));
        expect(returnedResult[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle)));
        expect(returnedResult[3]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southwest(rectangle)));

        var cartographic4 = Ellipsoid.WGS84.cartesianToCartographic(returnedResult[4]);
        expect(cartographic4.latitude).toEqual(0.0);
        expect(cartographic4.longitude).toEqualEpsilon(west, CesiumMath.EPSILON16);

        var cartographic5 = Ellipsoid.WGS84.cartesianToCartographic(returnedResult[5]);
        expect(cartographic5.latitude).toEqual(0.0);
        expect(cartographic5.longitude).toEqualEpsilon(east, CesiumMath.EPSILON16);
    });

    it('subsample works at a height above the ellipsoid', function() {
        var west = 0.1;
        var south = -0.3;
        var east = 0.2;
        var north = -0.4;
        var rectangle = new Rectangle(west, south, east, north);
        var height = 100000.0;
        var returnedResult = Rectangle.subsample(rectangle, Ellipsoid.WGS84, height);

        var nw = Rectangle.northwest(rectangle);
        nw.height = height;
        var ne = Rectangle.northeast(rectangle);
        ne.height = height;
        var se = Rectangle.southeast(rectangle);
        se.height = height;
        var sw = Rectangle.southwest(rectangle);
        sw.height = height;

        expect(returnedResult).toEqual([Ellipsoid.WGS84.cartographicToCartesian(nw),
                                        Ellipsoid.WGS84.cartographicToCartesian(ne),
                                        Ellipsoid.WGS84.cartographicToCartesian(se),
                                        Ellipsoid.WGS84.cartographicToCartesian(sw)]);
    });

    it('subsample throws with no rectangle', function() {
        expect(function() {
            Rectangle.subsample();
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with no epsilon', function() {
        var rectangle = new Rectangle(west, south, east, north);
        var other = new Rectangle();
        expect(function() {
            rectangle.equalsEpsilon(other, undefined);
        }).toThrowDeveloperError();
    });

    it('intersection throws with no rectangle', function() {
        expect(function() {
            Rectangle.intersection(undefined);
        }).toThrowDeveloperError();
    });

    it('intersection throws with no otherRectangle', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(function() {
            Rectangle.intersection(rectangle, undefined);
        }).toThrowDeveloperError();
    });

    it('union throws with no rectangle', function() {
        expect(function() {
            Rectangle.union(undefined);
        }).toThrowDeveloperError();
    });

    it('union throws with no otherRectangle', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(function() {
            Rectangle.intersection(rectangle, undefined);
        }).toThrowDeveloperError();
    });

    it('expand throws with no rectangle', function() {
        expect(function() {
            Rectangle.expand(undefined);
        }).toThrowDeveloperError();
    });

    it('expand throws with no cartographic', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(function() {
            Rectangle.expand(rectangle, undefined);
        }).toThrowDeveloperError();
    });

    it('contains throws with no cartographic', function() {
        var rectangle = new Rectangle(west, south, east, north);
        expect(function() {
            Rectangle.contains(rectangle, undefined);
        }).toThrowDeveloperError();
    });

    var rectangle = new Rectangle(west, south, east, north);
    var packedInstance = [west, south, east, north];
    createPackableSpecs(Rectangle, rectangle, packedInstance);
});
