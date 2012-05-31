describe("jsdoc/name", function() {
    var jsdoc = {name: require('jsdoc/name') };

    it("should exist", function() {
        expect(jsdoc.name).toBeDefined();
        expect(typeof jsdoc.name).toEqual("object");
    });

    it("should export an 'resolve' function", function() {
        expect(jsdoc.name.resolve).toBeDefined();
        expect(typeof jsdoc.name.resolve).toEqual("function");
    });

    it("should export an 'applyNamespace' function", function() {
        expect(jsdoc.name.applyNamespace).toBeDefined();
        expect(typeof jsdoc.name.applyNamespace).toEqual("function");
    });

    it("should export an 'shorten' function", function() {
        expect(jsdoc.name.shorten).toBeDefined();
        expect(typeof jsdoc.name.shorten).toEqual("function");
    });

    it("should export an 'splitName' function", function() {
        expect(jsdoc.name.splitName).toBeDefined();
        expect(typeof jsdoc.name.splitName).toEqual("function");
    });

    describe ("shorten", function() {
        it('should break up a longname into the correct memberof, name and scope parts', function() {
            var startName = 'lib.Panel#open',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('open');
            expect(parts.memberof).toEqual('lib.Panel');
            expect(parts.scope).toEqual('#');
        });

        it('should work on static names', function() {
            var startName = 'elements.selected.getVisible',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('getVisible');
            expect(parts.memberof).toEqual('elements.selected');
            expect(parts.scope).toEqual('.');
        });

        it('should work on protoyped names', function() {
            var startName = 'Validator.prototype.$element',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('$element');
            expect(parts.memberof).toEqual('Validator');
            expect(parts.scope).toEqual('#');
        });

        it('should work on inner names.', function() {
            var startName = 'Button~_onclick',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('_onclick');
            expect(parts.memberof).toEqual('Button');
            expect(parts.scope).toEqual('~');
        });

        it('should work on global names.', function() {
            var startName = 'close',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('close');
            //'The memberof should be an empty string for global symbols.'
            expect(parts.memberof).toEqual('');
            //'The scope should be an empty string for global symbols.'
            expect(parts.scope).toEqual('');
        });

        it('should work on bracketed stringy names', function() {
            var startName = 'channels["#ops"]#open',
                parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('open');
            //'Bracketed stringy names should appear as quoted strings.'
            expect(parts.memberof).toEqual('channels."#ops"');
            expect(parts.scope).toEqual('#');

            startName = 'channels["#bots"]["log.max"]',
            parts = jsdoc.name.shorten(startName);

            expect(parts.name).toEqual('"log.max"');
            expect(parts.memberof).toEqual('channels."#bots"');
            expect(parts.scope).toEqual('.');
        });

        it('should work on fully stringy names, like "foo.bar"', function() {
            var startName = '"foo.bar"',
                parts = jsdoc.name.shorten(startName);

            //'The name should be the full quoted string.'
            expect(parts.name).toEqual('"foo.bar"');
            //'The longname should be the full quoted string.'
            expect(parts.longname).toEqual('"foo.bar"');
            //'There should be no memberof, as it is global.'
            expect(parts.memberof).toEqual('');
            //'The scope should be as global.'
            expect(parts.scope).toEqual('');
        });

        it('should find the variation', function() {
            var startName = 'anim.fadein(2)',
                parts = jsdoc.name.shorten(startName);

            expect(parts.variation).toEqual('2');
            expect(parts.name).toEqual('fadein');
            expect(parts.longname).toEqual('anim.fadein(2)');
        });
    });

    describe("applyNamespace", function() {
        it('should insert the namespace only before the name part of the longname', function() {
            var startName = 'lib.Panel#open',
                endName = jsdoc.name.applyNamespace(startName, 'event');

            expect(endName, 'lib.Panel#event:open');
        });

        it(" should insert the namespace before a global name", function() {
            var startName = 'maths/bigint',
            endName = jsdoc.name.applyNamespace(startName, 'module');

            expect(endName, 'module:maths/bigint');
        });

        it('should treat quoted parts of the name as atomic and insert namespace before a quoted shortname', function() {
            var startName = 'foo."*dont\'t.look~in#here!"',
            endName = jsdoc.name.applyNamespace(startName, 'event');

            expect(endName, 'foo.event:"*dont\'t.look~in#here!"');
        });

        it('should not add another namespace if one already exists.', function() {
            var startName = 'lib.Panel#event:open',
                endName = jsdoc.name.applyNamespace(startName, 'event');

            expect(endName, 'lib.Panel#event:open');
        });
    });

    describe("splitName", function() {
        it('should find the name and description.', function() {
            var startName = 'ns.Page#"last \\"sentence\\"".words~sort(2)   - This is a description. ',
                parts = jsdoc.name.splitName(startName);

            expect(parts.name, 'ns.Page#"last \\"sentence\\"".words~sort(2)');
            expect(parts.description, 'This is a description.');
        });
    });
});