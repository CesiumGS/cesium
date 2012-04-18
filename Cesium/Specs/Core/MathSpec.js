(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("Math", function () {

        it("sign of -2", function () {
            expect(Cesium.Math.sign(-2)).toEqual(-1);
        });

        it("sign of 2", function () {
            expect(Cesium.Math.sign(2)).toEqual(1);
        });

        it("sign of 0", function () {
            expect(Cesium.Math.sign(0)).toEqual(0);
        });

        ///////////////////////////////////////////////////////////////////////

        it("angleBetween between orthogonal vectors", function () {
            expect(Cesium.Math.angleBetween(Cesium.Cartesian3.getUnitX(), Cesium.Cartesian3.getUnitY())).toEqual(Cesium.Math.PI_OVER_TWO);
        });

        it("angleBetween between colinear vectors", function () {
            expect(Cesium.Math.angleBetween(Cesium.Cartesian3.getUnitX(), Cesium.Cartesian3.getUnitX())).toEqual(0.0);
        });

        it("angleBetween between zero vector", function () {
            expect(Cesium.Math.angleBetween(Cesium.Cartesian3.getUnitX(), Cesium.Cartesian3.getZero())).toEqual(0.0);
        });

        //////////////////////////////////////////////////////////////////////

        it( "cosh", function () {
            expect( Cesium.Math.cosh( 0.0 ) ).toEqual( 1.0 );
            expect( Cesium.Math.cosh( -1.0 ) ).toBeGreaterThan( 1.0 );
            expect( Cesium.Math.cosh( 1.0 ) ).toBeGreaterThan( 1.0 );
        });

        it( "cosh NaN", function () {
            expect( isNaN( Cesium.Math.cosh( NaN ) ) ).toBeTruthy();
        });

        it( "cosh infinity", function () {
            expect( Cesium.Math.cosh( Infinity ) ).toEqual( Infinity );
            expect( Cesium.Math.cosh( -Infinity ) ).toEqual( Infinity );
        });

        it( "sinh", function () {
            expect( Cesium.Math.sinh( 0.0 ) ).toEqual( 0.0 );
            expect( Cesium.Math.sinh( -1.0 ) ).toBeLessThan( 1.0 );
            expect( Cesium.Math.sinh( 1.0 ) ).toBeGreaterThan( 1.0 );
        });

        it( "sinh NaN", function () {
            expect( isNaN( Cesium.Math.sinh( NaN ) ) ).toBeTruthy();
        });

        it( "sinh infinity", function () {
            expect( Cesium.Math.sinh( Infinity ) ).toEqual( Infinity );
            expect( Cesium.Math.sinh( -Infinity ) ).toEqual( -Infinity );
        });

        ///////////////////////////////////////////////////////////////////////

        it("lerps at time 0", function () {
            expect(Cesium.Math.lerp(1.0, 2.0, 0.0)).toEqual(1.0);
        });

        it("lerps at time 0.5", function () {
            expect(Cesium.Math.lerp(1.0, 2.0, 0.5)).toEqual(1.5);
        });

        it("lerps at time 1", function () {
            expect(Cesium.Math.lerp(1.0, 2.0, 1.0)).toEqual(2.0);
        });

        ///////////////////////////////////////////////////////////////////////

        it("toRadians", function () {
            expect(Cesium.Math.toRadians(360.0)).toEqual(2 * Math.PI);
        });

        it("cartographic3ToRadians", function () {
            var c = Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(360.0, 180.0, 1.0));
            expect(c.longitude).toEqual(2.0 * Math.PI);
            expect(c.latitude).toEqual(Math.PI);
            expect(c.height).toEqual(1.0);
        });

        it("cartographic2ToRadians", function () {
            var c = Cesium.Math.cartographic2ToRadians(new Cesium.Cartographic2(180.0, 360.0));
            expect(c.longitude).toEqual(Math.PI);
            expect(c.latitude).toEqual(2.0 * Math.PI);
        });

        it("toDegrees", function () {
            expect(Cesium.Math.toDegrees(Math.PI)).toEqual(180.0);
        });

        it("cartographic3ToDegrees", function () {
            var c = Cesium.Math.cartographic3ToDegrees(new Cesium.Cartographic3(2.0 * Math.PI, Math.PI, 1.0));
            expect(c.longitude).toEqual(360.0);
            expect(c.latitude).toEqual(180.0);
            expect(c.height).toEqual(1.0);
        });

        it("cartographic2ToDegrees", function () {
            var c = Cesium.Math.cartographic2ToDegrees(new Cesium.Cartographic2(Math.PI, 2.0 * Math.PI));
            expect(c.longitude).toEqual(180.0);
            expect(c.latitude).toEqual(360.0);
        });

        it("convertLongitudeRange (1)", function () {
            expect(Cesium.Math.convertLongitudeRange(Cesium.Math.THREE_PI_OVER_TWO)).toEqualEpsilon(-Cesium.Math.PI_OVER_TWO, Cesium.Math.EPSILON16);
        });

        it("convertLongitudeRange (2)", function () {
            expect(Cesium.Math.convertLongitudeRange(-Math.PI)).toEqualEpsilon(-Math.PI, Cesium.Math.EPSILON16);
        });

        it("convertLongitudeRange (3)", function () {
            expect(Cesium.Math.convertLongitudeRange(Math.PI)).toEqualEpsilon(-Math.PI, Cesium.Math.EPSILON16);
        });
        
        it("negativePiToPi positive", function(){
            expect(Cesium.Math.negativePiToPi((Math.PI / 2) * Math.PI)).toEqualEpsilon((Math.PI / 2) * Math.PI - Cesium.Math.TWO_PI, Cesium.Math.EPSILON16);
            expect(Cesium.Math.negativePiToPi(Math.PI / 0.5)).toEqualEpsilon(0.0, Cesium.Math.EPSILON16);
        });
        
        it("negativePiToPi negative", function(){
            expect(Cesium.Math.negativePiToPi(-Math.PI / 0.5)).toEqualEpsilon(0.0, Cesium.Math.EPSILON16);
            expect(Cesium.Math.negativePiToPi(-(Math.PI / 2) * Math.PI)).toEqualEpsilon(-(Math.PI / 2) * Math.PI + Cesium.Math.TWO_PI, Cesium.Math.EPSILON16);
        });
        
        it("negativePiToPi should not change", function(){
            expect(Cesium.Math.negativePiToPi(Math.PI - 1)).toEqualEpsilon(Math.PI - 1, Cesium.Math.EPSILON16);
            expect(Cesium.Math.negativePiToPi(-Math.PI + 1)).toEqualEpsilon(-Math.PI + 1, Cesium.Math.EPSILON16);
        });
    });
}());