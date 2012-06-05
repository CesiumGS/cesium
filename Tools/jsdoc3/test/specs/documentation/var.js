describe("var statements", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/var.js'),
        found = [
            docSet.getByLongname('GREEN'),
            docSet.getByLongname('RED'),
            docSet.getByLongname('validate'),
            docSet.getByLongname('i'),
            docSet.getByLongname('results')
        ];

    describe("when a series of constants are documented", function() {
        it("should find the first constant", function() {
            expect(found[0].length).toEqual(1);
        });

        it("attach the docs to the first constant", function() {
            expect(found[0][0].comment).toEqual('/** document me */');
        });

        it("should have a correct short name", function() {
            expect(found[0][0].name).toEqual('GREEN');
        });

        it("should have a correct memberof", function() {
            expect(found[0][0].memberof).toBeUndefined();
        });

        it("should give the constant a global scope", function() {
            expect(found[0][0].scope).toEqual('global');
        });

        it("should find the second constant", function() {
            expect(found[1].length).toEqual(1);
        });

        it("should not attach the docs to the second constant", function() {
            expect(found[1][0].undocumented).toEqual(true);
        });
    });

    describe('When a member of a series of vars are documented.', function() {
        it("should attach the docs to the correct var", function() {
            expect(found[4][0].comment).toEqual('/** document me */');
        });

        it("should hav a correct short name", function() {
            expect(found[4][0].name).toEqual('results');
        });

        it("should leave memberof undefined", function() {
            expect(found[4][0].memberof).toBeUndefined();
        });

        it("should give the var a global scope", function() {
            expect(found[4][0].scope).toEqual('global');
        });
    });
});