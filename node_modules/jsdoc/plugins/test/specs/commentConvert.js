/*global describe: true, env: true, expect: true, it: true, jasmine: true */
describe("commentConvert plugin", function() {
    var parser = jasmine.createParser();
    var path = require('jsdoc/path');

    var docSet;

    var pluginPath = 'plugins/commentConvert';
    var pluginPathResolved = path.join(env.dirname, pluginPath);
    var plugin = require(pluginPathResolved);

    require('jsdoc/plugins').installPlugins([pluginPathResolved], parser);
    docSet = jasmine.getDocSetFromFile(pluginPath + '.js', parser);

    it("should convert '///-style comments into jsdoc comments", function() {
        var doclet = docSet.getByLongname("module:plugins/commentConvert.handlers.beforeParse");
        expect(doclet.length).toEqual(1);
    });
});
