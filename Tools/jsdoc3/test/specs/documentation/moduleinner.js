describe("inner scope for modules", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/moduleinner.js'),
        fooIn = docSet.getByLongname('module:my/module~fooIn')[0],
        fooOut = docSet.getByLongname('module:my/module~fooOut')[0];

    it('When a function appears in the topscope of a module, the symbol is documented as an inner member of that module.', function() {
        expect(typeof fooOut).toEqual('object');
        expect(fooOut.longname).toEqual('module:my/module~fooOut');

        expect(typeof fooIn).toEqual('object');
        expect(fooIn.longname).toEqual('module:my/module~fooIn');
    });
});