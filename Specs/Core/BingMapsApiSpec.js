defineSuite([
        'Core/BingMapsApi'
    ], function(
        BingMapsApi) {
    'use strict';

    it('getKey returns provided key if one is provided', function() {
        expect(BingMapsApi.getKey('foo')).toEqual('foo');
    });

    it('getKey returns defaultKey if provided key is undefined', function() {
        var oldKey = BingMapsApi.defaultKey;
        BingMapsApi.defaultKey = 'somekey';
        expect(BingMapsApi.getKey(undefined)).toEqual('somekey');
        BingMapsApi.defaultKey = oldKey;
    });
});
