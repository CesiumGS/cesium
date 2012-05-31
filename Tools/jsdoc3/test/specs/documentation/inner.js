describe("when a documented var memeber is inside a named function", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/inner.js'),
        found1 = docSet.getByLongname('sendMessage~encoding'),
        found2 = docSet.getByLongname('sendMessage~encrypt');

    it("A Doclet with the correct longname should be found", function() {
        expect(found1.length).toEqual(1);
        expect(found2.length).toEqual(1);
    });

    it("The short name should be correct", function() {
        expect(found1[0].name).toEqual('encoding');
        expect(found2[0].name).toEqual('encrypt');
    });

    it("The member of should be correct", function() {
        expect(found1[0].memberof).toEqual('sendMessage');
        expect(found2[0].memberof).toEqual('sendMessage');
    });
    it("The scope should default to 'inner'", function() {
        expect(found1[0].scope).toEqual('inner');
        expect(found2[0].scope).toEqual('inner');
    });
});