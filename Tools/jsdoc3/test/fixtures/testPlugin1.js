exports.handlers = {
    fileBegin: jasmine.createSpy('fileBegin'),
    beforeParse: jasmine.createSpy('beforeParse'),
    jsdocCommentFound: jasmine.createSpy('jsdocCommentFound'),
    symbolFound: jasmine.createSpy('symbolFound'),
    newDoclet: jasmine.createSpy('newDoclet'),
    fileComplete: jasmine.createSpy('fileComplete')
};

exports.defineTags = function(dictionary) {
    dictionary.defineTag("foo", {
        canHaveName: true,
        onTagged: function(doclet, tag) {
            doclet.foo = true;
        }
    });
};

exports.nodeVisitor = {
    visitNode: jasmine.createSpy("plugin 1 visitNode").andCallFake(function(node, e, parser, currentSourceName) {
        e.stopPropagation = true;
    })
};