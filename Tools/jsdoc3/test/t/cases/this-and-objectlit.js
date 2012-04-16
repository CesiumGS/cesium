/** @constructor */
function Page(title) {
    this.parts = {
        title: title,
        body: {
            /** document me */
            heading: '',
            main: ''
        }
    }
}

(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/this-and-objectlit.js'),
        found = docSet.getByLongname('Page#parts.body.heading');
    
    test('When a member is nested inside an objectlit this property inside a constructor.', function() {
        assert.equal(found.length, 1, 'A this member should be like Constructor#objlit.member.');
        assert.equal(found[0].name,     'heading', 'The short name should be correct.');
        assert.equal(found[0].memberof, 'Page#parts.body', 'The memberof should be correct.');
        assert.equal(found[0].scope,    'static', 'The scope should default to "static".');
    });
  
})();