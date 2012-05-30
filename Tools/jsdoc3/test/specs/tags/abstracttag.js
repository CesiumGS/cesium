describe("@abstract tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/abstracttag.js'),
        type = docSet.getByLongname('Thingy')[0],
        pez = docSet.getByLongname('Thingy#pez')[0];

    it("should have an undefined 'virtual' property with no '@abstract' tag", function() {
        expect(type.virtual).toBeUndefined();
    });

    it("should set the doclet's 'virtual' property to true when ' @abstract tag is present", function() {
        expect(pez.virtual).toEqual(true);
    });

    // same as...

    it("should set the doclet's 'virtual' property to true when ' @abstract tag is present", function() {
        pez = docSet.getByLongname('OtherThingy#pez')[0];
        expect(pez.virtual).toEqual(true);
    });
});