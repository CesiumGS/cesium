describe("@see tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/seetag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];

    it('When a symbol has an @see tag, the doclet has a see property that includes that value.', function() {
        expect(typeof foo.see).toEqual('object');
        expect(foo.see[0]).toEqual('{@link bar}');

        expect(typeof bar.see).toEqual('object');
        expect(bar.see[0]).toEqual('http://example.com/someref');
    });
});