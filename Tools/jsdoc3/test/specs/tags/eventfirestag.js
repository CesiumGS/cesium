describe("@event and @fires tags", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/eventfirestag.js'),
        snowballMethod = docSet.getByLongname('Hurl#snowball')[0],
        snowballEvent  = docSet.getByLongname('Hurl#event:snowball')[0];

    // @event tag
    it('When a symbol has an @event tag, the doclet is of kind "event".', function() {
        expect(snowballEvent.kind).toEqual('event');
    });

    // @fires tag
    it('When a symbol has a @fires tag, the doclet has an array named "fires".', function() {
        expect(typeof snowballMethod.fires).toEqual('object');
    });

    it('When a symbol has a fires array, the members have the event namespace.', function() {
        expect(snowballMethod.fires[0]).toEqual('Hurl#event:snowball');
    });

    it('When a symbol has a fires array with a name that already has an event: namespace, it doesn\'t have a secong namespace applied.', function() {
        expect(snowballMethod.fires[1]).toEqual('Hurl#event:brick');
    });
});