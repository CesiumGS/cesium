/*global describe: true, env: true, expect: true, it: true, jasmine: true */
describe("shout plugin", function() {
    var parser = jasmine.createParser();
    var path = require('jsdoc/path');

    var docSet;

    var pluginPath = 'plugins/shout';
    var pluginPathResolved = path.join(env.dirname, pluginPath);
    var plugin = require(pluginPathResolved);

    require('jsdoc/plugins').installPlugins([pluginPathResolved], parser);
    docSet = jasmine.getDocSetFromFile(pluginPath + '.js', parser);

    it("should make the description uppercase", function() {
        var doclet = docSet.getByLongname("module:plugins/shout.handlers.newDoclet");
        expect(doclet[0].description).toEqual("MAKE YOUR DESCRIPTIONS MORE SHOUTIER.");
    });
});
