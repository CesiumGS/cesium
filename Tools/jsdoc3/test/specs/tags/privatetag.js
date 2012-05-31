describe("@private tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/privatetag.js'),
        foo = docSet.getByLongname('Foo')[0],
        bar = docSet.getByLongname('Foo#bar')[0];

    it('When a symbol has an @private tag, the doclet has an access property that is "private".', function() {
        expect(foo.access).toEqual('private');
    });
});