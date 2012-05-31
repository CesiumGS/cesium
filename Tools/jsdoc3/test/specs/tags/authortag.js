describe("@author tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/authortag.js'),
        Thingy = docSet.getByLongname('Thingy')[0];

    it('When a symbol has a @author tag, the doclet has a author property with that value.', function() {
        expect(Thingy.author[0]).toEqual('Michael Mathews <micmath@gmail.com>');
    });
});