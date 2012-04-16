(function() {
    var srcParser = require('jsdoc/src/parser'),
        doclets;
    
    env.opts._ = [__dirname + '/test/cases/modules/'];
    
    app.jsdoc.parser = new srcParser.Parser();
    
    require('jsdoc/src/handlers').attachTo(app.jsdoc.parser);
    
    doclets = app.jsdoc.parser.parse(__dirname + '/test/cases/modules/data/mod-1.js')
    
    test('When a module has no name documented, the name comes from the file path.', function() {
        assert.ok(doclets.length > 1);
        assert.equal(doclets[0].longname, 'module:data/mod-1');
    });

})();