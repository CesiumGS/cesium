describe("@readonly tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/readonlytag.js'),
        Collection = docSet.getByLongname('Collection')[0],
        length = docSet.getByLongname('Collection#length')[0];

    it('When a symbol has an @readonly tag, the doclet has an readonly property that is true.', function() {
        expect(length.readonly).toEqual(true);
    });
});