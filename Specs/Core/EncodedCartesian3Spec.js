/*global defineSuite*/
defineSuite([
        'Core/EncodedCartesian3',
        'Core/Cartesian3'
    ], function(
        EncodedCartesian3,
        Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('construct with default values', function() {
        var encoded = new EncodedCartesian3();
        expect(encoded.high).toEqual(Cartesian3.ZERO);
        expect(encoded.low).toEqual(Cartesian3.ZERO);
    });

    it('fromCartesian encodes a cartesian', function() {
        var c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
        var encoded = EncodedCartesian3.fromCartesian(c);

        // Look mom, no epsilon check.
        expect(encoded.high.x + encoded.low.x).toEqual(-10000000.0);
        expect(encoded.high.y + encoded.low.y).toEqual(0.0);
        expect(encoded.high.z + encoded.low.z).toEqual(10000000.0);
    });

    it('fromCartesian encodes a cartesian with a result parameter', function() {
        var c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
        var encoded = new EncodedCartesian3();
        var encoded2 = EncodedCartesian3.fromCartesian(c, encoded);

        expect(encoded2).toBe(encoded);
        expect(encoded.high.x + encoded.low.x).toEqual(-10000000.0);
        expect(encoded.high.y + encoded.low.y).toEqual(0.0);
        expect(encoded.high.z + encoded.low.z).toEqual(10000000.0);
    });

    it('fromCartesian throws without a cartesian', function() {
        expect(function() {
            EncodedCartesian3.fromCartesian();
        }).toThrow();
    });
});
