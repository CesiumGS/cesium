/*global defineSuite*/
defineSuite([
        'Core/BingMapsApi'
    ], function(
        BingMapsApi) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('getKey returns provided key if one is provided', function() {
        expect(BingMapsApi.getKey('foo')).toEqual('foo');
    });

    it('getKey returns defaultKey if provided key is undefined', function() {
        var oldKey = BingMapsApi.defaultKey;
        BingMapsApi.defaultKey = 'somekey';
        expect(BingMapsApi.getKey(undefined)).toEqual('somekey');
        BingMapsApi.defaultKey = oldKey;
    });

    it('getKey returns a key even if the provided key and the default key are undefined', function() {
        var oldKey = BingMapsApi.defaultKey;
        BingMapsApi.defaultKey = undefined;
        expect(BingMapsApi.getKey(undefined).length).toBeGreaterThan(0);
        BingMapsApi.defaultKey = oldKey;
    });
});
