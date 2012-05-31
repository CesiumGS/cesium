describe("@requires tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/requirestag.js'),
        foo = docSet.getByLongname('foo')[0],
        bar = docSet.getByLongname('bar')[0];

    it('When a symbol has an @requires tag, the doclet has a requires property that includes that value, with the "module:" namespace added.', function() {
        expect(typeof foo.requires).toEqual('object');
        expect(foo.requires[0]).toEqual('module:foo/helper');

        expect(typeof bar.requires).toEqual('object');
        expect(bar.requires[0]).toEqual('module:foo');
        expect(bar.requires[1]).toEqual('module:Pez#blat');
    });
});