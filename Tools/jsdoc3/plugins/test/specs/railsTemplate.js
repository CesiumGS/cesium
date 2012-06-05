describe("railsTemplate plugin", function() {
    var parser = new (require("jsdoc/src/parser")).Parser(),
        plugin = require('plugins/railsTemplate');


    installPlugins(['plugins/railsTemplate'], parser);
    require('jsdoc/src/handlers').attachTo(parser);

    it("should remove <% %> rails template tags from the source of *.erb files", function() {
        var path = require("path"),
            docSet = parser.parse([path.join(__dirname, "plugins/test/fixtures/railsTemplate.js.erb")]);

        expect(docSet[2].description).toEqual("Remove rails tags from the source input (e.g. )");
    });
});