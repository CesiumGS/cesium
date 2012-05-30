describe("@overview tag", function() {
    var parser = require('jsdoc/src/parser'),
        srcParser = new parser.Parser(),
        doclets;

    require('jsdoc/src/handlers').attachTo(srcParser);
    doclets = srcParser.parse(__dirname + '/test/fixtures/file.js');

    it('When a file overview tag appears in a doclet, the name of the doclet should start with file: and should end with the path to the file.', function() {
        expect(doclets[0].name).toMatch(/^.*([\/\\]fixtures[\/\\]file\.js)$/);
    });

    it("The name and longname should be equal", function() {
        expect(doclets[0].name).toEqual(doclets[0].longname);
    });
});