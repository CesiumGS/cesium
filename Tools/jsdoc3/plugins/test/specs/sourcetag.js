describe("sourcetag plugin", function() {
    var parser = new (require("jsdoc/src/parser")).Parser(),
        plugin = require('plugins/sourcetag'),
        docSet;

    installPlugins(['plugins/sourcetag'], parser);
    docSet = jasmine.getDocSetFromFile("plugins/sourcetag.js", parser);

    it("should set the lineno and filename of the doclet's meta property", function() {
        var doclet = docSet.getByLongname("module:plugins/sourcetag.handlers.newDoclet");
        expect(doclet[0].meta).toBeDefined();
        expect(doclet[0].meta.filename).toEqual("sourcetag.js");
        expect(doclet[0].meta.lineno).toEqual(13);
    });
});