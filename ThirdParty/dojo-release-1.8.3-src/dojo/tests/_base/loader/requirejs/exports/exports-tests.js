require({
        baseUrl: require.has("host-browser") ? "./" : "./exports/"
    },
    ["require", "vanilla", "funcSet", "assign", "assign2", "usethis",
     "implicitModule", "simpleReturn", "doh"],
    function(require, vanilla, funcSet, assign, assign2, usethis,
      implicitModule, simpleReturn, doh){
        doh.register(
            "exports",
            [
                function exports(t){
                    t.is("vanilla", vanilla.name);
                    t.is("funcSet", funcSet);
                    t.is("assign", assign);
                    t.is("assign2", assign2);
                    //TODO: not implemented in dojo t.is("usethis", usethis.name);
                    t.is("implicitModule", implicitModule());
                    t.is("simpleReturn", simpleReturn());
                }
            ]
        );
        doh.run();
    }
);
