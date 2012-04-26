(function() {

    var jsdoc = {src: { parser: require('jsdoc/src/parser')}},
        testParser = new jsdoc.src.parser.Parser();
        
    require('jsdoc/src/handlers').attachTo(testParser);
    
    test('A jsdoc comment with a @name and no code is turned into a doclet object.', function() {
        var sourceCode = 'javascript:/** @name bar */',
            result = testParser.parse(sourceCode);
        
        assert.equal(result.length, 1);
        assert.equal(result[0].name, 'bar');
    });

})();