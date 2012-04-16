(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/namedFuncStatement.js'),
        fooMember = docSet.getByLongname('Foo#member1')[0],
        fooVariable = docSet.getByLongname('Foo~var1')[0];
    //console.log(docSet);
    test('A symbol that is a member of a named function statement.', function() {
        assert.equal(fooMember.longname, 'Foo#member1', 'is documented as a member of the assigned name.');
    });
    
    test('A symbol that is a variable of a named function statement.', function() {
        assert.equal(fooVariable.longname, 'Foo~var1', 'is documented as a variable of the assigned name.');
    });
})();

(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/namedFuncStatement2.js'),
        fooMember = docSet.getByLongname('Foo#member1')[0],
        fooVariable = docSet.getByLongname('Foo~var1')[0];
    //console.log(docSet);
    test('A symbol that is a member of a named function statement.', function() {
        assert.equal(fooMember.longname, 'Foo#member1', 'is documented as a member of the assigned name.');
    });
    
    test('A symbol that is a variable of a named function statement.', function() {
        assert.equal(fooVariable.longname, 'Foo~var1', 'is documented as a variable of the assigned name.');
    });
})();

(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/namedFuncStatement3.js'),
        fooMember = docSet.getByLongname('ns.Foo#member1')[0],
        fooVariable = docSet.getByLongname('ns.Foo~var1')[0];
    //console.log(docSet);
    test('A symbol that is a member of a named function statement.', function() {
        assert.equal(fooMember.longname, 'ns.Foo#member1', 'is documented as a member of the assigned name.');
    });
    
    test('A symbol that is a variable of a named function statement.', function() {
        assert.equal(fooVariable.longname, 'ns.Foo~var1', 'is documented as a variable of the assigned name.');
    });
})();