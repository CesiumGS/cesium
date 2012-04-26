(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/moduletag2.js'),
        mixer = docSet.getByLongname('module:color/mixer').filter(function($) {
            return ! $.undocumented;
        })[0],
        blend = docSet.getByLongname('module:color/mixer.blend')[0],
        darken = docSet.getByLongname('module:color/mixer.darken')[0];
    
    test('When a @module tag defines a module module.', function() {
        assert.equal(typeof mixer, 'object');
        assert.equal(mixer.kind, 'module', 'A symbol of kind "module" is documented.');
    });
    
    test('When an object literal is lent to a module with a  @lends tag.', function() {
        assert.equal(typeof blend, 'object');
        assert.equal(blend.kind, 'function', 'A member of that object literal is documented as a member of the module.');
    });
    
    test('When a documented symbol is a member of a namespace "exports".', function() {
        assert.equal(typeof darken, 'object');
        assert.equal(darken.kind, 'function', 'It is documented as a member of the module.');
    });
})();