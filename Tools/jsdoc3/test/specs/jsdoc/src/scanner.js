describe("jsdoc/src/scanner", function() {
    var scanner = new (require('jsdoc/src/scanner').Scanner)(),
        includeMatch = new RegExp(".+\\.js(doc)?$"),
        excludeMatch = new RegExp("(^|\\/)_"),
        sourceFiles = scanner.scan([__dirname+'/test/fixtures/src/'], 3, includeMatch, excludeMatch);

    sourceFiles = sourceFiles.map(function($) {
        return $.replace(__dirname, '');
    });

    it("should return the correct source files", function() {
        expect(sourceFiles.length).toEqual(3);
        expect(sourceFiles.indexOf("/test/fixtures/src/one.js")).toBeGreaterThan(-1);
        expect(sourceFiles.indexOf("/test/fixtures/src/two.js")).toBeGreaterThan(-1);
        expect(sourceFiles.indexOf("/test/fixtures/src/dir1/three.js")).toBeGreaterThan(-1);
    });
});