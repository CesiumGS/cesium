/*global defineSuite*/
defineSuite([
        'Core/isCrossOriginUrl',
        'ThirdParty/Uri'
    ], function(
        isCrossOriginUrl,
        Uri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('returns false for relative urls', function() {
        expect(isCrossOriginUrl('/some/url.jpg')).toEqual(false);
        expect(isCrossOriginUrl('some/url.jpg')).toEqual(false);
    });

    it('returns false for absolute urls that are not cross-origin', function() {
        var pageUri = new Uri(location.href);

        var absoluteUrl = new Uri('/some/url.jpg').resolve(pageUri).toString();
        expect(isCrossOriginUrl(absoluteUrl)).toEqual(false);

        absoluteUrl = new Uri('some/url.jpg').resolve(pageUri).toString();
        expect(isCrossOriginUrl(absoluteUrl)).toEqual(false);
    });

    it('returns true for absolute urls that are cross-origin', function() {
        expect(isCrossOriginUrl('http://example.invalid/some/url.jpg')).toEqual(true);

        // a different scheme counts as cross-origin
        var pageUri = new Uri(location.href);
        pageUri.scheme = location.protocol === 'https:' ? 'http' : 'https';

        var absoluteUrl = pageUri.toString();
        expect(isCrossOriginUrl(absoluteUrl)).toEqual(true);

        // so does a different port
        pageUri = new Uri(location.href);
        pageUri.authority = location.hostname + ':' + (+location.port + 1);

        absoluteUrl = pageUri.toString();
        expect(isCrossOriginUrl(absoluteUrl)).toEqual(true);
    });
});