describe("commentConvert plugin", function() {
    var parser = new (require("jsdoc/src/parser")).Parser(),
        plugin = require('plugins/commentConvert'),
        docSet;

    installPlugins(['plugins/commentConvert'], parser);
    docSet = jasmine.getDocSetFromFile("plugins/commentConvert.js", parser);

    it("should convert '///-style comments into jsdoc comments", function() {
        var doclet = docSet.getByLongname("module:plugins/commentConvert.handlers.beforeParse");
        expect(doclet.length).toEqual(1);
    });
});