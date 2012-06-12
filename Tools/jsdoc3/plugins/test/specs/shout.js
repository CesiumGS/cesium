describe("shout plugin", function() {
    var parser = new (require("jsdoc/src/parser")).Parser(),
        plugin = require('plugins/shout'),
        docSet;

    installPlugins(['plugins/shout'], parser);
    docSet = jasmine.getDocSetFromFile("plugins/shout.js", parser);

    it("should make the description uppercase", function() {
        var doclet = docSet.getByLongname("module:plugins/shout.handlers.newDoclet");
        expect(doclet[0].description).toEqual("MAKE YOUR DESCRIPTIONS MORE SHOUTIER.");
    });
});