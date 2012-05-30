describe("@typedef tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/typedeftag.js'),
        numberlike = docSet.getByLongname('calc.NumberLike')[0];

    it('When a symbol has an @typedef tag, the doclet has a kind property set to "typedef".', function() {
        expect(numberlike.kind).toEqual('typedef');
    });

    it('When a symbol has an @typedef tag with a type, the doclet has a type property set to that type.', function() {
        expect(typeof numberlike.type).toEqual('object');
        expect(typeof numberlike.type.names).toEqual('object');
        expect(numberlike.type.names.length).toEqual(2);
        expect(numberlike.type.names[0]).toEqual('string');
        expect(numberlike.type.names[1]).toEqual('number');
    });

    it('When a symbol has an @typedef tag with a name, the doclet has a name property set to that name.', function() {
        expect(numberlike.name).toEqual('NumberLike');
        expect(numberlike.longname).toEqual('calc.NumberLike');
    });
});