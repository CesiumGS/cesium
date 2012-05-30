describe("@global tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/globaltag.js');

    it('When an inner symbol has a @global tag it is documented as if it were global.', function() {
        var found = docSet.getByLongname('foo').filter(function($) {
            return ! $.undocumented;
        });
        expect(found[0].name).toEqual('foo');
        expect(found[0].longname).toEqual('foo');
        expect(found[0].memberof).toBeUndefined();
        expect(found[0].scope).toEqual('global');

    });

    it('When an nested symbol has a @global tag it is documented as if it were global.', function() {
        var found = docSet.getByLongname('Bar').filter(function($) {
            return ! $.undocumented;
        });
        expect(found[0].name).toEqual('Bar');
        expect(found[0].longname).toEqual('Bar');
        expect(found[0].memberof).toBeUndefined();
        expect(found[0].scope).toEqual('global');
    });
});