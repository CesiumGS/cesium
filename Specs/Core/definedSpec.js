/*global defineSuite*/
defineSuite([
        'Core/defined'
    ], function(
        defined) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var obj = 42;
    var obj2;

    it('works for defined object', function() {
        expect(defined(obj)).toEqual(true);
    });

    it('works for undefined object', function() {
        expect(defined(obj2)).toEqual(false);
    });
});