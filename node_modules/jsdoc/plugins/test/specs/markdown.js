/*global describe: true, env: true, expect: true, it: true, jasmine: true */

var path = require('jsdoc/path');

describe("markdown plugin", function() {
    //TODO
});

describe("markdown see tag support", function() {
    var pluginPath = 'plugins/markdown';
    var pluginPathResolved = path.join(env.dirname, pluginPath);
    var plugin = require(pluginPathResolved);

    var docSet = jasmine.getDocSetFromFile('plugins/test/fixtures/seetag-markdown.js');
    var foo = docSet.getByLongname('foo')[0];
    var bar = docSet.getByLongname('bar')[0];

    it ('should parse @see tags containing links', function() {
        plugin.handlers.newDoclet({doclet:foo});
        expect(typeof foo).toEqual('object');
        expect(foo.see[0]).toEqual('<p><a href="http://nowhere.com">Nowhere</a></p>');
    });

    it ('should not parse @see tags that do not contain links', function() {
        plugin.handlers.newDoclet({doclet:bar});
        expect(typeof bar).toEqual('object');
        expect(bar.see[0]).toEqual('AnObject#myProperty');
    });
});
