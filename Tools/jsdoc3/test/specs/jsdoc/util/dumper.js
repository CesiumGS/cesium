describe("common/dumper", function() {
    var common = {dumper: require('jsdoc/util/dumper')};

    it("should exist", function() {
        expect(common.dumper).toBeDefined();
        expect(typeof common.dumper).toEqual("object");
    });

    it("should export a 'dump' function", function() {
        expect(common.dumper.dump).toBeDefined();
        expect(typeof common.dumper.dump).toEqual("function");
    });

    it("can dump string values", function() {
        expect(common.dumper.dump('hello')).toEqual('"hello"');
    });

    it("escapes double quotes in string values", function() {
        expect(common.dumper.dump('hello "world"')).toEqual('"hello \\"world\\""', 'Double quotes should be escaped.');
    });

    it("escapes newlines in string values", function() {
        expect(common.dumper.dump('hello\nworld')).toEqual('"hello\\nworld"', 'Newlines should be escaped.');
    });

    it("can dump number values", function() {
        expect(common.dumper.dump(1)).toEqual('1');
        expect(common.dumper.dump(0.1)).toEqual('0.1');
    });

    it("can dump boolean values", function() {
        expect(common.dumper.dump(true)).toEqual('true');
        expect(common.dumper.dump(false)).toEqual('false');
    });

    it("can dump null values", function() {
        expect(common.dumper.dump(null)).toEqual('null');
    });

    it("can dump undefined values", function() {
        expect(common.dumper.dump(undefined)).toEqual('undefined');
    });

    it("can dump regex values", function() {
        expect(common.dumper.dump(/^[Ff]oo$/gi)).toEqual('<RegExp /^[Ff]oo$/gi>');
    });

    it("can dump date values", function() {
        expect(common.dumper.dump(new Date('January 1, 1901 GMT'))).toEqual('<Date Tue, 01 Jan 1901 00:00:00 GMT>');
    });

    it("can dump function values", function() {
        expect(common.dumper.dump(function myFunc(){})).toEqual('<Function myFunc>');
        expect(common.dumper.dump(function(){})).toEqual('<Function>');
    });

    it("can dump array values", function() {
        var actual = common.dumper.dump(["hello", "world"]),
        expected = '[\n    "hello",\n    "world"\n]';

        expect(actual).toEqual(expected);
    });

    it("can dump simple object values", function() {
        var actual = common.dumper.dump({hello: "world"}),
        expected = '{\n    "hello": "world"\n}';

        expect(actual).toEqual(expected);
    });

    it("can dump constructed instance values, not displaying prototype members", function() {
        function Foo(name){ this.name = name; }
        Foo.prototype.sayHello = function(){};

        var actual = common.dumper.dump(new Foo('hello')),
        expected = '{\n    "name": "hello"\n}';

        expect(actual).toEqual(expected);
    });

    it("can dump complex mixed values", function() {
        function Foo(){}

        var actual = common.dumper.dump(
            [undefined, null, new Foo(), 1, true, 'hello\n"world', new Error('oops'), /foo/gi, new Date('December 26, 2010 GMT'), {f: function myFunc(){}, o: {a:1}}]
        ),
        expected = '[\n    undefined,\n    null,\n    {\n    },\n    1,\n    true,\n    "hello\\n\\"world",\n    {\n        "message": "oops"\n    },\n    <RegExp /foo/gi>,\n    <Date Sun, 26 Dec 2010 00:00:00 GMT>,\n    {\n        "f": <Function myFunc>,\n        "o": {\n            "a": 1\n        }\n    }\n]';

        expect(actual).toEqual(expected);
    });

    it("doesn't crash on circular references", function() {
        var a = {};
        a.b = a;

        var actual = common.dumper.dump(a),
        expected = '{\n    "b": <CircularRef>\n}';

        expect(actual).toEqual(expected);
    });
});