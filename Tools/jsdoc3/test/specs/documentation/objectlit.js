describe("object literals", function() {
    describe("When a child of an objlit has no @name or @memberof tags", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/objectlit.js'),
            found = docSet.getByLongname('tools.serialiser.value');

        it("should have a doclet with the correct longname", function() {
            expect(found.length).toEqual(1);
        });

        it("should have a doclet with the correct name", function() {
            expect(found[0].name).toEqual('value');
        });

        it("should have the correct memberof", function() {
            expect(found[0].memberof).toEqual('tools.serialiser');
        });

        it("should have a static scope", function() {
            expect(found[0].scope).toEqual('static');
        });
    });

    describe("When a parent of an objlit has no documentation", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/objectlit2.js'),
            found = docSet.getByLongname('position.axis.x');

        it("should have a doclet with the correct longname", function() {
            expect(found.length).toEqual(1);
        });

        it("should have a doclet with the correct name", function() {
            expect(found[0].name).toEqual('x');
        });

        it("should have the correct memberof", function() {
            expect(found[0].memberof).toEqual('position.axis');
        });

        it("should have a static scope", function() {
            expect(found[0].scope).toEqual('static');
        });
    });
});