defineSuite([
        'Core/MapboxApi'
    ], function(
        MapboxApi) {
    'use strict';

    it('getAccessToken returns provided access token if one is provided', function() {
        expect(MapboxApi.getAccessToken('foo')).toEqual('foo');
    });

    it('getAccessToken returns defaultAccessToken if provided access token is undefined', function() {
        var oldAccessToken = MapboxApi.defaultAccessToken;
        MapboxApi.defaultAccessToken = 'someaccesstoken';
        expect(MapboxApi.getAccessToken(undefined)).toEqual('someaccesstoken');
        MapboxApi.defaultAccessToken = oldAccessToken;
    });

    it('getAccessToken returns a access token even if the provided access token and the default access token are undefined', function() {
        var oldAccessToken = MapboxApi.defaultAccessToken;
        MapboxApi.defaultAccessToken = undefined;
        expect(MapboxApi.getAccessToken(undefined).length).toBeGreaterThan(0);
        MapboxApi.defaultAccessToken = oldAccessToken;
    });
});
