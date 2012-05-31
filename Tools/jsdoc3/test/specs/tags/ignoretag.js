describe("@ignore tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/ignoretag.js'),
        foo = docSet.getByLongname('foo')[0];

    it('When a symbol has an @ignore tag, the doclet has a ignore property set to true.', function() {
        expect(foo.ignore).toEqual(true);
    });

    it('When a symbol has an @ignore tag with a value an error is thrown', function() {
        try {
            docSet = jasmine.getDocSetFromFile('test/fixtures/ignoretag2.js');
            foo = docSet.getByLongname('foo')[0];
        } catch (e) {
            expect(e.name).toEqual('TagValueNotPermittedError');
        };
    });
});