describe("@returns tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/returnstag.js'),
        find = docSet.getByLongname('find')[0],
        bind = docSet.getByLongname('bind')[0];

    it('When a symbol has an @returns tag with a type and description, the doclet has a returns array that includes that return.', function() {
        expect(typeof find.returns).toEqual('object');
        expect(find.returns.length).toEqual(1);
        expect(find.returns[0].type.names.join(', ')).toEqual('String, Array<String>');
        expect(find.returns[0].description).toEqual('The names of the found item(s).');
    });

    it('When a symbol has an @param tag with only a type and name, the doclet has a returns array property that includes that param.', function() {
        expect(typeof bind.returns).toEqual('object');
        expect(bind.returns.length).toEqual(1);
        expect(bind.returns[0].description).toEqual('The binding id.');
    });
});