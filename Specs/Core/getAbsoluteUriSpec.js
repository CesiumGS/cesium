/*global defineSuite*/
defineSuite([
        'Core/getAbsoluteUri',
        'Core/getBaseUri'
    ], function(
        getAbsoluteUri,
        getBaseUri) {
    'use strict';

    it('works as expected', function() {
        var result = getAbsoluteUri('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('http://www.mysite.com/awesome?makeitawesome=true');

        result = getAbsoluteUri('awesome.png', 'http://test.com');
        expect(result).toEqual('http://test.com/awesome.png');

        result = getAbsoluteUri('awesome.png');
        expect(result).toEqual(getBaseUri(document.location.href) + 'awesome.png');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getAbsoluteUri(undefined);
        }).toThrowDeveloperError();
    });
});
