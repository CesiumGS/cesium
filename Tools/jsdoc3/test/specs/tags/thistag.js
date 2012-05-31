describe("@this tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/thistag.js'),
        setName = docSet.getByLongname('setName')[0],
        fooName = docSet.getByLongname('Foo#name')[0];

    it('When a symbol has a @this tag, the doclet has a this property that is set to that value.', function() {
        expect(setName['this']).toEqual('Foo');
    });

    it('When a this symbol is documented inside a function with a @this tag, the symbol is documented as a member of that tags value.', function() {
        expect(typeof fooName).toEqual('object');
        expect(fooName.name).toEqual('name');
        expect(fooName.memberof).toEqual('Foo');
        expect(fooName.scope).toEqual('instance');
    });
});