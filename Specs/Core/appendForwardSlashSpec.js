defineSuite([
        'Core/appendForwardSlash'
    ], function(
        appendForwardSlash) {
    'use strict';

    it('Appends to a url', function() {
        expect(appendForwardSlash('http://cesiumjs.org')).toEqual('http://cesiumjs.org/');
    });

    it('Does not append to a url', function() {
        expect(appendForwardSlash('http://cesiumjs.org/')).toEqual('http://cesiumjs.org/');
    });

    it('Appends to an empty string', function() {
        expect(appendForwardSlash('')).toEqual('/');
    });
});
