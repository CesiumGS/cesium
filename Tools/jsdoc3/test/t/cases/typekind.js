(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/typekind.js'),
        blog = docSet.getByLongname('module:blog/server')[0],
        port = docSet.getByLongname('module:blog/server.port')[0];
    
    test('When a module symbol has an kind tag, that includes a {type} clause', function() {
        assert.equal(typeof blog.type, 'object', 'the doclet has a type.');
        assert.equal(blog.type.names.join(', '), 'ConnectServer', 'the doclet has a type property set to that {type} clause.');
    });
    
    test('When a property symbol has an kind tag, that includes a {type} clause', function() {
        assert.equal(typeof port.type, 'object', 'the doclet has a type.');
        assert.equal(port.type.names.join(', '), 'number', 'the doclet has a type property set to that {type} clause.');
    });

})();