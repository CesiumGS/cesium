exports.getDocSetFromFile = function(filename, parser) {
    var sourceCode = readFile(__dirname + '/' + filename),
        testParser = parser || new (require('jsdoc/src/parser')).Parser(),
        doclets;

    require('jsdoc/src/handlers').attachTo(testParser);

    doclets = testParser.parse('javascript:' + sourceCode);
    exports.indexAll(doclets);

    require('jsdoc/augment').addInherited(doclets);

    // test assume borrows have not yet been resolved
    // require('jsdoc/borrow').resolveBorrows(doclets);

    return {
        doclets: doclets,
        getByLongname: function(longname) {
            return doclets.filter(function(doclet) {
                return (doclet.longname || doclet.name) === longname;
            });
        }
    };
};

exports.indexAll = function(docs) {
    var index = {};
    docs.forEach(function(doc) {
        if (!index.hasOwnProperty(doc.longname)){index[doc.longname] = [];}
        index[doc.longname].push(doc);
    });
    docs.index = index;
};