defineSuite([
        'Core/getExtensionFromUri'
    ], function(
        getExtensionFromUri) {
    'use strict';

    it('works as expected', function() {
        var result = getExtensionFromUri('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('');

        result = getExtensionFromUri('http://www.mysite.com/somefolder/awesome.png#makeitawesome');
        expect(result).toEqual('png');

        result = getExtensionFromUri('awesome.png');
        expect(result).toEqual('png');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getExtensionFromUri(undefined);
        }).toThrowDeveloperError();
    });
});
