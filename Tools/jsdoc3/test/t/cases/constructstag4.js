(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/constructstag4.js'),
        person = docSet.getByLongname('Person').filter(function($) {
            return ! $.undocumented;
        })[0],
        personName = docSet.getByLongname('Person#name')[0];
    
    test('When a function symbol has an @constructs tag with no value, in a @lends block with a "Name#" value, the function is documented as a constructor of "Name".', function() {
        assert.equal(person.kind, 'class');
    });
    
    test('When a function symbol has an @constructs tag with no value, any this-variables are ducumented as instance members of the class.', function() {
        assert.equal(personName.memberof, 'Person');
        assert.equal(personName.scope, 'instance');
    });
    
})();