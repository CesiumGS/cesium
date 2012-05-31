describe("@exports tag", function() {

    describe("object literals", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/exportstag.js'),
            shirt = docSet.getByLongname('module:my/shirt')[0],
            color = docSet.getByLongname('module:my/shirt.color')[0],
            tneck = docSet.getByLongname('module:my/shirt.Turtleneck')[0],
            size = docSet.getByLongname('module:my/shirt.Turtleneck#size')[0];

        it('When an objlit symbol has an @exports tag, the doclet is aliased to "module:" + the tag value.', function() {
            expect(typeof shirt).toEqual('object');
            expect(shirt.alias).toEqual('my/shirt');
        });

        it('When an objlit symbol has an @exports tag, the doclet\'s longname includes the "module:" namespace.', function() {
            expect(shirt.longname).toEqual('module:my/shirt');
        });

        it('When an objlit symbol has an @exports tag, the doclet kind is set to module.', function() {
            expect(shirt.kind).toEqual('module');
        });

        it('When an objlit symbol has an @exports tag, the objlit members are documented as members of the module.', function() {
            expect(typeof color).toEqual('object');
            expect(color.memberof).toEqual('module:my/shirt');

            expect(typeof tneck).toEqual('object');
            expect(typeof size).toEqual('object');
        });
    });

    describe("functions", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/exportstag2.js'),
            coat = docSet.getByLongname('module:my/coat')[0],
            wool = docSet.getByLongname('module:my/coat#wool')[0];

        it('When a function symbol has an @exports tag, the doclet is aliased to "module:" + the tag value.', function() {
            expect(typeof coat).toEqual('object');
            expect(coat.alias).toEqual('my/coat');
        });

        it('When a function symbol has an @exports tag, the doclet\'s longname includes the "module:" namespace.', function() {
            expect(coat.longname).toEqual('module:my/coat');
        });

        it('When a function symbol has an @exports tag, the doclet kind is set to module.', function() {
            expect(coat.kind).toEqual('module');
        });

        it('When a function symbol has an @exports tag, the this members are documented as instance members of the module.', function() {
            expect(typeof wool).toEqual('object');
            expect(wool.memberof).toEqual('module:my/coat');
        });
    });

    describe("functions and 'exports' object", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/exportstag3.js'),
            html = docSet.getByLongname('module:html/utils')[0],
            getstyle = docSet.getByLongname('module:html/utils.getStyleProperty')[0],
            inhead = docSet.getByLongname('module:html/utils.isInHead')[0];

        it('When a function symbol has an @exports tag and there is an objlit named "exports" the members are documented as members of the module.', function() {
            expect(typeof getstyle).toEqual('object');
            expect(getstyle.memberof).toEqual('module:html/utils');
        });

        it('When a function symbol has an @exports tag and there are members assinged to an "exports" name, the members are documented as members of the module.', function() {
            expect(typeof inhead).toEqual('object');
            expect(inhead.memberof).toEqual('module:html/utils');
        });
    });

    describe("inner classes", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/exportstag4.js'),
            module = docSet.getByLongname('module:some/module')[0],
            innerClass = docSet.getByLongname('module:some/module~myClass')[0],
            method = docSet.getByLongname('module:some/module~myClass#myMethod')[0];

        it('An inner class declared as a function in a module should be documented.', function() {
            expect(typeof innerClass).toEqual('object');
            //expect(getstyle.memberof, 'module:html/utils');
        });

        it('A method of an inner class declared as a function in a module should be documented.', function() {
            expect(typeof method).toEqual('object');
            //expect(inhead.memberof, 'module:html/utils');
        });
    });
});