defineSuite([
        'Core/getFilenameFromUri'
    ], function(
        getFilenameFromUri) {
    'use strict';

    it('works as expected', function() {
        var result = getFilenameFromUri('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('awesome');

        result = getFilenameFromUri('http://www.mysite.com/somefolder/awesome.png#makeitawesome');
        expect(result).toEqual('awesome.png');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getFilenameFromUri(undefined);
        }).toThrowDeveloperError();
    });
});
