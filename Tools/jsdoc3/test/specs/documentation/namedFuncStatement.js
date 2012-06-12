describe("named function statements", function() {
    describe("standard", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/namedFuncStatement.js'),
            fooMember = docSet.getByLongname('Foo#member1')[0],
            fooVariable = docSet.getByLongname('Foo~var1')[0];

        it('A symbol that is a member of a named function statement should documented as a member of the assigned name', function() {
            expect(fooMember.longname).toEqual('Foo#member1');
        });

        it('A symbol that is a variable of a named function statement should documented as a member of the assigned name', function() {
            expect(fooVariable.longname).toEqual('Foo~var1');
        });
    });

    describe("global", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/namedFuncStatement2.js'),
            fooMember = docSet.getByLongname('Foo#member1')[0],
            fooVariable = docSet.getByLongname('Foo~var1')[0];

        it('A symbol that is a member of a named function statement should documented as a member of the assigned name', function() {
            expect(fooMember.longname).toEqual('Foo#member1');
        });

        it('A symbol that is a variable of a named function statement should documented as a member of the assigned name', function() {
            expect(fooVariable.longname).toEqual('Foo~var1');
        });
    });

    describe("as object literal property", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/namedFuncStatement3.js'),
            fooMember = docSet.getByLongname('ns.Foo#member1')[0],
            fooVariable = docSet.getByLongname('ns.Foo~var1')[0];

        it('A symbol that is a member of a named function statement should documented as a member of the assigned name', function() {
            expect(fooMember.longname).toEqual('ns.Foo#member1');
        });

        it('A symbol that is a variable of a named function statement should documented as a member of the assigned name', function() {
            expect(fooVariable.longname).toEqual('ns.Foo~var1');
        });
    });
});