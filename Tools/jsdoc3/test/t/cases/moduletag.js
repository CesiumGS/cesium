(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/moduletag.js'),
        book = docSet.getByLongname('module:bookshelf.Book')[0],
        title = docSet.getByLongname('module:bookshelf.Book#title')[0];
    
    test('When a global symbol starts with "this" and is in a file with a @module tag, the symbol is documented as a member of that module.', function() {
        assert.equal(typeof book, 'object');
        assert.equal(book.memberof, 'module:bookshelf');
    });
    
    test('When an inner symbol starts with "this" and is in a file with a @module tag, the symbol is documented as a member of its enclosing constructor.', function() {
        assert.equal(typeof title, 'object');
        assert.equal(title.memberof, 'module:bookshelf.Book');
    });
})();