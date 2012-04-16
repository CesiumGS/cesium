(function() {
        var docSet = testhelpers.getDocSetFromFile('test/cases/inlinecomment.js'),
            t = docSet.getByLongname('test'),
            t2 = docSet.getByLongname('test2');
            
        test('When there is an inline comment on a line ending with no semicolon, that comment and the next comment are still captured', function() {
            assert.equal(t.length, 1, "Inline comment on line without semicolon is captured");
            assert.equal(t2.length, 1, "Inline comment on line after line without semicolon is captured");
        });
})();
