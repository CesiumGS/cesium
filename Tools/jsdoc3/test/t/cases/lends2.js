(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/lends2.js'),
        person = docSet.getByLongname('Person').filter(function($) {
            return ! $.undocumented;
        })[0],
        say = docSet.getByLongname('Person#say'),
        name = docSet.getByLongname('Person#name')
    
    test('When a documented member is inside an objlit associated with a @lends tag.', function() {
        assert.equal(person.description, 'Construct a Person.', 'A tag with a @constructs tag is documented as a constructor.');
        assert.equal(say.length, 1, 'The member should be documented as a member of the lendee.');
        assert.equal(name.length, 1, 'The this member should be documented as a member of the lendee.');
    });

})();