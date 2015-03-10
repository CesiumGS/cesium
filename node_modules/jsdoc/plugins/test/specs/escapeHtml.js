/*global describe: true, env: true, expect: true, it: true, jasmine: true */
describe("escapeHtml plugin", function() {
    var parser = jasmine.createParser();
    var path = require('jsdoc/path');

    var docSet;

    var pluginPath = 'plugins/escapeHtml';
    var pluginPathResolved = path.join(env.dirname,pluginPath);
    var plugin = require(pluginPathResolved);

    require('jsdoc/plugins').installPlugins([pluginPathResolved], parser);
    docSet = jasmine.getDocSetFromFile(pluginPath + '.js', parser);

    it("should escape '&', '<' and newlines in doclet descriptions", function() {
        var doclet = docSet.getByLongname("module:plugins/escapeHtml.handlers.newDoclet");
        expect(doclet[0].description).toEqual("Translate HTML tags in descriptions into safe entities.<br>        Replaces &lt;, &amp; and newlines");
    });
});
