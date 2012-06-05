describe("@access tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/accesstag.js'),
        foo = docSet.getByLongname('Thingy~foo')[0],
        _bar = docSet.getByLongname('Thingy#_bar')[0],
        pez = docSet.getByLongname('Thingy#pez')[0],
        foo2 = docSet.getByLongname('OtherThingy~foo')[0],
        _bar2 = docSet.getByLongname('OtherThingy#_bar')[0],
        pez2 = docSet.getByLongname('OtherThingy#pez')[0];

    it("should set the doclet's 'access' property to 'private' when there is an @access private tag", function() {
        expect(foo.access).toEqual('private');
        expect(foo2.access).toEqual('private');
    });

    it("should set the doclet's 'access' property to 'protected' when there is an @access protected tag", function() {
        expect(_bar.access).toEqual('protected');
        expect(_bar2.access).toEqual('protected');
    });

    it("should set no 'access' property on the doclet when there is an @access public tag", function() {
        expect(pez.access).toBeUndefined();
        expect(pez2.access).toBeUndefined();
    });
});