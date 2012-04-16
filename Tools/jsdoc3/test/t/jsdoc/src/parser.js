(function() {

    var jsdoc = {src: { parser: require('jsdoc/src/parser')}};
    
    test('There is a jsdoc/src/parser module.', function() {
        assert.equal(typeof jsdoc.src.parser, 'object');
    });
    
    test('The jsdoc/src/parser module has a Parser constructor.', function() {
        assert.equal(typeof jsdoc.src.parser.Parser, 'function');
    });
    
    test('The module:jsdoc/src/parser.Parser class has a parse function.', function() {
        assert.equal(typeof jsdoc.src.parser.Parser.prototype.parse, 'function');
    });
    
    test('The jsdoc/src/parser module has a results function.', function() {
        assert.equal(typeof jsdoc.src.parser.Parser.prototype.results, 'function');
    });
    
    test('The module:jsdoc/src/parser.Parser#parse function fires jsdocCommentFound events when parsing source code containing a jsdoc comment.', function() {
        var sourceCode = 'javascript:/** @name bar */',
            jsdocCounter = 0,
            event = null,
            parser = new jsdoc.src.parser.Parser();
            
        parser
            .on('jsdocCommentFound', function(e) {
                jsdocCounter++;
                event = e;
            })
            .parse(sourceCode);
        
        assert.equal(jsdocCounter, 1);
        
        assert.equal(event.comment, '/** @name bar */', 'The full text of the comment is included in the event.');
     });
     
     test('The module:jsdoc/src/parser.Parser#parse function fires symbolFound events when parsing source code containing a named symbol.', function() {
        var sourceCode = 'javascript:var foo = 1;',
            symbolCounter = 0,
            parser = new jsdoc.src.parser.Parser();
            
        parser
            .on('symbolFound', function(e) {
                symbolCounter++;
            })
            .parse(sourceCode);
        
        assert.equal(symbolCounter, 1);
     });
})();