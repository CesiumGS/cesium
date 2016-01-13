/*global defineSuite*/
defineSuite([
        'Core/getAbsoluteURL'
    ], function(
        getAbsoluteURL) {
    "use strict";

    it('works as expected', function() {
        var result = getAbsoluteURL('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('http://www.mysite.com/awesome?makeitawesome=true');

        result = getAbsoluteURL('http://www.mysite.com/somefolder/awesome.png#makeitawesome');
        expect(result).toEqual('http://www.mysite.com/somefolder/awesome.png#makeitawesome');

        result = getAbsoluteURL('awesome.png');
        expect(result).toEqual('http://localhost:8080/Specs/awesome.png');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getAbsoluteURL(undefined);
        }).toThrowDeveloperError();
    });
});
