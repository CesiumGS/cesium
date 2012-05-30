describe("@copyright tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/copyrighttag.js'),
        Thingy = docSet.getByLongname('Thingy')[0];

    it('When a symbol has a @copyright tag, the doclet has a copyright property with that value.', function() {
        expect(Thingy.copyright).toEqual('(c) 2011 Michael Mathews');
    });
});