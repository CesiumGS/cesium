(function() {
    var srcParser = require('jsdoc/src/parser'),
        doclets;
    
    env.opts._ = [__dirname + '/test/cases/modules/'];
    
    app.jsdoc.parser = new srcParser.Parser();
    
    require('jsdoc/src/handlers').attachTo(app.jsdoc.parser);
    
    doclets = app.jsdoc.parser.parse(__dirname + '/test/cases/modules/data/mod-2.js')
    
    test('When a module has a name documented, that name is used.', function() {
        assert.ok(doclets.length > 1);
        assert.equal(doclets[0].longname, 'module:my/module/name');
    });

})();