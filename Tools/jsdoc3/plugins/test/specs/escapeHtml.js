describe("escapeHtml plugin", function() {
    var parser = new (require("jsdoc/src/parser")).Parser(),
        plugin = require('plugins/escapeHtml'),
        docSet;

    installPlugins(['plugins/escapeHtml'], parser);
    docSet = jasmine.getDocSetFromFile("plugins/escapeHtml.js", parser);

    it("should escape '&', '<' and newlines in doclet descriptions", function() {
        var doclet = docSet.getByLongname("module:plugins/escapeHtml.handlers.newDoclet");
        expect(doclet[0].description).toEqual("Translate HTML tags in descriptions into safe entities.<br>        Replaces &lt;, &amp; and newlines");
    });
});