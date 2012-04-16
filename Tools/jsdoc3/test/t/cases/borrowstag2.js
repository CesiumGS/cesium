var borrow = require('jsdoc/borrow');

(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/borrowstag2.js');
        
    borrow.resolveBorrows(docSet.doclets);
    
    var str_rtrim = docSet.getByLongname('str.rtrim').filter(function($) {
            return ! $.undocumented;
        })[0];
    
    test('When a symbol has a @borrows tag, the borrowed symbol is added to the symbol.', function() {
        assert.equal(typeof str_rtrim, 'object');
    });
})();