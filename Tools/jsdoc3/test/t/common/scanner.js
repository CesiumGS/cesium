var scanner = new (require('jsdoc/src/scanner').Scanner)(),
    includeMatch = new RegExp(".+\\.js(doc)?$"),
    excludeMatch = new RegExp("(^|\\/)_"),
    sourceFiles = scanner.scan([__dirname+'/test/cases/src/'], 3, includeMatch, excludeMatch);

sourceFiles = sourceFiles.map(function($) {
    return $.replace(__dirname, '');
});

//console.log(sourceFiles); process.exit();

test('The scanner should return the correct source files', function() {

    assert.equal(sourceFiles.length, 3);
    assert.equal(sourceFiles.indexOf("/test/cases/src/one.js") > -1, true);
    assert.equal(sourceFiles.indexOf("/test/cases/src/two.js") > -1, true);
    assert.equal(sourceFiles.indexOf("/test/cases/src/dir1/three.js") > -1, true);
    
});
