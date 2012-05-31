describe("@since tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/sincetag.js'),
        foo = docSet.getByLongname('foo')[0];

    it('When a symbol has an @since tag, the doclet has a since property set to true.', function() {
        expect(foo.since).toEqual('1.2.3');
    });
});