(function() {
    var srcParser = require('jsdoc/src/parser'),
        doclets;
            
    app.jsdoc.parser = new srcParser.Parser();
    
    require('jsdoc/src/handlers').attachTo(app.jsdoc.parser);
    
    doclets = app.jsdoc.parser.parse(__dirname + '/test/cases/file.js');
    
    test('When a file overview tag appears in a doclet.', function() {
        var m = /^.*([\/\\]cases[\/\\]file\.js)$/.exec(doclets[0].name);
        assert.equal(m.length, 2, 'The name of the doclet should start with file: and should end with the path to the file.');
        assert.equal(doclets[0].name, doclets[0].longname, 'The name and longname should be equal.');
    });

})();