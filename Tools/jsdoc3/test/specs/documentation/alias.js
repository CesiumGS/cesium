describe("aliases", function() {
    describe("standard", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/alias.js'),
            found = docSet.getByLongname('myObject').filter(function($) {
                return ! $.undocumented;
            }),
            foundMember = docSet.getByLongname('myObject.myProperty');

        it('When a symbol is given an alias it is documented as if the name is the alias value.', function() {
            expect(found[0].longname).toEqual('myObject');
        });

        it('When a symbol is a member of an alias it is documented as if the memberof is the alias value.', function() {
            expect(foundMember[0].longname).toEqual('myObject.myProperty');
            expect(foundMember[0].memberof).toEqual('myObject');
        });
    });

    it('When a symbol is a member of an alias of a nested name it is documented as if the memberof is the nested alias value.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/alias2.js'),
        foundMember = docSet.getByLongname('ns.Myclass#myProperty');

        expect(foundMember[0].longname).toEqual('ns.Myclass#myProperty');
        expect(foundMember[0].name).toEqual('myProperty');
        expect(foundMember[0].memberof).toEqual('ns.Myclass');
        expect(foundMember[0].scope).toEqual('instance');
    });

    it('When a symbol is a member of an aliased class, a this-variables is documented as if it were a member that class.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/alias3.js'),
            tcm = docSet.getByLongname('trackr.CookieManager')[0],
            tcmValue = docSet.getByLongname('trackr.CookieManager#value')[0];

        expect(tcmValue.memberof).toEqual('trackr.CookieManager');
    });

    it('When a symbol is documented as a static member of <global> it\'s scope is "global" and not "static".', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/aliasglobal.js'),
            log = docSet.getByLongname('log')[0];

        expect(log.scope).toEqual('global');
    });

    describe("resolving", function() {
        it('When a local reference has alias, put all members into aliased definition. Local modifications should be visible to outside.', function() {
            var docSet = jasmine.getDocSetFromFile('test/fixtures/aliasresolve.js'),
                method = docSet.getByLongname('A.F.method');

            expect(method.length).toEqual(1);
        });

        it('When a reference in an outer scope has alias, put all members into aliased definition. Local modifications are visible to outside.', function() {
            var docSet = jasmine.getDocSetFromFile('test/fixtures/aliasresolve2.js'),
                method = docSet.getByLongname('A.F.method');

            expect(method.length).toEqual(1);
        });
    });
});