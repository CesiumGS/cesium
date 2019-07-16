defineSuite([
        'Core/Iau2006XysData',
        'Core/defined',
        'Core/Iau2006XysSample',
        'Specs/pollToPromise'
    ], function(
        Iau2006XysData,
        defined,
        Iau2006XysSample,
        pollToPromise) {
    'use strict';

    var xys;

    beforeEach(function() {
        xys = new Iau2006XysData();
    });

    it('returns undefined initially', function() {
        expect(xys.computeXysRadians(2442398, 1234.56)).toBeUndefined();
    });

    it('eventually returns an answer', function() {
        return pollToPromise(function() {
            return defined(xys.computeXysRadians(2442398, 1234.56));
        }).then(function() {
            // Once the data file has been downloaded, later requests
            // within the same chunk return an answer.
            expect(xys.computeXysRadians(2442399, 777.77)).toBeDefined();
        });
    });

    it('returns the same answer as STK Components', function() {
        var result;
        return pollToPromise(function() {
            result = xys.computeXysRadians(2442399, 777.77);
            return defined(result);
        }).then(function() {
            expect(result).toEqual(new Iau2006XysSample(
                -0.0024019733101066816,
                -0.000024843279494458311,
                -0.000000016941747917421229
            ));
        });
    });

    it('returns undefined prior to the XYS table epoch', function() {
        expect(xys.computeXysRadians(2442395, 0.0)).toBeUndefined();
    });

    it('returns undefined after the last XYS table sample', function() {
        expect(xys.computeXysRadians(2442396 + 27427, 0.0)).toBeUndefined();
    });
});
