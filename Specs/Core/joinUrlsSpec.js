defineSuite([
        'Core/joinUrls',
        'ThirdParty/Uri'
    ], function(
        joinUrls,
        URI) {
    'use strict';

    var queryString = "a=some&b=query";
    var fragment = "#iamaframent";

    var qualifiedUrl = "http://www.url.com";
    var qualifiedUrlWithQueryString = "http://www.url.com" + "?" + queryString;
    var qualifiedUrlWithPath = "http://www.url.com/some/qualified/path";

    // Local files require three slashes on the front, to leave the hostname blank.
    // Windows is leanient so long as a drive letter is present.  Other systems are not.
    var localFileUrlWithPath = "file:///mnt/local/path";
    var driveUrlWithPath = "file:///c:/some/drive/path";
    // Files can be read from network shares with only two slashes on the front.
    var networkUrlWithPath = "file://networkShareHostname/some/remote/path";

    var absolutePath = "/some/path";
    var absolutePathWithQueryString = absolutePath + "?" + queryString;
    var relativePath = "some/path";

    var expectedQualifiedUrl = qualifiedUrl + absolutePath;

    var expectedRelativePath = relativePath + absolutePath;
    var expectedAbsolutePath = absolutePath + absolutePath;

    var expectedQualifiedUrlWithQueryString = expectedQualifiedUrl + "?" + queryString;
    var expectedAbsolutePathWithQueryString = expectedAbsolutePath + "?" + queryString;

    var qualifiedUri = new URI(qualifiedUrl);
    var pathUri = new URI(absolutePath);

    it('throws with undefined first', function() {
        expect(function() {
            joinUrls(undefined, absolutePath);
        }).toThrowDeveloperError();
    });

    it('throws with undefined second', function() {
        expect(function() {
            joinUrls(qualifiedUrl, undefined);
        }).toThrowDeveloperError();
    });

    it('appends slash by default', function() {
        var result = joinUrls(qualifiedUrl, absolutePath);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('does not append slash when appendSlash is false', function() {
        var result = joinUrls(absolutePath, relativePath, false);
        expect(result).toEqual(absolutePath + relativePath);
    });

    it('appends absolute path correctly to qualified url', function() {
        var result = joinUrls(qualifiedUrl, absolutePath);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('appends relative path correctly to qualified url', function() {
        var result = joinUrls(qualifiedUrl, relativePath);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('appends absolute path correctly to qualified url with path', function() {
        var result = joinUrls(qualifiedUrlWithPath, absolutePath);
        expect(result).toEqual(qualifiedUrlWithPath + absolutePath);
    });

    it('appends relative path correctly to qualified url with path', function() {
        var result = joinUrls(qualifiedUrlWithPath, relativePath);
        expect(result).toEqual(qualifiedUrlWithPath + absolutePath);
    });

    it('appends relative path correctly to relative path', function() {
        var result = joinUrls(relativePath, relativePath);
        expect(result).toEqual(expectedRelativePath);
    });

    it('appends absolute path correctly to relative path', function() {
        var result = joinUrls(relativePath, absolutePath);
        expect(result).toEqual(expectedRelativePath);
    });

    it('appends relative path correctly to absolute path', function() {
        var result = joinUrls(absolutePath, relativePath);
        expect(result).toEqual(expectedAbsolutePath);
    });

    it('appends absolute path correctly to absolute path', function() {
        var result = joinUrls(absolutePath, absolutePath);
        expect(result).toEqual(expectedAbsolutePath);
    });

    it('appends qualfied url correctly to qualified url', function() {
        var result = joinUrls(qualifiedUrl, qualifiedUrl);
        expect(result).toEqual(qualifiedUrl);
    });

    it('appends qualfied url with path correctly to qualified url', function() {
        var result = joinUrls(qualifiedUrl, qualifiedUrlWithPath);
        expect(result).toEqual(qualifiedUrlWithPath);
    });

    it('appends qualfied url with path correctly to qualified url with path', function() {
        var result = joinUrls(qualifiedUrlWithPath, qualifiedUrlWithPath);
        expect(result).toEqual(qualifiedUrlWithPath);
    });

    it('appends absolute path correctly to qualified url with query string', function() {
        var result = joinUrls(qualifiedUrlWithQueryString, absolutePath);
        expect(result).toEqual(expectedQualifiedUrlWithQueryString);
    });

    it('appends relative path correctly to qualified url with query string', function() {
        var result = joinUrls(qualifiedUrlWithQueryString, relativePath);
        expect(result).toEqual(expectedQualifiedUrlWithQueryString);
    });

    it('appends absolute path correctly to absolute path with query string', function() {
        var result = joinUrls(absolutePathWithQueryString, absolutePath);
        expect(result).toEqual(expectedAbsolutePathWithQueryString);
    });

    it('appends relative path correctly to absolute path with query string', function() {
        var result = joinUrls(absolutePathWithQueryString, relativePath);
        expect(result).toEqual(expectedAbsolutePathWithQueryString);
    });

    it('appends absolute path with query string correctly to absolute path with query string', function() {
        var result = joinUrls(absolutePathWithQueryString, absolutePathWithQueryString);
        expect(result).toEqual(expectedAbsolutePathWithQueryString + "&" + queryString);
    });

    it('accepts URIs', function() {
        var result = joinUrls(qualifiedUri, pathUri);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('accepts URIs and strings', function() {
        var result = joinUrls(qualifiedUri, absolutePath);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('works with fragments for first url', function() {
        var result = joinUrls(absolutePath + fragment, absolutePath);
        expect(result).toEqual(expectedAbsolutePath + fragment);
    });

    it('works with fragments for second url', function() {
        var result = joinUrls(absolutePath, absolutePath + fragment);
        expect(result).toEqual(expectedAbsolutePath + fragment);
    });

    it('works with trailing slash for first url', function() {
        var result = joinUrls('http://www.xyz.com/', 'MODULE');
        expect(result).toEqual('http://www.xyz.com/MODULE');
    });

    it('does not join data uris', function() {
        var dataUri = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D';
        var result = joinUrls(dataUri, relativePath);
        expect(result).toEqual(dataUri);

        result = joinUrls(absolutePath, dataUri);
        expect(result).toEqual(dataUri);
    });

    // File scheme tests
    //
    // NOTE: Following example set by 'appends absolute path correctly to qualified url with path',
    // the so-called 'absolutePath' is expected to simply append to the existing path, not reset it.

    it('appends absolute path correctly to local file with path', function() {
        var result = joinUrls(localFileUrlWithPath, absolutePath);
        expect(result).toEqual(localFileUrlWithPath + absolutePath);
    });

    it('appends relative path correctly to local file with path', function() {
        var result = joinUrls(localFileUrlWithPath, relativePath);
        expect(result).toEqual(localFileUrlWithPath + absolutePath);
    });

    it('appends absolute path correctly to drive letter with path', function() {
        var result = joinUrls(driveUrlWithPath, absolutePath);
        expect(result).toEqual(driveUrlWithPath + absolutePath);
    });

    it('appends relative path correctly to drive letter with path', function() {
        var result = joinUrls(driveUrlWithPath, relativePath);
        expect(result).toEqual(driveUrlWithPath + absolutePath);
    });

    it('appends absolute path correctly to network share with path', function() {
        var result = joinUrls(networkUrlWithPath, absolutePath);
        expect(result).toEqual(networkUrlWithPath + absolutePath);
    });

    it('appends relative path correctly to network share with path', function() {
        var result = joinUrls(networkUrlWithPath, relativePath);
        expect(result).toEqual(networkUrlWithPath + absolutePath);
    });

    it('works when the file scheme appears in the second path', function() {
        var result = joinUrls(driveUrlWithPath, localFileUrlWithPath);
        expect(result).toEqual(localFileUrlWithPath);
    });

    it('works when a drive letter appears in the second path', function() {
        var result = joinUrls(localFileUrlWithPath, driveUrlWithPath);
        expect(result).toEqual(driveUrlWithPath);
    });

    it('works when the first is a network file and the second is a local file', function() {
        var result = joinUrls(networkUrlWithPath, localFileUrlWithPath);
        expect(result).toEqual(localFileUrlWithPath);
    });

    it('works when the first is a local file and the second is a network file', function() {
        var result = joinUrls(localFileUrlWithPath, networkUrlWithPath);
        expect(result).toEqual(networkUrlWithPath);
    });
});
