var common = {util: require('common/util')};

test('There is a common/util module.', function() {
    assert.equal(typeof common.util, 'object', 'The common/util module should be an object.');
});

test('The common/util module exports a "mixin" function.', function() {
    assert.equal(typeof common.util.mixin, 'function', 'The module:common/util.mixin member should be a function.');
});

test('The module:common/util.mixin function takes a target object and returns it.', function() {
    var target = {a:1},
        returned;
    
    returned = common.util.mixin(target); // mixing nothing in
    
    assert.deepEqual(returned, target);
});

test('The module:common/util.mixin function can mix a source object into the target.', function() {
    var target = {a: 1, b: 2},
        source = {c: 3};
    
    common.util.mixin(target, source); // modify the target object
    
    assert.deepEqual( target, {a: 1, b: 2, c: 3} );
});

test('The module:common/util.mixin function overwrites properties in the target if they exist in the source.', function() {
    var target = {a: 1, b: 2},
        source = {b: 3, c: 4};
    
    common.util.mixin(target, source);
    
    assert.equal(target.a, 1, 'Existing properties in the target with unique keys are left alone.');
    assert.equal(target.b, source.b, 'Existing properties in the target with same-named keys are overwritten.');
    assert.equal(target.c, source.c, 'Properties in the source with unique keys are added to the target.');
});

test('The module:common/util.mixin function can mix several source objects into the target.', function() {
    var target = {},
        source1 = {a: 1, b: 2},
        source2 = {b: 7, c: 4},
        source3 = {b: 3, d: 5},
        returned;
    
    returned = common.util.mixin({}, source1, source2, source3); // use a dummy target and the return value to avoid modifying the real target (source1)
    
    assert.deepEqual( source1, {a: 1, b: 2}, 'The source objects themselves are not modified by being mixed in.');
    assert.deepEqual( returned, {a: 1, b: 3, c: 4, d: 5}, 'The returned object has all the properties of the sources.');
});
