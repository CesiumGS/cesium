describe("variations", function() {

    describe("by name", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/variations.js'),
            fadein1 = docSet.getByLongname('anim.fadein(1)')[0],
            fadein2 = docSet.getByLongname('anim.fadein(2)')[0];

        it('When a symbol has a name with a variation, the doclet has a variation property.', function() {
            expect(fadein1.variation).toEqual('1');
            expect(fadein2.variation).toEqual('2');
        });

        it('When a symbol has a name with a variation in the name, the doclet name has no variation in it.', function() {
            expect(fadein1.name).toEqual('fadein');
            expect(fadein2.name).toEqual('fadein');
        });

        it('When a symbol has a name with a variation in the name, the doclet longname has the variation in it.', function() {
            expect(fadein1.longname).toEqual('anim.fadein(1)');
            expect(fadein2.longname).toEqual('anim.fadein(2)');
        });
    });

    describe("by tag", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/variations3.js'),
            someObject = docSet.getByLongname('someObject')[0],
            someObject2 = docSet.getByLongname('someObject(2)')[0],
            someObject2method = docSet.getByLongname('someObject(2).someMethod')[0];

        it('When a symbol has a variation tag, the longname includes that variation.', function() {
            expect(someObject2.longname).toEqual('someObject(2)');
        });

        it('When a symbol is a member of a variation, the longname includes the variation.', function() {
            expect(someObject2method.longname).toEqual('someObject(2).someMethod');
        });
    });
});