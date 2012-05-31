describe("virtual symbols", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/virtual.js'),
        found = [
            docSet.getByLongname('dimensions'),
            docSet.getByLongname('width')
        ];

    it('should document virtual symbols', function() {
        expect(found[0].length).toEqual(1);
    });

    it('should document an undocumented symbol found after a comment for a virtual symbol', function() {
        expect(found[1].length).toEqual(1);
    });
});