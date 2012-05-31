describe("jsdoc/src/parser", function() {
    var jsdoc = {src: { parser: require('jsdoc/src/parser')}};

    it("should exist", function() {
        expect(jsdoc.src.parser).toBeDefined();
        expect(typeof jsdoc.src.parser).toEqual("object");
    });

    it("should export a 'Parser' constructor", function() {
        expect(jsdoc.src.parser.Parser).toBeDefined();
        expect(typeof jsdoc.src.parser.Parser).toEqual("function");
    });

    describe("Parser", function() {
        it("should have a 'parse' function", function() {
            expect(jsdoc.src.parser.Parser.prototype.parse).toBeDefined();
            expect(typeof jsdoc.src.parser.Parser.prototype.parse).toEqual("function");
        });

        it("should have a 'results' function", function() {
            expect(jsdoc.src.parser.Parser.prototype.results).toBeDefined();
            expect(typeof jsdoc.src.parser.Parser.prototype.results).toEqual("function");
        });

        describe("parse", function() {
            var parser = new jsdoc.src.parser.Parser();

            it("should fire 'jsdocCommentFound' events when parsing source containing jsdoc comments", function() {
                var spy = jasmine.createSpy(),
                    sourceCode = 'javascript:/** @name bar */';
                parser.on('jsdocCommentFound', spy).parse(sourceCode);
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0].comment).toEqual("/** @name bar */");
            });

            it("should fire 'symbolFound' events when parsing source containing named symbols", function() {
                var spy = jasmine.createSpy(),
                    sourceCode = 'javascript:var foo = 1';
                parser.on('symbolFound', spy).parse(sourceCode);
                expect(spy).toHaveBeenCalled();
            });
        });
    });
});