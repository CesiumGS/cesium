defineSuite([
        'Core/getBaseUri'
    ], function(
        getBaseUri) {
    'use strict';

    it('works as expected', function() {
        var result = getBaseUri('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('http://www.mysite.com/');

        result = getBaseUri('http://www.mysite.com/somefolder/awesome.png#makeitawesome');
        expect(result).toEqual('http://www.mysite.com/somefolder/');
    });

    it('works with includeQuery flag', function() {
        var result = getBaseUri('http://www.mysite.com/awesome?makeitawesome=true', true);
        expect(result).toEqual('http://www.mysite.com/?makeitawesome=true');

        result = getBaseUri('http://www.mysite.com/somefolder/awesome.png#makeitawesome', true);
        expect(result).toEqual('http://www.mysite.com/somefolder/#makeitawesome');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getBaseUri(undefined);
        }).toThrowDeveloperError();
    });
});
