(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/enumtag.js'),
        tristate = docSet.getByLongname('TriState')[0];
    
    //console.log(docSet);
    
    test('When a symbol has a @enum tag, it has a properties array.', function() {
        assert.equal(typeof tristate.properties, 'object');
    });
    
    test('If no @type is given for the property it is inherted from the enum.', function() {
        assert.equal(tristate.properties[0].type.names.join(', '), 'number');
    });
    
    test('If no no comment is given for the property it is still included in the enum.', function() {
        assert.equal(tristate.properties[1].longname, 'TriState.FALSE');
        assert.equal(typeof tristate.properties[1].undocumented, 'undefined');
    });
    
    test('A property of an enum gets its defaultvalue set.', function() {
        assert.equal(tristate.properties[1].defaultvalue, -1);
    });
    
    test('If a @type is given for the property it is reflected in the property value.', function() {
        assert.equal(tristate.properties[2].type.names.join(', '), 'boolean');
    });
})();