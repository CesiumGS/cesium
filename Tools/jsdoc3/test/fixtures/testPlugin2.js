exports.handlers = {
    fileBegin: jasmine.createSpy('fileBegin'),
    beforeParse: jasmine.createSpy('beforeParse'),
    jsdocCommentFound: jasmine.createSpy('jsdocCommentFound'),
    symbolFound: jasmine.createSpy('symbolFound'),
    newDoclet: jasmine.createSpy('newDoclet'),
    fileComplete: jasmine.createSpy('fileComplete')
};

exports.nodeVisitor = {
    visitNode: jasmine.createSpy("plugin 2 visitNode")
};