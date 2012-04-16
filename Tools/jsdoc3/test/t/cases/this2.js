(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/this2.js'),
        found = docSet.getByLongname('TemplateBuilder#Template#rendered');
    
    test('When a constructor is nested inside another a constructor.', function() {
        assert.equal(found.length, 1, 'A this member should be like Constructor#Constructor#member.');
        assert.equal(found[0].name,     'rendered', 'The short name should be correct.');
        assert.equal(found[0].memberof, 'TemplateBuilder#Template', 'The memberof should be correct.');
        assert.equal(found[0].scope,    'instance', 'The scope should default to "static".');
    });
  
})();