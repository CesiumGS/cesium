var common = {query: require('common/query')};

test('The common/query module is defined.', function() {
    assert.notEqual(typeof common.query, 'undefined', 'The common/query module should be defined.');
    assert.equal(typeof common.query, 'object', 'The common/query module should be an object.');
});

test('The common/query module exports a "toObject" function.', function() {
    assert.notEqual(typeof common.query.toObject, 'undefined', 'The common/query.toObject member should be defined.');
    assert.equal(typeof common.query.toObject, 'function', 'The common/query.toObject member should be a function.');
});

test('The common/query.toObject function dumps an object from a query string.', function() {
    assert.deepEqual(common.query.toObject('name=Michael+Mathews'), {name: 'Michael Mathews'});
    assert.deepEqual(common.query.toObject('name=Michael+Mathews&city=London'), {name: 'Michael Mathews', city: 'London'});
});
