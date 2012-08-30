/*global defineSuite*/
defineSuite([
             'Core/Ellipsoid',
             'Core/Cartesian3',
             'Core/Cartographic',
             'Core/Math'
            ], function(
              Ellipsoid,
              Cartesian3,
              Cartographic,
              CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var radii = new Cartesian3(1.0, 2.0, 3.0);
    var radiiSquared = radii.multiplyComponents(radii);
    var radiiToTheFourth = radiiSquared.multiplyComponents(radiiSquared);
    var oneOverRadii = new Cartesian3(1 / radii.x, 1 / radii.y, 1 / radii.z);
    var oneOverRadiiSquared = new Cartesian3(1 / radiiSquared.x, 1 / radiiSquared.y, 1 / radiiSquared.z);
    var minimumRadius = 1.0;
    var maximumRadius = 3.0;

    //All values computes using STK Components
    var spaceCartesian = new Cartesian3(4582719.8827300891, -4582719.8827300882, 1725510.4250797231);
    var spaceCartesianGeodeticSurfaceNormal = new Cartesian3(0.6829975339864266, -0.68299753398642649, 0.25889908678270795);

    var spaceCartographic = new Cartographic(CesiumMath.toRadians(-45.0), CesiumMath.toRadians(15.0), 330000.0);
    var spaceCartographicGeodeticSurfaceNormal = new Cartesian3(0.68301270189221941, -0.6830127018922193, 0.25881904510252074);

    var surfaceCartesian = new Cartesian3(4094327.7921465295, 1909216.4044747739, 4487348.4088659193);
    var surfaceCartographic = new Cartographic(CesiumMath.toRadians(25.0), CesiumMath.toRadians(45.0), 0.0);

    it('default constructor creates zero Ellipsoid', function() {
        var ellipsoid = new Ellipsoid();
        expect(ellipsoid.radii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiToTheFourth).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.minimumRadius).toEqual(0.0);
        expect(ellipsoid.maximumRadius).toEqual(0.0);
    });

    it('constructor sets properties from parameters', function() {
        var ellipsoid = new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius);
        expect(ellipsoid.radii).toEqual(radii);
        expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
    });

    it('fromRadii creates zero Ellipsoid with no parameters', function() {
        var ellipsoid = Ellipsoid.fromRadii();
        expect(ellipsoid.radii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiToTheFourth).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.minimumRadius).toEqual(0.0);
        expect(ellipsoid.maximumRadius).toEqual(0.0);
    });

    it('fromCartesian3 creates zero Ellipsoid with no parameters', function() {
        var ellipsoid = Ellipsoid.fromCartesian3();
        expect(ellipsoid.radii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radiiToTheFourth).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadii).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.minimumRadius).toEqual(0.0);
        expect(ellipsoid.maximumRadius).toEqual(0.0);
    });

    it('fromRadii works without a result parameter', function() {
        var ellipsoid = Ellipsoid.fromRadii(radii.x, radii.y, radii.z);
        expect(ellipsoid.radii).toEqual(radii);
        expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
    });

    it('fromRadii works with a result parameter', function() {
        var result = new Ellipsoid();
        var ellipsoid = Ellipsoid.fromRadii(radii.x, radii.y, radii.z, result);
        expect(result).toBe(ellipsoid);
        expect(ellipsoid.radii).toEqual(radii);
        expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(maximumRadius);

    });

    it('fromCartesian3 works without a result parameter', function() {
        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        expect(ellipsoid.radii).toEqual(radii);
        expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
    });

    it('fromCartesian3 works with a result parameter', function() {
        var result = new Ellipsoid();
        var ellipsoid = Ellipsoid.fromCartesian3(radii, result);
        expect(result).toBe(ellipsoid);
        expect(ellipsoid.radii).toEqual(radii);
        expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
    });

    it('clone works without a result parameter', function() {
        var ellipsoid = new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius);
        var returnedResult = ellipsoid.clone();
        expect(ellipsoid.radii).toEqual(returnedResult.radii);
        expect(ellipsoid.radiiSquared).toEqual(returnedResult.radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(returnedResult.radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(returnedResult.oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(returnedResult.oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(returnedResult.minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(returnedResult.maximumRadius);
    });

    it('clone works with a result parameter', function() {
        var ellipsoid = new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius);
        var result = new Ellipsoid();
        var returnedResult = ellipsoid.clone(result);
        expect(result).toBe(returnedResult);
        expect(ellipsoid.radii).toEqual(returnedResult.radii);
        expect(ellipsoid.radiiSquared).toEqual(returnedResult.radiiSquared);
        expect(ellipsoid.radiiToTheFourth).toEqual(returnedResult.radiiToTheFourth);
        expect(ellipsoid.oneOverRadii).toEqual(returnedResult.oneOverRadii);
        expect(ellipsoid.oneOverRadiiSquared).toEqual(returnedResult.oneOverRadiiSquared);
        expect(ellipsoid.minimumRadius).toEqual(returnedResult.minimumRadius);
        expect(ellipsoid.maximumRadius).toEqual(returnedResult.maximumRadius);
    });

    it('geodeticSurfaceNormalCartographic works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.geodeticSurfaceNormalCartographic(spaceCartographic);
        expect(returnedResult).toEqualEpsilon(spaceCartographicGeodeticSurfaceNormal, CesiumMath.EPSILON15);
    });

    it('geodeticSurfaceNormalCartographic works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartesian3();
        var returnedResult = ellipsoid.geodeticSurfaceNormalCartographic(spaceCartographic, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqualEpsilon(spaceCartographicGeodeticSurfaceNormal, CesiumMath.EPSILON15);
    });

    it('geodeticSurfaceNormal works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.geodeticSurfaceNormal(spaceCartesian);
        expect(returnedResult).toEqualEpsilon(spaceCartesianGeodeticSurfaceNormal, CesiumMath.EPSILON15);
    });

    it('geodeticSurfaceNormal works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartesian3();
        var returnedResult = ellipsoid.geodeticSurfaceNormal(spaceCartesian, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqualEpsilon(spaceCartesianGeodeticSurfaceNormal, CesiumMath.EPSILON15);
    });

    it('cartographicToCartesian works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.cartographicToCartesian(spaceCartographic);
        expect(returnedResult).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
    });

    it('cartographicToCartesian works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartesian3();
        var returnedResult = ellipsoid.cartographicToCartesian(spaceCartographic, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
    });

    it('cartographicArrayToCartesianArray works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.cartographicArrayToCartesianArray([spaceCartographic, surfaceCartographic]);
        expect(returnedResult.length).toEqual(2);
        expect(returnedResult[0]).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
        expect(returnedResult[1]).toEqualEpsilon(surfaceCartesian, CesiumMath.EPSILON7);
    });

    it('cartographicArrayToCartesianArray works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var resultCartesian = new Cartesian3();
        var result = [resultCartesian];
        var returnedResult = ellipsoid.cartographicArrayToCartesianArray([spaceCartographic, surfaceCartographic], result);
        expect(result).toBe(returnedResult);
        expect(result[0]).toBe(resultCartesian);
        expect(returnedResult.length).toEqual(2);
        expect(returnedResult[0]).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
        expect(returnedResult[1]).toEqualEpsilon(surfaceCartesian, CesiumMath.EPSILON7);
    });

    it('cartesianToCartographic works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.cartesianToCartographic(surfaceCartesian);
        expect(returnedResult).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
    });

    it('cartesianToCartographic works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartographic();
        var returnedResult = ellipsoid.cartesianToCartographic(surfaceCartesian, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
    });

    it('cartesianArrayToCartographicArray works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var returnedResult = ellipsoid.cartesianArrayToCartographicArray([spaceCartesian, surfaceCartesian]);
        expect(returnedResult.length).toEqual(2);
        expect(returnedResult[0]).toEqualEpsilon(spaceCartographic, CesiumMath.EPSILON7);
        expect(returnedResult[1]).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON7);
    });

    it('cartesianArrayToCartographicArray works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var resultCartographic = new Cartographic();
        var result = [resultCartographic];
        var returnedResult = ellipsoid.cartesianArrayToCartographicArray([spaceCartesian, surfaceCartesian], result);
        expect(result).toBe(returnedResult);
        expect(result.length).toEqual(2);
        expect(result[0]).toBe(resultCartographic);
        expect(result[0]).toEqualEpsilon(spaceCartographic, CesiumMath.EPSILON7);
        expect(result[1]).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON7);
    });

    it('scaleToGeodeticSurface scaled in the x direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(1.0, 0.0, 0.0);
        var cartesian = new Cartesian3(9.0, 0.0, 0.0);
        var returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeodeticSurface scaled in the y direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.0, 2.0, 0.0);
        var cartesian = new Cartesian3(0.0, 8.0, 0.0);
        var returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeodeticSurface scaled in the z direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.0, 0.0, 3.0);
        var cartesian = new Cartesian3(0.0, 0.0, 8.0);
        var returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeodeticSurface works without a result parameter', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.2680893773941855, 1.1160466902266495, 2.3559801120411263);
        var cartesian = new Cartesian3(4.0, 5.0, 6.0);
        var returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
    });

    it('scaleToGeodeticSurface works with a result parameter', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.2680893773941855, 1.1160466902266495, 2.3559801120411263);
        var cartesian = new Cartesian3(4.0, 5.0, 6.0);
        var result = new Cartesian3();
        var returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
    });

    it('scaleToGeocentricSurface scaled in the x direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(1.0, 0.0, 0.0);
        var cartesian = new Cartesian3(9.0, 0.0, 0.0);
        var returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeocentricSurface scaled in the y direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.0, 2.0, 0.0);
        var cartesian = new Cartesian3(0.0, 8.0, 0.0);
        var returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeocentricSurface scaled in the z direction', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.0, 0.0, 3.0);
        var cartesian = new Cartesian3(0.0, 0.0, 8.0);
        var returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
        expect(returnedResult).toEqual(expected);
    });

    it('scaleToGeocentricSurface works without a result parameter', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.7807200583588266, 0.9759000729485333, 1.1710800875382399);
        var cartesian = new Cartesian3(4.0, 5.0, 6.0);
        var returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
    });

    it('scaleToGeocentricSurface works with a result parameter', function() {
        var ellipsoid = Ellipsoid.fromRadii(1.0, 2.0, 3.0);
        var expected = new Cartesian3(0.7807200583588266, 0.9759000729485333, 1.1710800875382399);
        var cartesian = new Cartesian3(4.0, 5.0, 6.0);
        var result = new Cartesian3();
        var returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
    });

    it('equals works in all cases', function() {
        var radii = new Cartesian3(1.0, 0.0, 0.0);
        var radiiSquared = new Cartesian3(1.0, 2.0, 0.0);
        var radiiToTheFourth = new Cartesian3(1.0, 2.0, 3.0);
        var oneOverRadii = new Cartesian3(4.0, 0.0, 0.0);
        var oneOverRadiiSquared = new Cartesian3(4.0, 5.0, 0.0);
        var minimumRadius = 1.0;
        var maximumRadius = 2.0;
        var ellipsoid = new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius);

        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius))).toEqual(true);
        expect(ellipsoid.equals(new Ellipsoid(radii.add(Cartesian3.UNIT_X), radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared.add(Cartesian3.UNIT_X), radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth.add(Cartesian3.UNIT_X), oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii.add(Cartesian3.UNIT_X), oneOverRadiiSquared, minimumRadius, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared.add(Cartesian3.UNIT_X), minimumRadius, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius + 1.0, maximumRadius))).toEqual(false);
        expect(ellipsoid.equals(new Ellipsoid(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius + 1.0))).toEqual(false);
        expect(ellipsoid.equals(undefined)).toEqual(false);
    });

    it('toString produces expected values', function() {
        var expected = "(1, 2, 3)";
        var ellipsoid = Ellipsoid.fromRadii(1, 2, 3);
        expect(ellipsoid.toString()).toEqual(expected);
    });

    it('fromRadii throw if x less than 0', function() {
        expect(function() {
            Ellipsoid.fromRadii(-1, 0, 0);
        }).toThrow();
    });

    it('fromRadii throw if y less than 0', function() {
        expect(function() {
            Ellipsoid.fromRadii(0, -1, 0);
        }).toThrow();
    });

    it('fromRadii throw if z less than 0', function() {
        expect(function() {
            Ellipsoid.fromRadii(0, 0, -1);
        }).toThrow();
    });

    it('Static clone throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.clone(undefined);
        }).toThrow();
    });

    it('expect Ellipsoid.geocentricSurfaceNormal is be Cartesian3.normalize', function() {
        expect(new Ellipsoid().geocentricSurfaceNormal).toBe(Cartesian3.normalize);
        expect(Ellipsoid.geocentricSurfaceNormal).toBe(Cartesian3.normalize);
    });

    it('Static geodeticSurfaceNormalCartographic throws with no cartographic', function() {
        expect(function() {
            Ellipsoid.geodeticSurfaceNormalCartographic(undefined);
        }).toThrow();
    });

    it('Static geodeticSurfaceNormal throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.geodeticSurfaceNormal(undefined, surfaceCartesian);
        }).toThrow();
    });

    it('Static geodeticSurfaceNormal throws with no cartesian', function() {
        expect(function() {
            Ellipsoid.geodeticSurfaceNormal(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static cartographicToCartesian throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.cartographicToCartesian(undefined, surfaceCartographic);
        }).toThrow();
    });

    it('Static cartographicToCartesian throws with no cartographic', function() {
        expect(function() {
            Ellipsoid.cartographicToCartesian(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static cartographicArrayToCartesianArray throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.cartographicArrayToCartesianArray(undefined, [surfaceCartographic]);
        }).toThrow();
    });

    it('Static cartographicArrayToCartesianArray throws with no cartographics', function() {
        expect(function() {
            Ellipsoid.cartographicArrayToCartesianArray(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static cartesianToCartographic throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.cartesianToCartographic(undefined, surfaceCartesian);
        }).toThrow();
    });

    it('Static cartesianToCartographic throws with no cartesian', function() {
        expect(function() {
            Ellipsoid.cartesianToCartographic(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static cartesianArrayToCartographicArray throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.cartesianArrayToCartographicArray(undefined, [surfaceCartesian]);
        }).toThrow();
    });

    it('Static cartesianArrayToCartographicArray throws with no cartesians', function() {
        expect(function() {
            Ellipsoid.cartesianArrayToCartographicArray(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static scaleToGeodeticSurface throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.scaleToGeodeticSurface(undefined, surfaceCartesian);
        }).toThrow();
    });

    it('Static scaleToGeodeticSurface throws with no cartesian', function() {
        expect(function() {
            Ellipsoid.scaleToGeodeticSurface(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });

    it('Static scaleToGeocentricSurface throws with no ellipsoid', function() {
        expect(function() {
            Ellipsoid.scaleToGeocentricSurface(undefined, surfaceCartesian);
        }).toThrow();
    });

    it('Static scaleToGeocentricSurface throws with no cartesian', function() {
        expect(function() {
            Ellipsoid.scaleToGeocentricSurface(Ellipsoid.WGS84, undefined);
        }).toThrow();
    });
});
