describe("@default tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/defaulttag.js'),
		request = (docSet.getByLongname('request') || [])[0],
        response = (docSet.getByLongname('response') || [])[0],
		rcode = (docSet.getByLongname('rcode') || [])[0],
		rvalid = (docSet.getByLongname('rvalid') || [])[0],
		rerrored = (docSet.getByLongname('rerrored') || [])[0],
		win = (docSet.getByLongname('win') || [])[0];
		header = (docSet.getByLongname('header') || [])[0];

    it('When symbol set to null has a @default tag with no text, the doclet\'s defaultValue property should be: null', function() {
        expect(request.defaultvalue).toEqual('null');
    });

    it('When symbol set to a string has a @default tag with no text, the doclet\'s defaultValue property should be that quoted string', function() {
        expect(response.defaultvalue).toEqual('"ok"');
    });

    it('When symbol set to a number has a @default tag with no text, the doclet\'s defaultValue property should be that number.', function() {
        expect(rcode.defaultvalue).toEqual('200');
    });

	it('When symbol has a @default tag with text, the doclet\'s defaultValue property should be that text.', function() {
        expect(win.defaultvalue).toEqual('the parent window');
    });

    it('When symbol has a @default tag with true.', function() {
        expect(rvalid.defaultvalue).toEqual('true');
    });

    it('When symbol has a @default tag with false.', function() {
        expect(rerrored.defaultvalue, 'false');
    });

    it('When symbol has a @default tag with a function call.', function() {
        expect(header.defaultvalue).toBeUndefined();
    });

});