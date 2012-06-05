describe("starbangstar", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/starbangstar.js'),
        mod = docSet.getByLongname('module:myscript/core')[0],
        x = docSet.getByLongname('module:myscript/core.x')[0];

    it('should not treat a doclet starting with /*!* as a JSDoc comment.', function() {
        expect(mod.description).toEqual('Script that does something awesome');
    });

    it('should not treat a doclet starting with /*!** as a JSDoc comment.', function() {
        expect(x).toBeUndefined();
    });
});