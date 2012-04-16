(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/defaulttag.js'),
		request = (docSet.getByLongname('request') || [])[0],
        response = (docSet.getByLongname('response') || [])[0],
		rcode = (docSet.getByLongname('rcode') || [])[0],
		rvalid = (docSet.getByLongname('rvalid') || [])[0],
		rerrored = (docSet.getByLongname('rerrored') || [])[0],
		win = (docSet.getByLongname('win') || [])[0];
		header = (docSet.getByLongname('header') || [])[0];
    
    test('When symbol set to null has a @default tag with no text.', function() {
        assert.equal(request.defaultvalue, 'null', 'The doclet\'s defaultValue property should be: undefined.');
    });
    
    test('When symbol set to a string has a @default tag with no text.', function() {
        assert.equal(response.defaultvalue, '"ok"', 'The doclet\'s defaultValue property should be that quoted string.');
    });
    
    test('When symbol set to a number has a @default tag with no text.', function() {
        assert.equal(rcode.defaultvalue, '200', 'The doclet\'s defaultValue property should be that number.');
    });

	test('When symbol has a @default tag with text.', function() {
        assert.equal(win.defaultvalue, 'the parent window', 'The doclet\'s defaultValue property should be that text.');
    });
    
    test('When symbol has a @default tag with true.', function() {
        assert.equal(rvalid.defaultvalue, 'true');
    });
    
    test('When symbol has a @default tag with false.', function() {
        assert.equal(rerrored.defaultvalue, 'false');
    });
    
    test('When symbol has a @default tag with a function call.', function() {
        assert.equal(typeof header.defaultvalue, 'undefined');
    });
    
})();