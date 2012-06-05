describe("module names", function() {
    var parser = require('jsdoc/src/parser'),
        srcParser = null, doclets;

    beforeEach(function() {
        env.opts._ = [__dirname + '/test/fixtures/modules/'];
        srcParser = new parser.Parser();
        require('jsdoc/src/handlers').attachTo(srcParser);
    });

    it("should create a name from the file path when no documented module name exists", function() {
        doclets = srcParser.parse(__dirname + '/test/fixtures/modules/data/mod-1.js');
        expect(doclets.length).toBeGreaterThan(1);
        expect(doclets[0].longname).toEqual('module:data/mod-1');
    });

    it("should use the documented module name if available", function() {
        doclets = srcParser.parse(__dirname + '/test/fixtures/modules/data/mod-2.js');
        expect(doclets.length).toBeGreaterThan(1);
        expect(doclets[0].longname).toEqual('module:my/module/name');
    });
});