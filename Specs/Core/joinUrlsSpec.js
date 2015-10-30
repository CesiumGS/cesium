/*global defineSuite*/
defineSuite([
        'Core/joinUrls',
        'ThirdParty/Uri'
    ], function(
        joinUrls,
        URI) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var queryString = "a=some&b=query";
    var fragment = "#iamaframent";

    var qualifiedUrl = "http://www.url.com";
    var qualifiedUrlWithQueryString = "http://www.url.com" + "?" + queryString;
    var qualifiedUrlWithPath = "http://www.url.com/some/path";

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
        var result = joinUrls(qualifiedUrl, absolutePath);
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

    it('appends qualfied url correctly to qualified url with path', function() {
        var result = joinUrls(qualifiedUrl, qualifiedUrlWithPath);
        expect(result).toEqual(expectedQualifiedUrl);
    });

    it('appends qualfied url with path correctly to qualified url', function() {
        var result = joinUrls(qualifiedUrl, qualifiedUrlWithPath);
        expect(result).toEqual(expectedQualifiedUrl);
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
});
