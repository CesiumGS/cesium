/*global defineSuite*/
defineSuite([
        'Core/Iau2006XysData',
        'Core/defined'
    ], function(
        Iau2006XysData,
        defined) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var xys;

    beforeEach(function() {
        xys = new Iau2006XysData();
    });

    it('returns undefined initially', function() {
        expect(xys.computeXysRadians(2442398, 1234.56)).toBeUndefined();
    });

    it('eventually returns an answer', function() {
        waitsFor(function() {
            return defined(xys.computeXysRadians(2442398, 1234.56));
        }, 'computeXysRadians to return an answer');

        // Once the data file has been downloaded, later requests
        // within the same chunk return an answer.
        runs(function() {
            expect(xys.computeXysRadians(2442399, 777.77)).toBeDefined();
        });
    });

    it('returns the same answer as STK Components', function() {
        var result;
        waitsFor(function() {
            result = xys.computeXysRadians(2442399, 777.77);
            return defined(result);
        }, 'computeXysRadians to return an answer');

        runs(function() {
            expect(result).toEqual({
                x : -0.0024019733101066816,
                y : -0.000024843279494458311,
                s : -0.000000016941747917421229
            });
        });
    });

    it('returns undefined prior to the XYS table epoch', function() {
        expect(xys.computeXysRadians(2442395, 0.0)).toBeUndefined();
    });

    it('returns undefined after the last XYS table sample', function() {
        expect(xys.computeXysRadians(2442396 + 27427, 0.0)).toBeUndefined();
    });
});