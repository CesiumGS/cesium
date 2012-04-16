(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exportstag4.js'),
        module = docSet.getByLongname('module:some/module')[0],
        innerClass = docSet.getByLongname('module:some/module~myClass')[0],
        method = docSet.getByLongname('module:some/module~myClass#myMethod')[0];
    
    test('An inner class declared as a function in a module should be documented.', function() {
        assert.equal(typeof innerClass, 'object');
        //assert.equal(getstyle.memberof, 'module:html/utils');
    });
    
    test('A method of an inner class declared as a function in a module should be documented.', function() {
        assert.equal(typeof method, 'object');
        //assert.equal(inhead.memberof, 'module:html/utils');
    });

})();