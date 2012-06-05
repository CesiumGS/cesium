describe("@memberof tag", function() {

    it('When a symbol has an @member tag, the doclet has a long name that includes the parent.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/memberoftag.js'),
            Data = docSet.getByLongname('mathlib.Data')[0],
            point = docSet.getByLongname('mathlib.Data#point')[0];

        expect(typeof Data).toEqual('object');
        expect(typeof point).toEqual('object');

        expect(Data.memberof).toEqual('mathlib');
        expect(Data.name).toEqual('Data');
    });

    describe ("static", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/memberoftag2.js'),
            publish = docSet.getByLongname('Observable#publish')[0],
            cache = docSet.getByLongname('Observable.cache')[0];

        it('A symbol is documented as a static @memberof a class.', function() {
            //it should appear as a static member of that class
            expect(typeof cache).toEqual('object');
            expect(cache.memberof).toEqual('Observable');
            expect(cache.scope).toEqual('static');
            expect(cache.name).toEqual('cache');
            expect(cache.longname).toEqual('Observable.cache');
        });

        it('A symbol is documented as a static @memberof a class prototype.', function() {
            //it should appear as an instance member of that class
            expect(typeof publish).toEqual('object');
            expect(publish.memberof).toEqual('Observable');
            expect(publish.scope).toEqual('instance');
            expect(publish.name).toEqual('publish');
            expect(publish.longname).toEqual('Observable#publish');
        });
    });

    describe ("forced", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/memberoftagforced.js'),
            maproutes = docSet.getByLongname('map.routes')[0],
            datapointy = docSet.getByLongname('Data#point.y')[0];

        it('A nested symbol with a @memberof! tag set to <global>.', function() {
            expect(maproutes.name, 'map.routes', 'Has a shortname that includes the nested names.');
        });

        it('A nested symbol with a @memberof! tag set to another symbol.', function() {
            expect(datapointy.name, 'point.y', 'Has a shortname that includes the nested names.');
        });
    });

    it('A symbol that is a nested class with a @memberof tag.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/memberoftag3.js'),
            tree = docSet.getByLongname('module:terrain.Forest#Tree')[0];

        expect(tree.longname, 'module:terrain.Forest#Tree');
    });

    it('A symbol that is an instance member of a nested class with a @memberof tag.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/memberoftag3.js'),
            leaf = docSet.getByLongname('module:terrain.Forest#Tree#leaf')[0];

        expect(leaf.longname, 'module:terrain.Forest#Tree#leaf');
    });
});