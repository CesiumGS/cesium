(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/constructortag.js'),
        feed = docSet.getByLongname('Feed')[0];
    
    test('When a symbol has an @constructor tag, it is documented as a class.', function() {
        assert.equal(feed.kind, 'class');
    });
    
    test('When a symbol has an @constructor tag and a @class tag, the value of the @class tag becomes the classdesc property.', function() {
        assert.equal(feed.classdesc, 'Describe your class here.');
        assert.equal(feed.description, 'Describe your constructor function here.');
    });
})();