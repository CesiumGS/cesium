(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/paramtag.js'),
        find = docSet.getByLongname('find')[0],
        unbind = docSet.getByLongname('unbind')[0],
        bind = docSet.getByLongname('bind')[0],
        getElement = docSet.getByLongname('getElement')[0],
        combine = docSet.getByLongname('combine')[0],
        split = docSet.getByLongname('split')[0],
        commit = docSet.getByLongname('commit')[0];
    
    test('When a symbol has an @param tag with a type before the name, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof find.params, 'object');
        assert.equal(find.params.length, 1);
        assert.equal(find.params[0].type.names.join(', '), 'String, Array<String>');
        assert.equal(find.params[0].name, 'targetName');
        assert.equal(find.params[0].description, 'The name (or names) of what to find.');
    });
    
    test('When a symbol has an @param tag with only a type and name, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof bind.params, 'object');
        assert.equal(bind.params.length, 1);
        assert.equal(bind.params[0].type.names.join(', '), 'function');
        assert.equal(bind.params[0].name, 'callback');
        assert.equal(bind.params[0].description, undefined);
    });
    
    test('When a symbol has an @param tag with only a type, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof unbind.params, 'object');
        assert.equal(unbind.params.length, 1);
        assert.equal(unbind.params[0].type.names.join(', '), 'function');
        assert.equal(unbind.params[0].description, undefined);
    });
    
    test('When a symbol has an @param tag with no type, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof getElement.params, 'object');
        assert.equal(getElement.params.length, 1);
        assert.equal(getElement.params[0].type, undefined);
        assert.equal(getElement.params[0].name, 'id');
        assert.equal(getElement.params[0].description, 'The id of the element.');
    });
    
    test('When a symbol has an @param tag with a non-alpha name like "...", the doclet has a params property that includes that param.', function() {
        assert.equal(typeof combine.params, 'object');
        assert.equal(combine.params.length, 1);
        assert.equal(combine.params[0].type, undefined);
        assert.equal(combine.params[0].name, '...');
        assert.equal(combine.params[0].description, 'Two or more elements.');
    });
    
    test('When a symbol has an @param tag with name followed by a dash, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof split.params, 'object');
        assert.equal(split.params.length, 1);
        assert.equal(split.params[0].type, undefined);
        assert.equal(split.params[0].name, 'delimiter');
        assert.equal(split.params[0].description, 'What to split on.');
    });
    
    test('When a symbol has an @param tag with no name or type, the doclet has a params property that includes that param.', function() {
        assert.equal(typeof commit.params, 'object');
        assert.equal(commit.params.length, 1);
        assert.equal(commit.params[0].type, undefined);
        assert.equal(commit.params[0].description, 'If true make the commit atomic.');
    });
    
    test('When a symbol has an @param tag with no name and a name is given in the code, the doclet has a params property that includes that param with the name from the code.', function() {
        assert.equal(commit.params[0].name, 'atomic');
    });

})();