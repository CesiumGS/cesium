/*global defineSuite*/
defineSuite([
        'Core/isDataUri'
    ], function(
        isDataUri) {
    'use strict';

    it('Determines that a uri is not a data uri', function() {
        expect(isDataUri(undefined)).toEqual(false);
        expect(isDataUri('http://cesiumjs.org/')).toEqual(false);
    });

    it('Determines that a uri is a data uri', function() {
        var uri = 'data:text/plain;base64,' + btoa('a data uri');
        expect(isDataUri(uri)).toEqual(true);
    });
});
