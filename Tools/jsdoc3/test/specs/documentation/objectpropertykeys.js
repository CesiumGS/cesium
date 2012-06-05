describe("using existing Object properties as object literal keys", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/objectpropertykeys.js');
    it("should not crash", function() {
        expect(true).toBeTruthy();
    });
});