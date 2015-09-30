/*global defineSuite*/
defineSuite([
        'Core/joinUrls',
        'ThirdParty/Uri'
    ], function(
        joinUrls,
        URI) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var qulifiedUrl = "http://www.url.com";
    var qulifiedUrlWithPath= "http://www.url.com/some/path";

    var absolutePath = "/some/path";
    var relativePath = "some/path";

    var absoluteFileUrl = "/file.extension";
    var relativeFileUrl = "file.extension";


    it('appends correctly to qulified url', function() {
        expect(joinUrls(goodFirstUrl1, goodSecondUrl2, false)).toEqual(goodFirstUrl1+goodSecondUrl2);
    });

    it('appendes correctly to url path', function() {
        expect(joinUrls(goodFirstUrl2, goodSecondUrl2, false)).toEqual(goodFirstUrl2+goodSecondUrl2);
    });

    it('works when appendSlash is undefined', function() {
        expect(joinUrls(goodFirstUrl1, goodSecondUrl2)).toEqual(true);
    });

    it('appendes correctly when both urls are qualified', function() {
        expect(joinUrls(goodFirstUrl2, goodSecondUrl2, false)).toEqual(goodFirstUrl1+goodSecondUrl2);
    });


});