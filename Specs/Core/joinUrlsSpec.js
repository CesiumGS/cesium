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

    it('appends slash by default', function() {
        expect(joinUrls(qualifiedUrl, absolutePath)).toEqual(expectedQualifiedUrl);
    });

    it('does not append slash when appendSlash is false', function() {
        expect(joinUrls(absolutePath, relativePath, false)).toEqual(absolutePath+relativePath);
    });

    it('appends absolute path correctly to qualified url', function() {
        expect(joinUrls(qualifiedUrl, absolutePath)).toEqual(expectedQualifiedUrl);
    });

    it('appends relative path correctly to qualified url', function() {
        expect(joinUrls(qualifiedUrl, absolutePath)).toEqual(expectedQualifiedUrl);
    });

    it('appends absolute path correctly to qualified url with path', function() {
        expect(joinUrls(qualifiedUrlWithPath, absolutePath))
        .toEqual(qualifiedUrlWithPath+absolutePath);
    });

    it('appends relative path correctly to qualified url with path', function() {
        expect(joinUrls(qualifiedUrlWithPath, relativePath))
        .toEqual(qualifiedUrlWithPath+absolutePath);
    });

    it('appends relative path correctly to relative path', function() {
        expect(joinUrls(relativePath, relativePath)).toEqual(expectedRelativePath);
    });

    it('appends absolute path correctly to relative path', function() {
        expect(joinUrls(relativePath, absolutePath)).toEqual(expectedRelativePath);
    });

    it('appends relative path correctly to absolute path', function() {
        expect(joinUrls(absolutePath, relativePath)).toEqual(expectedAbsolutePath);
    });

    it('appends absolute path correctly to absolute path', function() {
        expect(joinUrls(absolutePath, absolutePath)).toEqual(expectedAbsolutePath);
    });

    it('appends qualfied url correctly to qualified url', function() {
        expect(joinUrls(qualifiedUrl, qualifiedUrl)).toEqual(qualifiedUrl+"/");
    });

    it('appends qualfied url correctly to qualified url with path', function() {
        expect(joinUrls(qualifiedUrl, qualifiedUrlWithPath)).toEqual(expectedQualifiedUrl);
    });

    it('appends qualfied url with path correctly to qualified url', function() {
        expect(joinUrls(qualifiedUrl, qualifiedUrlWithPath)).toEqual(expectedQualifiedUrl);
    });

    it('appends qualfied url with path correctly to qualified url with path', function() {
        expect(joinUrls(qualifiedUrlWithPath, qualifiedUrlWithPath))
        .toEqual(qualifiedUrlWithPath+absolutePath);
    });

    it('appends absolute path correctly to qualified url with query string', function() {
        expect(joinUrls(qualifiedUrlWithQueryString, absolutePath))
        .toEqual(expectedQualifiedUrlWithQueryString);
    });

    it('appends relative path correctly to qualified url with query string', function() {
        expect(joinUrls(qualifiedUrlWithQueryString, relativePath)).
        toEqual(expectedQualifiedUrlWithQueryString);
    });

    it('appends absolute path correctly to absolute path with query string', function() {
        expect(joinUrls(absolutePathWithQueryString, absolutePath))
        .toEqual(expectedAbsolutePathWithQueryString);
    });

    it('appends relative path correctly to absolute path with query string', function() {
        expect(joinUrls(absolutePathWithQueryString, relativePath))
        .toEqual(expectedAbsolutePathWithQueryString);
    });

    it('appends absolute path with query string correctly to absolute path with query string', function() {
        expect(joinUrls(absolutePathWithQueryString, absolutePathWithQueryString))
        .toEqual(expectedAbsolutePathWithQueryString + "&" + queryString);
    });

    it('accepts URIs', function() {
        expect(joinUrls(qualifiedUri, pathUri))
        .toEqual(expectedQualifiedUrl);
    });

    it('accepts URIs and strings', function() {
        expect(joinUrls(qualifiedUri, absolutePath))
        .toEqual(expectedQualifiedUrl);
    });

});