describe("jsdoc/opts/parser", function() {
    var opts = require('jsdoc/opts/parser');

    it("should exist", function() {
        expect(opts).toBeDefined();
        expect(typeof opts).toEqual("object");
    });

    it("should export a 'parse' function", function() {
        expect(opts.parse).toBeDefined();
        expect(typeof opts.parse).toEqual("function");
    });

    it("should export a 'help' function", function() {
        expect(opts.help).toBeDefined();
        expect(typeof opts.help).toEqual("function");
    });

    it("should export a 'get' function", function() {
        expect(opts.get).toBeDefined();
        expect(typeof opts.get).toEqual("function");
    });

    describe("parse", function() {
        it("should accept a '-t' option and return an object with a 'template' property", function() {
            opts.parse(['-t', 'mytemplate']);
            var r = opts.get();

            expect(r.template).toEqual('mytemplate');
        });

        it("should accept a '--template' option and return an object with a 'template' property", function() {
            opts.parse(['--template', 'mytemplate']);
            var r = opts.get();

            expect(r.template).toEqual('mytemplate');
        });

        it("should accept a '-c' option and return an object with a 'configure' property", function() {
            opts.parse(['-c', 'myconf.json']);
            var r = opts.get();

            expect(r.configure).toEqual('myconf.json');
        });

        it("should accept a '--configure' option and return an object with a 'configure' property", function() {
            opts.parse(['--configure', 'myconf.json']);
            var r = opts.get();

            expect(r.configure).toEqual('myconf.json');
        });

        it("should accept a '-e' option and return an object with a 'encoding' property", function() {
            opts.parse(['-e', 'ascii']);
            var r = opts.get();

            expect(r.encoding).toEqual('ascii');
        });

        it("should accept a '--encoding' option and return an object with a 'encoding' property", function() {
            opts.parse(['--encoding', 'ascii']);
            var r = opts.get();

            expect(r.encoding).toEqual('ascii');
        });

        it("should accept a '-T' option and return an object with a 'test' property", function() {
            opts.parse(['-T']);
            var r = opts.get();

            expect(r.test).toEqual(true);
        });

        it("should accept a '--test' option and return an object with a 'test' property", function() {
            opts.parse(['--test']);
            var r = opts.get();

            expect(r.test).toEqual(true);
        });

        it("should accept a '-d' option and return an object with a 'destination' property", function() {
            opts.parse(['-d', 'mydestination']);
            var r = opts.get();

            expect(r.destination).toEqual('mydestination');
        });

        it("should accept a '--destination' option and return an object with a 'destination' property", function() {
            opts.parse(['--destination', 'mydestination']);
            var r = opts.get();

            expect(r.destination).toEqual('mydestination');
        });

        it("should accept a '-p' option and return an object with a 'private' property", function() {
            opts.parse(['-p']);
            var r = opts.get();

            expect(r['private']).toEqual(true);
        });

        it("should accept a '--private' option and return an object with a 'private' property", function() {
            opts.parse(['--private']);
            var r = opts.get();

            expect(r['private']).toEqual(true);
        });

        it("should accept a '-r' option and return an object with a 'recurse' property", function() {
            opts.parse(['-r']);
            var r = opts.get();

            expect(r.recurse).toEqual(true);
        });

        it("should accept a '--recurse' option and return an object with a 'recurse' property", function() {
            opts.parse(['--recurse']);
            var r = opts.get();

            expect(r.recurse).toEqual(true);
        });

        it("should accept a '-h' option and return an object with a 'help' property", function() {
            opts.parse(['-h']);
            var r = opts.get();

            expect(r.help).toEqual(true);
        });

        it("should accept a '--help' option and return an object with a 'help' property", function() {
            opts.parse(['--help']);
            var r = opts.get();

            expect(r.help).toEqual(true);
        });

        it("should accept a '-X' option and return an object with a 'explain' property", function() {
            opts.parse(['-X']);
            var r = opts.get();

            expect(r.explain).toEqual(true);
        });

        it("should accept a '--explain' option and return an object with a 'explain' property", function() {
            opts.parse(['--explain']);
            var r = opts.get();

            expect(r.explain).toEqual(true);
        });

        it("should accept a '-q' option and return an object with a 'query' property", function() {
            opts.parse(['-q', 'foo=bar&fab=baz']);
            var r = opts.get();

            expect(r.query).toEqual('foo=bar&fab=baz');
        });

        it("should accept a '--query' option and return an object with a 'query' property", function() {
            opts.parse(['--query', 'foo=bar&fab=baz']);
            var r = opts.get();

            expect(r.query).toEqual('foo=bar&fab=baz');
        });

        it("should accept a '-t' option and return an object with a 'tutorials' property", function() {
            opts.parse(['-d', 'mytutorials']);
            var r = opts.get();

            expect(r.destination).toEqual('mytutorials');
        });

        it("should accept a '--tutorials' option and return an object with a 'tutorials' property", function() {
            opts.parse(['--tutorials', 'mytutorials']);
            var r = opts.get();

            expect(r.tutorials).toEqual('mytutorials');
        });

        it("should accept a naked option (i.e. no '-') and return an object with a '_' pproperty", function() {
            opts.parse(['myfile1', 'myfile2']);
            var r = opts.get();

            expect(r._).toEqual(['myfile1', 'myfile2']);
        });

        it("should accept a '--verbose' option and return an object with a 'verbose' property", function() {
            opts.parse(['--verbose']);
            var r = opts.get();

            expect(r.verbose).toEqual(true);
        });

        it("should accept a '--coffee' option and return an object with a 'coffee' property", function() {
            opts.parse(['--coffee']);
            var r = opts.get();

            expect(r.coffee).toEqual(true);
        });

        it("should accept a '--match' option and return an object with a 'match' property", function() {
            opts.parse(['--match', '.*tag']);
            var r = opts.get();

            expect(r.match).toEqual('.*tag');
        });

        it("should accept a multiple '--match' options and return an object with a 'match' property", function() {
            opts.parse(['--match', '.*tag', '--match', 'parser']);
            var r = opts.get();

            expect(r.match).toEqual(['.*tag', 'parser']);
        });

        //TODO: tests for args that must have values
    });
});