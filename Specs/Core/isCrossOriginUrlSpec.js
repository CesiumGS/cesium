import { getAbsoluteUri } from '../../Source/Cesium.js';
import { isCrossOriginUrl } from '../../Source/Cesium.js';
import { Uri } from '../../Source/Cesium.js';

describe('Core/isCrossOriginUrl', function() {

    it('returns false for relative urls', function() {
        expect(isCrossOriginUrl('/some/url.jpg')).toEqual(false);
        expect(isCrossOriginUrl('some/url.jpg')).toEqual(false);
    });

    it('returns false for absolute urls that are not cross-origin', function() {

        var absoluteUrl = getAbsoluteUri('/some/url.jpg');
        expect(isCrossOriginUrl(absoluteUrl)).toEqual(false);

        absoluteUrl = getAbsoluteUri('some/url.jpg');
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
