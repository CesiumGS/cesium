(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/constructstag5.js'),
        duck = docSet.getByLongname('Duck').filter(function($) {
            return ! $.undocumented;
        })[0];
    
    test('When a object literal property has an @constructs tag with no value, and the object has a @lends, the property is documented as the lent class.', function() {
        assert.equal(duck.longname, 'Duck');
        assert.equal(duck.kind, 'class');
        assert.equal(duck.description, 'Constructs a duck.');
    });
    
})();