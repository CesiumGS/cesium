describe("@exception tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/exceptiontag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0],
        pez = docSet.getByLongname('pez')[0];

    it('When a symbol has an @exception tag, the doclet has a exception property set to that value.', function() {
        expect(typeof foo.exceptions).toEqual('object');
        expect(foo.exceptions.length).toEqual(1);

        expect(typeof bar.exceptions).toEqual('object');
        expect(bar.exceptions.length).toEqual(1);

        expect(typeof pez.exceptions).toEqual('object');
        expect(pez.exceptions.length).toEqual(1);
    });
});