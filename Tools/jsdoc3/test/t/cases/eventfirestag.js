(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/eventfirestag.js'),
        snowballMethod = docSet.getByLongname('Hurl#snowball')[0],
        snowballEvent  = docSet.getByLongname('Hurl#event:snowball')[0];
    
    //console.log(docSet);
    
    // @event tag
    test('When a symbol has an @event tag, the doclet is of kind "event".', function() {
        assert.equal(snowballEvent.kind, 'event');
    });
    
    // @fires tag
    test('When a symbol has a @fires tag, the doclet has an array named "fires".', function() {
        assert.equal(typeof snowballMethod.fires, 'object');
    });
    
    test('When a symbol has a fires array, the members have the event namespace.', function() {
        assert.equal(snowballMethod.fires[0], 'Hurl#event:snowball');
    });
    
    test('When a symbol has a fires array with a name that already has an event: namespace, it doesn\'t have a secong namespace applied.', function() {
        assert.equal(snowballMethod.fires[1], 'Hurl#event:brick');
    });
})();