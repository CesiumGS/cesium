describe("@enum tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/enumtag.js'),
        tristate = docSet.getByLongname('TriState')[0];

    it('When a symbol has a @enum tag, it has a properties array.', function() {
        expect(typeof tristate.properties).toEqual('object');
    });

    it('If no @type is given for the property it is inherted from the enum.', function() {
        expect(tristate.properties[0].type.names.join(', ')).toEqual('number');
    });

    it('If no no comment is given for the property it is still included in the enum.', function() {
        expect(tristate.properties[1].longname).toEqual('TriState.FALSE');
        expect(tristate.properties[1].undocumented).toBeUndefined();
    });

    it('A property of an enum gets its defaultvalue set.', function() {
        expect(tristate.properties[1].defaultvalue).toEqual('-1');
    });

    it('If a @type is given for the property it is reflected in the property value.', function() {
        expect(tristate.properties[2].type.names.join(', ')).toEqual('boolean');
    });
});