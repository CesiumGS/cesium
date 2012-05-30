describe("@constructs tag", function() {

    it('When a symbol has an @constructs tag, it is documented as a class with that name.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag.js'),
        textblock = docSet.getByLongname('TextBlock')[0];

        expect(textblock.kind).toEqual('class');
        expect(textblock.longname).toEqual('TextBlock');
    });

    it('When a symbol has an @constructs tag, it is documented as a class.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag2.js'),
        menu = docSet.getByLongname('Menu')[0];

        expect(menu.name).toEqual('Menu');
        expect(menu.kind).toEqual('class');
    });

    it('When a function symbol has an @constructs tag, any this-variables are ducumented as instance members of the class.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag3.js'),
        personName = docSet.getByLongname('Person#name')[0];

        expect(personName.memberof).toEqual('Person');
        expect(personName.scope).toEqual('instance');
    });

    it('When a function symbol has an @constructs tag with no value, in a @lends block with a "Name#" value, the function is documented as a constructor of "Name".', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag4.js'),
        person = docSet.getByLongname('Person').filter(function($) {
            return ! $.undocumented;
        })[0];

        expect(person.kind).toEqual('class');
    });

    it('When a function symbol has an @constructs tag with no value, any this-variables are documented as instance members of the class.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag4.js'),
        personName = docSet.getByLongname('Person#name')[0];

        expect(personName.memberof).toEqual('Person');
        expect(personName.scope).toEqual('instance');
    });

    it('When a object literal property has an @constructs tag with no value, and the object has a @lends, the property is documented as the lent class.', function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/constructstag5.js'),
        duck = docSet.getByLongname('Duck').filter(function($) {
            return ! $.undocumented;
        })[0];

        expect(duck.longname).toEqual('Duck');
        expect(duck.kind).toEqual('class');
        expect(duck.description).toEqual('Constructs a duck.');
    });
});