var opts = require('jsdoc/opts/parser');

test('The opts module is defined.', function() {
    assert.notEqual(typeof opts, 'undefined', 'The opts module should not be undefined.');
    assert.equal(typeof opts, 'object', 'The opts module should be an object.');
});

test('The opts module exports a "parse" function.', function() {
    assert.notEqual(typeof opts.parse, 'undefined', 'The opts.parse method should not be undefined.');
    assert.equal(typeof opts.parse, 'function', 'The opts.parse method should be a function.');
});

test('The opts module exports a "get" function.', function() {
    assert.notEqual(typeof opts.get, 'undefined', 'The opts.get method should not be undefined.');
    assert.equal(typeof opts.get, 'function', 'The opts.get method should be a function.');
});

test('The opts.parse function accepts a -t opt.', function() {
    opts.parse(['-t', 'mytemplate']);
    var r = opts.get();
    
    assert.equal(r.template, 'mytemplate', 'The opts.get method should return an object with a set template property.');
});

test('The opts.parse function accepts a -d opt.', function() {
    opts.parse(['-d', 'mydestination']);
    var r = opts.get();
    
    assert.equal(r.destination, 'mydestination', 'The opts.get method should return an object with a set destination property.');
});

test('The opts.parse function accepts a naked opt.', function() {
    opts.parse(['myfile1', 'myfile2']);
    var r = opts.get();
    
    assert.deepEqual(r._, ['myfile1', 'myfile2'], 'The opts.get method should return an object with a set _ property.');
});