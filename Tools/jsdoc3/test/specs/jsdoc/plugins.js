describe("plugins", function() {
    installPlugins(['test/fixtures/testPlugin1', 'test/fixtures/testPlugin2']);

    var plugin1 = require('test/fixtures/testPlugin1'),
        plugin2 = require('test/fixtures/testPlugin2'),
        docSet;

    docSet = jasmine.getDocSetFromFile("test/fixtures/plugins.js", app.jsdoc.parser);

    it("should fire the plugin's event handlers", function() {
        expect(plugin1.handlers.fileBegin).toHaveBeenCalled();
        expect(plugin1.handlers.beforeParse).toHaveBeenCalled();
        expect(plugin1.handlers.jsdocCommentFound).toHaveBeenCalled();
        expect(plugin1.handlers.symbolFound).toHaveBeenCalled();
        expect(plugin1.handlers.newDoclet).toHaveBeenCalled();
        expect(plugin1.handlers.fileComplete).toHaveBeenCalled();

        expect(plugin2.handlers.fileBegin).toHaveBeenCalled();
        expect(plugin2.handlers.beforeParse).toHaveBeenCalled();
        expect(plugin2.handlers.jsdocCommentFound).toHaveBeenCalled();
        expect(plugin2.handlers.symbolFound).toHaveBeenCalled();
        expect(plugin2.handlers.newDoclet).toHaveBeenCalled();
        expect(plugin2.handlers.fileComplete).toHaveBeenCalled();
    });

    it("should add the plugin's tag definitions to the dictionary", function() {
        var test = docSet.getByLongname("test");

        expect(test[0].longname).toEqual("test");
        expect(test[0].foo).toEqual(true);
    });

    it("should call the plugin's visitNode function", function() {
        expect(plugin1.nodeVisitor.visitNode).toHaveBeenCalled();
    });

    it("should not call a second plugin's visitNode function if the first stopped propagation", function() {
        expect(plugin2.nodeVisitor.visitNode).not.toHaveBeenCalled();
    });
});