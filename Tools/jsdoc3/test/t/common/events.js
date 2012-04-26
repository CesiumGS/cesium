var common = {events: require('common/events')};

test('The common/events module is defined.', function() {
    assert.notEqual(typeof common.events, 'undefined', 'The common/events module should be defined.');
    assert.equal(typeof common.events, 'object', 'The common/events module should be an object.');
});

test('The common/events module exports a "on" function.', function() {
    assert.notEqual(typeof common.events.on, 'undefined', 'The common/events.on member should be defined.');
    assert.equal(typeof common.events.on, 'function', 'The common/events.on member should be a function.');
});

test('The common/events module exports a "fire" function.', function() {
    assert.notEqual(typeof common.events.fire, 'undefined', 'The common/events.fire member should be defined.');
    assert.equal(typeof common.events.fire, 'function', 'The common/events.fire member should be a function.');
});

test('The common/events module exports a "removeListener" function.', function() {
    assert.notEqual(typeof common.events.removeListener, 'undefined', 'The common/events.removeListener member should be defined.');
    assert.equal(typeof common.events.removeListener, 'function', 'The common/events.removeListener member should be a function.');
});

test('The common/events.on function attaches a handler to an object that can be fired.', function() {
    var target = {},
        result = false;
    
    target.on = common.events.on;
    target.fire = common.events.fire;
    
    target.on('test', function() { result = true; });
    target.fire('test');
    
    assert.equal(result, true);
});
