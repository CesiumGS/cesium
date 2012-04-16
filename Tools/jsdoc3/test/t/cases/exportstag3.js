(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/exportstag3.js'),
        html = docSet.getByLongname('module:html/utils')[0],
        getstyle = docSet.getByLongname('module:html/utils.getStyleProperty')[0],
        inhead = docSet.getByLongname('module:html/utils.isInHead')[0];
    
    test('When a function symbol has an @exports tag and there is an objlit named "exports" the members are documented as members of the module.', function() {
        assert.equal(typeof getstyle, 'object');
        assert.equal(getstyle.memberof, 'module:html/utils');
    });
    
    test('When a function symbol has an @exports tag and there are members assinged to an "exports" name, the members are documented as members of the module.', function() {
        assert.equal(typeof inhead, 'object');
        assert.equal(inhead.memberof, 'module:html/utils');
    });

})();